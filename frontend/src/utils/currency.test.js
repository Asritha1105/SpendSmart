import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrency, getCurrencyMeta } from './currency.js';

test('formatCurrency uses the selected currency and locale', () => {
  assert.equal(formatCurrency(1234.5, 'INR', 'en-IN'), '₹1,234.50');
  assert.equal(formatCurrency(1234.5, 'USD', 'en-US'), '$1,234.50');
});

test('getCurrencyMeta returns the correct locale and symbol for the selected country', () => {
  assert.deepEqual(getCurrencyMeta('US'), { currency: 'USD', locale: 'en-US', symbol: '$' });
  assert.deepEqual(getCurrencyMeta('IN'), { currency: 'INR', locale: 'en-IN', symbol: '₹' });
});
