
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { pool } = require('../database');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Backend controls the currency and locale for each supported country.
const COUNTRY_SETTINGS = {
  IN: { currency: 'INR', locale: 'en-IN' },
  US: { currency: 'USD', locale: 'en-US' },
  GB: { currency: 'GBP', locale: 'en-GB' },
  AE: { currency: 'AED', locale: 'en-AE' },
  CA: { currency: 'CAD', locale: 'en-CA' },
  AU: { currency: 'AUD', locale: 'en-AU' },
  DE: { currency: 'EUR', locale: 'de-DE' },
  FR: { currency: 'EUR', locale: 'fr-FR' },
  JP: { currency: 'JPY', locale: 'ja-JP' },
  SG: { currency: 'SGD', locale: 'en-SG' },
  SA: { currency: 'SAR', locale: 'en-SA' },
  ZA: { currency: 'ZAR', locale: 'en-ZA' },
  NZ: { currency: 'NZD', locale: 'en-NZ' },
  CH: { currency: 'CHF', locale: 'de-CH' },
  BR: { currency: 'BRL', locale: 'pt-BR' },
  MX: { currency: 'MXN', locale: 'es-MX' }
};

const createToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

const formatUser = (row) => ({
  id: row.id,
  _id: row.id,
  name: row.name,
  email: row.email,
  country: row.country || 'US',
  currency: row.currency || 'USD',
  locale: row.locale || 'en-US'
});

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const country = String(req.body.country || 'IN').toUpperCase();

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Please provide name, email and password'
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        message: 'Password must contain at least 6 characters'
      });
    }

    const countrySettings = COUNTRY_SETTINGS[country];

    if (!countrySettings) {
      return res.status(400).json({
        message: 'Selected country is not supported'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: 'User already exists with this email'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = randomUUID();

    const result = await pool.query(
      `INSERT INTO users
        (id, name, email, password, country, currency, locale)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, country, currency, locale`,
      [
        userId,
        String(name).trim(),
        normalizedEmail,
        hashedPassword,
        country,
        countrySettings.currency,
        countrySettings.locale
      ]
    );

    const user = formatUser(result.rows[0]);
    const token = createToken(user.id);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user
    });
  } catch (error) {
    console.error('Register error:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        message: 'Email already registered'
      });
    }

    return res.status(500).json({
      message: 'Registration failed'
    });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Please provide email and password'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const result = await pool.query(
      `SELECT id, name, email, password, country, currency, locale
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const dbUser = result.rows[0];
    const passwordMatch = await bcrypt.compare(
      password,
      dbUser.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const user = formatUser(dbUser);
    const token = createToken(user.id);

    return res.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      message: 'Login failed'
    });
  }
});

// GET CURRENT USER PROFILE
router.get('/me', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, country, currency, locale
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    return res.json({
      user: formatUser(result.rows[0])
    });
  } catch (error) {
    console.error('Get profile error:', error);

    return res.status(500).json({
      message: 'Failed to fetch profile'
    });
  }
});

// UPDATE COUNTRY AND CURRENCY SETTINGS
router.put('/settings', protect, async (req, res) => {
  try {
    const country = String(req.body.country || '').toUpperCase();

    if (!country || !COUNTRY_SETTINGS[country]) {
      return res.status(400).json({
        message: 'Please select a supported country'
      });
    }

    const settings = COUNTRY_SETTINGS[country];

    const result = await pool.query(
      `UPDATE users
       SET country = $1,
           currency = $2,
           locale = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, name, email, country, currency, locale`,
      [
        country,
        settings.currency,
        settings.locale,
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    return res.json({
      message: 'Settings updated successfully',
      user: formatUser(result.rows[0])
    });
  } catch (error) {
    console.error('Update settings error:', error);

    return res.status(500).json({
      message: 'Failed to update settings'
    });
  }
});

module.exports = router;
