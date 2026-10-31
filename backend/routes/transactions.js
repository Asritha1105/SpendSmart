
const express = require('express');
const { randomUUID } = require('crypto');
const { pool } = require('../database');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Validate date correctly (YYYY-MM-DD)
function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return false;
  }

  const parsedDate = new Date(`${date}T00:00:00Z`);

  return (
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === String(date)
  );
}

// Format transaction response
function formatTransaction(row) {
  return {
    _id: row.id,
    user: row.user_id,
    type: row.type,
    amount: Number(row.amount),
    category: row.category,
    description: row.description || '',
    date: row.date,
    notes: row.notes || '',
    currency: row.currency || 'USD',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const transactionFields = `
  id, user_id, type, amount, category,
  description, date, notes, currency,
  created_at, updated_at
`;

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const {
      type,
      category,
      month,
      year,
      page = 1,
      limit = 20
    } = req.query;

    const currentPage = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (currentPage - 1) * pageLimit;

    const conditions = ['user_id = $1'];
    const values = [req.user.id];

    if (type) {
      if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({
          message: 'Invalid transaction type'
        });
      }

      values.push(type);
      conditions.push(`type = $${values.length}`);
    }

    if (category) {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }

    if (month || year) {
      const selectedMonth = Number(month);
      const selectedYear = Number(year);

      if (
        !Number.isInteger(selectedMonth) ||
        selectedMonth < 1 ||
        selectedMonth > 12 ||
        !Number.isInteger(selectedYear) ||
        selectedYear < 2000 ||
        selectedYear > 2100
      ) {
        return res.status(400).json({
          message: 'Invalid month or year'
        });
      }

      const startDate =
        `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;

      values.push(startDate);
      conditions.push(`date >= $${values.length}::date`);

      values.push(startDate);
      conditions.push(
        `date < ($${values.length}::date + INTERVAL '1 month')`
      );
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM transactions
       WHERE ${whereClause}`,
      values
    );

    const total = Number(countResult.rows[0].total);

    const dataValues = [...values, pageLimit, offset];

    const result = await pool.query(
      `SELECT ${transactionFields}
       FROM transactions
       WHERE ${whereClause}
       ORDER BY date DESC, created_at DESC
       LIMIT $${dataValues.length - 1}
       OFFSET $${dataValues.length}`,
      dataValues
    );

    return res.json({
      transactions: result.rows.map(formatTransaction),
      total,
      count: total,
      page: currentPage,
      limit: pageLimit,
      totalPages: Math.ceil(total / pageLimit)
    });

  } catch (error) {
    console.error('Get transactions error:', error);

    return res.status(500).json({
      message: 'Failed to fetch transactions'
    });
  }
});

// POST /api/transactions
router.post('/', async (req, res) => {
  try {
    const {
      type,
      amount,
      category,
      description,
      date,
      notes
    } = req.body;

    const numericAmount = Number(amount);

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        message: 'Transaction type must be income or expense'
      });
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: 'Please provide a valid amount'
      });
    }

    if (!category || !String(category).trim()) {
      return res.status(400).json({
        message: 'Category is required'
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        message: 'Please provide a valid date in YYYY-MM-DD format'
      });
    }

    // Get user's currently selected currency
    const userResult = await pool.query(
      'SELECT currency FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const currency = userResult.rows[0].currency || 'USD';
    const id = randomUUID();

    const result = await pool.query(
      `INSERT INTO transactions
        (id, user_id, type, amount, category, description,
         date, notes, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${transactionFields}`,
      [
        id,
        req.user.id,
        type,
        numericAmount,
        String(category).trim(),
        description ? String(description).trim() : '',
        date,
        notes ? String(notes).trim() : '',
        currency
      ]
    );

    return res.status(201).json({
      message: 'Transaction added successfully',
      transaction: formatTransaction(result.rows[0])
    });

  } catch (error) {
    console.error('Create transaction error:', error);

    return res.status(500).json({
      message: 'Failed to create transaction'
    });
  }
});

// PUT /api/transactions/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      type,
      amount,
      category,
      description,
      date,
      notes
    } = req.body;

    const numericAmount = Number(amount);

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        message: 'Invalid transaction type'
      });
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: 'Please provide a valid amount'
      });
    }

    if (!category || !String(category).trim()) {
      return res.status(400).json({
        message: 'Category is required'
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        message: 'Please provide a valid date in YYYY-MM-DD format'
      });
    }

    const result = await pool.query(
      `UPDATE transactions
       SET type = $1,
           amount = $2,
           category = $3,
           description = $4,
           date = $5,
           notes = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND user_id = $8
       RETURNING ${transactionFields}`,
      [
        type,
        numericAmount,
        String(category).trim(),
        description ? String(description).trim() : '',
        date,
        notes ? String(notes).trim() : '',
        req.params.id,
        req.user.id
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: 'Transaction not found'
      });
    }

    return res.json({
      message: 'Transaction updated successfully',
      transaction: formatTransaction(result.rows[0])
    });

  } catch (error) {
    console.error('Update transaction error:', error);

    return res.status(500).json({
      message: 'Failed to update transaction'
    });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM transactions
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: 'Transaction not found'
      });
    }

    return res.json({
      message: 'Transaction deleted successfully'
    });

  } catch (error) {
    console.error('Delete transaction error:', error);

    return res.status(500).json({
      message: 'Failed to delete transaction'
    });
  }
});

// GET /api/transactions/categories/list
router.get('/categories/list', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT category
       FROM transactions
       WHERE user_id = $1
       ORDER BY category`,
      [req.user.id]
    );

    return res.json({
      categories: result.rows.map(row => row.category)
    });

  } catch (error) {
    console.error('Get categories error:', error);

    return res.status(500).json({
      message: 'Failed to fetch categories'
    });
  }
});

module.exports = router;
