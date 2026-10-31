
const express = require('express');
const { pool } = require('../database');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();

    // Get user's selected currency
    const userResult = await pool.query(
      `SELECT currency FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const currency = userResult.rows[0].currency || 'INR';

    // Summary - selected currency only
    const summaryResult = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses,
        COUNT(*) AS transaction_count
       FROM transactions
       WHERE user_id = $1
         AND currency = $4
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3`,
      [req.user.id, month, year, currency]
    );

    const summary = summaryResult.rows[0];
    const income = Number(summary.income);
    const expenses = Number(summary.expenses);
    const savings = income - expenses;

    // Expenses by category - selected currency only
    const categoryResult = await pool.query(
      `SELECT category, SUM(amount) AS total
       FROM transactions
       WHERE user_id = $1
         AND type = 'expense'
         AND currency = $4
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3
       GROUP BY category
       ORDER BY total DESC`,
      [req.user.id, month, year, currency]
    );

    // Last 6 months - selected currency only
    const monthlyResult = await pool.query(
      `SELECT
        TO_CHAR(month_start, 'Mon YYYY') AS month,
        EXTRACT(MONTH FROM month_start)::INTEGER AS month_number,
        EXTRACT(YEAR FROM month_start)::INTEGER AS year,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expenses
       FROM generate_series(
         DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
         DATE_TRUNC('month', CURRENT_DATE),
         INTERVAL '1 month'
       ) AS month_start
       LEFT JOIN transactions t
         ON t.user_id = $1
        AND t.currency = $2
        AND t.date >= month_start
        AND t.date < month_start + INTERVAL '1 month'
       GROUP BY month_start
       ORDER BY month_start`,
      [req.user.id, currency]
    );

    // Recent transactions - preserve original currency
    const recentResult = await pool.query(
      `SELECT *
       FROM transactions
       WHERE user_id = $1
       ORDER BY date DESC, created_at DESC
       LIMIT 5`,
      [req.user.id]
    );

    // Budgets - match each budget's currency
    const budgetResult = await pool.query(
      `SELECT b.*,
        COALESCE((
          SELECT SUM(t.amount)
          FROM transactions t
          WHERE t.user_id = b.user_id
            AND t.category = b.category
            AND t.type = 'expense'
            AND t.currency = COALESCE(b.currency, $4)
            AND EXTRACT(MONTH FROM t.date) = b.month
            AND EXTRACT(YEAR FROM t.date) = b.year
        ), 0) AS spent
       FROM budgets b
       WHERE b.user_id = $1
         AND b.month = $2
         AND b.year = $3
         AND COALESCE(b.currency, $4) = $4
       ORDER BY b.category`,
      [req.user.id, month, year, currency]
    );

    const budgets = budgetResult.rows.map((row) => {
      const amount = Number(row.amount);
      const spent = Number(row.spent);

      return {
        ...row,
        _id: row.id,
        user: row.user_id,
        amount,
        spent,
        remaining: amount - spent,
        percentage: amount > 0
          ? Math.round((spent / amount) * 100)
          : 0,
        exceeded: spent > amount,
        currency: row.currency || currency
      };
    });

    const recentTransactions = recentResult.rows.map((row) => ({
      ...row,
      _id: row.id,
      user: row.user_id,
      amount: Number(row.amount),
      currency: row.currency || currency
    }));

    const expensesByCategory = categoryResult.rows.map((row) => ({
      category: row.category,
      total: Number(row.total),
      amount: Number(row.total)
    }));

    const monthlyData = monthlyResult.rows.map((row) => ({
      ...row,
      income: Number(row.income),
      expenses: Number(row.expenses),
      savings: Number(row.income) - Number(row.expenses)
    }));

    return res.json({
      currency,

      summary: {
        income,
        expenses,
        savings,
        balance: savings,
        savingsRate: income > 0
          ? Math.round((savings / income) * 100)
          : 0,
        transactionCount: Number(summary.transaction_count)
      },

      expensesByCategory,
      monthlyData,
      recentTransactions,
      budgets
    });

  } catch (error) {
    console.error('Dashboard error:', error);

    return res.status(500).json({
      message: 'Failed to load dashboard'
    });
  }
});

module.exports = router;
