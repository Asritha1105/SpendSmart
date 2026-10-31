const express = require('express');
const Groq = require('groq-sdk');
const { pool } = require('../database');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

const ai = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const MODEL = 'openai/gpt-oss-20b';

function getMonthRange(month, year) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function money(value) {
  return Number(value) || 0;
}

function getSelectedPeriod(req) {
  const now = new Date();

  const month = Number(req.query.month || now.getMonth() + 1);
  const year = Number(req.query.year || now.getFullYear());

  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100
  ) {
    const error = new Error('Invalid month or year');
    error.status = 400;
    throw error;
  }

  return { month, year };
}

// Get the authenticated user's financial information.
async function getFinancialData(userId, month, year) {
  const { start, end } = getMonthRange(month, year);

  const transactionResult = await pool.query(
    `SELECT type, amount, category, description, date
     FROM transactions
     WHERE user_id = $1
       AND date >= $2
       AND date < $3
     ORDER BY date DESC`,
    [userId, start, end]
  );

  const transactions = transactionResult.rows;

  let income = 0;
  let expenses = 0;

  const categoryTotals = {};

  for (const transaction of transactions) {
    const amount = money(transaction.amount);

    if (transaction.type === 'income') {
      income += amount;
    } else if (transaction.type === 'expense') {
      expenses += amount;

      const category = transaction.category || 'Other';

      categoryTotals[category] =
        (categoryTotals[category] || 0) + amount;
    }
  }

  const budgetResult = await pool.query(
    `SELECT
       b.id,
       b.category,
       b.amount AS budget,
       COALESCE(SUM(t.amount), 0) AS spent
     FROM budgets b
     LEFT JOIN transactions t
       ON t.user_id = b.user_id
       AND t.category = b.category
       AND t.type = 'expense'
       AND t.date >= $2
       AND t.date < $3
     WHERE b.user_id = $1
       AND b.month = $4
       AND b.year = $5
     GROUP BY b.id, b.category, b.amount
     ORDER BY b.category`,
    [userId, start, end, month, year]
  );

  const budgets = budgetResult.rows.map((row) => {
    const budget = money(row.budget);
    const spent = money(row.spent);

    return {
      category: row.category,
      budget,
      spent,
      remaining: budget - spent,
      percentage: budget > 0
        ? Math.round((spent / budget) * 100)
        : 0,
      exceeded: spent > budget,
    };
  });

  const categories = Object.entries(categoryTotals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    month,
    year,
    currency: 'USD',
    income,
    expenses,
    savings: income - expenses,

    savingsRate: income > 0
      ? Number((((income - expenses) / income) * 100).toFixed(1))
      : 0,

    transactionCount: transactions.length,
    categories,
    budgets,

    recentTransactions: transactions.slice(0, 10).map((t) => ({
      type: t.type,
      amount: money(t.amount),
      category: t.category || 'Other',
      description: t.description || '',
      date: t.date,
    })),
  };
}

// Shared function to call Groq.
async function generateAIResponse(prompt) {
  if (!ai) {
    const error = new Error(
      'Groq API key is missing. Add GROQ_API_KEY to backend .env.'
    );

    error.status = 503;
    throw error;
  }

  const completion = await ai.chat.completions.create({
    model: MODEL,

    messages: [
      {
        role: 'system',
        content:
          'You are SpendSmart, a helpful personal finance assistant. ' +
          'Use only the financial data supplied by the application. ' +
          'Never invent transactions, amounts, or financial facts.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],

    temperature: 0.3,
    max_tokens: 1500,
  });

  return completion.choices?.[0]?.message?.content?.trim() || '';
}

// Safely parse a JSON array returned by AI.
function parseInsights(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');

  if (start === -1 || end === -1 || end < start) {
    throw new Error('AI did not return a valid JSON array.');
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1));

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid insights format.');
  }

  return parsed
    .filter((item) => item && item.title && item.message)
    .map((item) => ({
      type: [
        'positive',
        'warning',
        'danger',
        'info',
        'tip',
      ].includes(item.type)
        ? item.type
        : 'info',

      title: String(item.title),
      message: String(item.message),
    }));
}

function isValidVoiceDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function parseVoiceJSON(text) {
  const cleaned = String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    throw new Error('AI returned invalid transaction data');
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}

// POST /api/ai/voice/parse
// Converts Telugu or English voice transcripts into transaction details.
// Does NOT save the transaction.
router.post('/voice/parse', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        message: 'Groq API key is missing. Add GROQ_API_KEY to backend .env.'
      });
    }

    const transcript = String(req.body?.transcript || '').trim();

    if (!transcript) {
      return res.status(400).json({
        message: 'Please provide a voice transcript.'
      });
    }

    if (transcript.length > 1000) {
      return res.status(400).json({
        message: 'Voice transcript must be under 1000 characters.'
      });
    }

    // Get the user's currently selected currency.
    const userResult = await pool.query(
      `SELECT currency, locale
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({
        message: 'User not found.'
      });
    }

    const currency = userResult.rows[0].currency || 'USD';
    const today = new Date().toISOString().slice(0, 10);

    const prompt = `
You are a transaction extraction assistant for SpendSmart.

Extract one financial transaction from the user's voice transcript.

The transcript may be in English, Telugu, or a mixture of both.
Understand Telugu number words and common spoken financial expressions.

Today's date: ${today}
User's currency: ${currency}

Transcript:
${transcript}

Rules:
1. Determine whether it is income or expense.
2. Extract the numeric amount.
3. Select the most suitable category.
4. Extract a short description.
5. Extract the transaction date if mentioned.
6. If no date is mentioned, use today's date: ${today}.
7. Never invent an amount.
8. If the amount or transaction type is unclear, return null for that field.
9. Do not convert the amount into another currency.
10. Return JSON only.

Allowed categories:
Income:
Salary, Freelance, Investment, Business, Gift, Other Income

Expenses:
Food & Dining, Housing, Transportation, Healthcare,
Entertainment, Shopping, Education, Utilities, Travel,
Personal Care, Insurance, Other

Return exactly this JSON structure:
{
  "type": "income or expense or null",
  "amount": 0,
  "category": "category or null",
  "description": "short description",
  "date": "YYYY-MM-DD",
  "notes": "",
  "currency": "${currency}"
}
`;

    const completion = await ai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Extract transaction information accurately. ' +
            'Never invent amounts or financial details. ' +
            'Return only valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: {
        type: 'json_object'
      }
    });

    const aiText =
      completion.choices?.[0]?.message?.content?.trim();

    if (!aiText) {
      return res.status(502).json({
        message: 'AI could not understand the voice input. Please try again.'
      });
    }

    const extracted = parseVoiceJSON(aiText);

    const type = ['income', 'expense'].includes(extracted.type)
      ? extracted.type
      : null;

    const amount = Number(extracted.amount);

    const validAmount =
      extracted.amount !== null &&
      extracted.amount !== undefined &&
      Number.isFinite(amount) &&
      amount > 0;

    const allowedCategories = [
      'Salary',
      'Freelance',
      'Investment',
      'Business',
      'Gift',
      'Other Income',
      'Food & Dining',
      'Housing',
      'Transportation',
      'Healthcare',
      'Entertainment',
      'Shopping',
      'Education',
      'Utilities',
      'Travel',
      'Personal Care',
      'Insurance',
      'Other'
    ];

    const category = allowedCategories.includes(extracted.category)
      ? extracted.category
      : 'Other';

    const date = isValidVoiceDate(extracted.date)
      ? extracted.date
      : today;

    if (!type || !validAmount) {
      return res.status(422).json({
        message: 'Could not identify the transaction amount or type. Please try again.',
        extracted: {
          type,
          amount: validAmount ? amount : null,
          category,
          description: String(extracted.description || ''),
          date,
          notes: ''
        }
      });
    }

    return res.json({
      message: 'Voice transaction extracted successfully.',
      transaction: {
        type,
        amount,
        category,
        description: String(extracted.description || '').slice(0, 200),
        date,
        notes: String(extracted.notes || '').slice(0, 500),
        currency
      }
    });

  } catch (error) {
    console.error('Voice transaction parsing error:', error);

    return res.status(500).json({
      message: 'Failed to process voice input. Please try again.'
    });
  }
});

// Generate insights using actual transaction data.
async function buildInsights(userId, month, year) {
  const data = await getFinancialData(userId, month, year);

  if (data.transactionCount === 0) {
    return {
      source: 'rules',
      message: 'No transactions found for the selected month.',
      summary: data,
      budgets: data.budgets,

      insights: [
        {
          type: 'info',
          title: 'Start Tracking Your Spending',
          message:
            'Add your income and expenses to receive personalized recommendations.',
        },
      ],
    };
  }

  const prompt = `
Analyze the financial data below for ${month}/${year}.

Financial data:
${JSON.stringify(data, null, 2)}

Requirements:
1. Identify the largest spending categories.
2. Suggest realistic ways to reduce unnecessary expenses.
3. Recommend suitable budgets based on the actual numbers.
4. Identify budget overruns.
5. Suggest achievable savings actions.
6. Never invent financial facts.
7. Do not recommend risky investments.
8. If income is zero, do not assume the user has income to save.
9. Give 3 to 6 practical insights.
10. Keep the language friendly and simple.

Return ONLY a valid JSON array. Do not use Markdown fences.

Each item must contain:
{
  "type": "positive, warning, danger, info, or tip",
  "title": "Short heading",
  "message": "Specific recommendation"
}
`;

  const text = await generateAIResponse(prompt);

  if (!text) {
    throw new Error('Groq returned an empty response.');
  }

  const insights = parseInsights(text);

  return {
    source: 'groq',
    message: 'Personalized recommendations generated successfully.',
    summary: data,
    budgets: data.budgets,
    insights,
  };
}

// POST /api/ai/generate
router.post('/generate', async (req, res) => {
  try {
    const { month, year } = getSelectedPeriod(req);

    const result = await buildInsights(
      req.user.id,
      month,
      year
    );

    return res.json(result);
  } catch (error) {
    console.error('Groq generate error:', error.message);

    return res.status(error.status || 500).json({
      message: error.status === 400
        ? error.message
        : error.status === 503
          ? error.message
          : 'Failed to generate AI insights. Check the backend terminal.',
    });
  }
});

// GET /api/ai/insights
router.get('/insights', async (req, res) => {
  try {
    const { month, year } = getSelectedPeriod(req);

    const result = await buildInsights(
      req.user.id,
      month,
      year
    );

    return res.json(result);
  } catch (error) {
    console.error('Groq insights error:', error.message);

    return res.status(error.status || 500).json({
      message: error.status === 400
        ? error.message
        : error.status === 503
          ? error.message
          : 'Failed to generate AI insights. Check the backend terminal.',
    });
  }
});

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        message:
          'Groq API key is missing. Add GROQ_API_KEY to backend .env.',
      });
    }

    const question = String(req.body?.message || '').trim();

    if (!question) {
      return res.status(400).json({
        message: 'Please enter a question.',
      });
    }

    if (question.length > 1500) {
      return res.status(400).json({
        message: 'Please keep your question under 1500 characters.',
      });
    }

    const now = new Date();

    const month = Number(
      req.body?.month || now.getMonth() + 1
    );

    const year = Number(
      req.body?.year || now.getFullYear()
    );

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      return res.status(400).json({
        message: 'Invalid month or year.',
      });
    }

    const data = await getFinancialData(
      req.user.id,
      month,
      year
    );

    const prompt = `
You are SpendSmart's personal finance chatbot.

Answer the user's question using the financial data provided below.

Selected period: ${month}/${year}

Financial data:
${JSON.stringify(data, null, 2)}

User's question:
${question}

Rules:
- Be friendly, clear, and practical.
- Use actual financial figures when relevant.
- Never invent transactions, amounts, or budgets.
- If information is missing, clearly explain that.
- Never claim to have changed a budget or performed an action.
- Do not request passwords, API keys, or banking credentials.
- Do not guarantee financial outcomes.
- Keep your answer concise and easy to understand.
`;

    const answer = await generateAIResponse(prompt);

    if (!answer) {
      return res.status(502).json({
        message: 'Groq returned an empty answer. Please try again.',
      });
    }

    return res.json({
      source: 'groq',
      answer,
    });
  } catch (error) {
    console.error('Groq chatbot error:', error.message);

    return res.status(error.status || 500).json({
      message: error.status === 503
        ? error.message
        : 'The AI chatbot could not answer right now. Check the backend terminal.',
    });
  }
});

// GET /api/ai/advice
// Rule-based advice; does not require an AI API key.
router.get('/advice', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         type,
         COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE user_id = $1
       GROUP BY type`,
      [req.user.id]
    );

    let income = 0;
    let expenses = 0;

    for (const row of result.rows) {
      if (row.type === 'income') {
        income = money(row.total);
      }

      if (row.type === 'expense') {
        expenses = money(row.total);
      }
    }

    const savings = income - expenses;
    const advice = [];

    if (income === 0 && expenses === 0) {
      advice.push(
        'Start recording your income and expenses to understand your financial habits.'
      );
    } else {
      if (income > 0 && savings > 0) {
        advice.push(
          'You are spending less than you earn. Consider building an emergency fund.'
        );
      }

      if (income > 0 && expenses > income) {
        advice.push(
          'Your expenses exceed your income. Review non-essential spending and create a realistic budget.'
        );
      }

      if (income > 0 && savings > 0 && savings / income < 0.2) {
        advice.push(
          'Try gradually increasing your savings rate toward 20% of your income.'
        );
      }

      if (expenses > 0) {
        advice.push(
          'Review your spending categories regularly to identify opportunities to save.'
        );
      }
    }

    return res.json({
      income,
      expenses,
      savings,
      advice,
    });
  } catch (error) {
    console.error('Financial advice error:', error.message);

    return res.status(500).json({
      message: 'Failed to generate financial advice.',
    });
  }
});

module.exports = router;