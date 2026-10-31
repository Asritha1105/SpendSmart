
const express = require('express');
const { body, validationResult } = require('express-validator');
const { randomUUID } = require('crypto');
const { pool } = require('../database');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Get user's selected currency
async function getUserCurrency(userId) {
  const result = await pool.query(
    'SELECT currency FROM users WHERE id = $1',
    [userId]
  );

  if (!result.rows.length) {
    throw new Error('User not found');
  }

  return result.rows[0].currency || 'INR';
}

// GET MONTHLY BUDGETS
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();

    const currency = await getUserCurrency(req.user.id);

    const result = await pool.query(
      `SELECT b.*,
        COALESCE((
          SELECT SUM(t.amount)
          FROM transactions t
          WHERE t.user_id = b.user_id
            AND t.category = b.category
            AND t.type = 'expense'
            AND t.currency = b.currency
            AND EXTRACT(MONTH FROM t.date) = b.month
            AND EXTRACT(YEAR FROM t.date) = b.year
        ), 0) AS spent
       FROM budgets b
       WHERE b.user_id = $1
         AND b.month = $2
         AND b.year = $3
         AND b.currency = $4
       ORDER BY b.category`,
      [req.user.id, month, year, currency]
    );

    const budgets = result.rows.map((row) => {
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
        currency: row.currency
      };
    });

    return res.json({
      currency,
      budgets
    });
  } catch (error) {
    console.error('Get budgets error:', error);

    return res.status(500).json({
      message: 'Failed to fetch budgets'
    });
  }
});

// CREATE OR UPDATE BUDGET
router.post(
  '/',
  [
    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required'),

    body('amount')
      .isFloat({ gt: 0 })
      .withMessage('Amount must be greater than zero'),

    body('month')
      .optional()
      .isInt({ min: 1, max: 12 }),

    body('year')
      .optional()
      .isInt({ min: 2000, max: 9999 }),

    body('notes')
      .optional()
      .isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    try {
      const now = new Date();

      const category = req.body.category.trim();
      const amount = Number(req.body.amount);
      const month = Number(req.body.month) || now.getMonth() + 1;
      const year = Number(req.body.year) || now.getFullYear();
      const notes = req.body.notes || '';

      // Save budget in the user's current currency
      const currency = await getUserCurrency(req.user.id);

      const id = randomUUID();

      const result = await pool.query(
        `INSERT INTO budgets
          (id, user_id, category, amount, month, year, notes, currency)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id, category, month, year, currency)
         DO UPDATE SET
           amount = EXCLUDED.amount,
           notes = EXCLUDED.notes,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          id,
          req.user.id,
          category,
          amount,
          month,
          year,
          notes,
          currency
        ]
      );

      const budget = result.rows[0];

      return res.status(200).json({
        message: 'Budget saved successfully',
        budget: {
          ...budget,
          _id: budget.id,
          user: budget.user_id,
          amount: Number(budget.amount),
          currency: budget.currency
        }
      });
    } catch (error) {
      console.error('Save budget error:', error);

      return res.status(500).json({
        message: 'Failed to save budget'
      });
    }
  }
);

// DELETE BUDGET
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM budgets
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Budget not found'
      });
    }

    return res.json({
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    console.error('Delete budget error:', error);

    return res.status(500).json({
      message: 'Failed to delete budget'
    });
  }
});

module.exports = router;
