
const express = require('express');
const { pool } = require('../database');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

// Generate monthly report
async function generateMonthlyReport(userId, month, year) {
  const summaryResult = await pool.query(
    `SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses,
            COUNT(*) AS transaction_count
         FROM transactions
         WHERE user_id = $1
           AND EXTRACT(MONTH FROM date) = $2
           AND EXTRACT(YEAR FROM date) = $3`,
    [userId, month, year]
  );

  const summary = summaryResult.rows[0];
  const totalIncome = Number(summary.income);
  const totalExpenses = Number(summary.expenses);
  const balance = totalIncome - totalExpenses;

  const dailyResult = await pool.query(
    `SELECT
            TO_CHAR(date, 'YYYY-MM-DD') AS date,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
         FROM transactions
         WHERE user_id = $1
           AND EXTRACT(MONTH FROM date) = $2
           AND EXTRACT(YEAR FROM date) = $3
         GROUP BY TO_CHAR(date, 'YYYY-MM-DD')
         ORDER BY date`,
    [userId, month, year]
  );

  const categoryResult = await pool.query(
    `SELECT category, SUM(amount) AS total
         FROM transactions
         WHERE user_id = $1
           AND type = 'expense'
           AND EXTRACT(MONTH FROM date) = $2
           AND EXTRACT(YEAR FROM date) = $3
         GROUP BY category
         ORDER BY SUM(amount) DESC`,
    [userId, month, year]
  );

  const transactionsResult = await pool.query(
    `SELECT id, type, amount, category, description, date, notes
         FROM transactions
         WHERE user_id = $1
           AND EXTRACT(MONTH FROM date) = $2
           AND EXTRACT(YEAR FROM date) = $3
         ORDER BY date DESC, created_at DESC`,
    [userId, month, year]
  );

  return {
    month,
    year,
    totalIncome,
    totalExpenses,
    balance,
    savingsRate: totalIncome > 0
      ? Math.round((balance / totalIncome) * 100)
      : 0,
    transactionCount: Number(summary.transaction_count),

    dailyData: dailyResult.rows.map((row) => ({
      date: row.date,
      income: Number(row.income),
      expenses: Number(row.expenses)
    })),

    expensesByCategory: categoryResult.rows.map((row) => ({
      name: row.category,
      category: row.category,
      value: Number(row.total),
      total: Number(row.total),
      amount: Number(row.total)
    })),

    transactions: transactionsResult.rows.map((row) => ({
      ...row,
      _id: row.id,
      amount: Number(row.amount)
    }))
  };
}

// GET /api/reports
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();

    if (!Number.isInteger(month) || month < 1 || month > 12 ||
      !Number.isInteger(year) || year < 2000) {
      return res.status(400).json({
        message: 'Invalid month or year'
      });
    }

    const report = await generateMonthlyReport(
      req.user.id, month, year
    );

    return res.json(report);
  } catch (error) {
    console.error('Reports error:', error.message);
    return res.status(500).json({
      message: 'Failed to generate report'
    });
  }
});

// GET /api/reports/monthly?month=10&year=2026
router.get('/monthly', async (req, res) => {
  try {
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();

    if (!Number.isInteger(month) || month < 1 || month > 12 ||
      !Number.isInteger(year) || year < 2000) {
      return res.status(400).json({
        message: 'Invalid month or year'
      });
    }

    const report = await generateMonthlyReport(
      req.user.id, month, year
    );

    return res.json(report);
  } catch (error) {
    console.error('Monthly report error:', error.message);
    return res.status(500).json({
      message: 'Failed to load monthly report'
    });
  }
});

// GET /api/reports/yearly?year=2026
router.get('/yearly', async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    if (!Number.isInteger(year) || year < 2000) {
      return res.status(400).json({
        message: 'Invalid year'
      });
    }

    const result = await pool.query(
      `SELECT
                EXTRACT(MONTH FROM date)::INTEGER AS month,
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses,
                COUNT(*) AS transaction_count
             FROM transactions
             WHERE user_id = $1
               AND EXTRACT(YEAR FROM date) = $2
             GROUP BY EXTRACT(MONTH FROM date)
             ORDER BY month`,
      [req.user.id, year]
    );

    const savedMonths = new Map();

    result.rows.forEach((row) => {
      savedMonths.set(Number(row.month), {
        month: Number(row.month),
        monthName: MONTH_NAMES[Number(row.month) - 1],
        income: Number(row.income),
        expenses: Number(row.expenses),
        balance: Number(row.income) - Number(row.expenses),
        transactionCount: Number(row.transaction_count)
      });
    });

    // Include all 12 months, even if no transactions exist.
    const monthlyBreakdown = MONTH_NAMES.map((monthName, index) => {
      return savedMonths.get(index + 1) || {
        month: index + 1,
        monthName,
        income: 0,
        expenses: 0,
        balance: 0,
        transactionCount: 0
      };
    });

    const yearlyIncome = monthlyBreakdown.reduce(
      (sum, item) => sum + item.income, 0
    );

    const yearlyExpenses = monthlyBreakdown.reduce(
      (sum, item) => sum + item.expenses, 0
    );

    const yearlyBalance = yearlyIncome - yearlyExpenses;

    return res.json({
      year,
      yearlyIncome,
      yearlyExpenses,
      yearlyBalance,
      yearlySavingsRate: yearlyIncome > 0
        ? Math.round((yearlyBalance / yearlyIncome) * 100)
        : 0,
      monthlyBreakdown
    });
  } catch (error) {
    console.error('Yearly report error:', error.message);
    return res.status(500).json({
      message: 'Failed to load yearly report'
    });
  }
});

module.exports = router;
