export const COUNTRY_SETTINGS = {
  IN: { currency: 'INR', locale: 'en-IN', symbol: '₹' },
  US: { currency: 'USD', locale: 'en-US', symbol: '$' },
  GB: { currency: 'GBP', locale: 'en-GB', symbol: '£' },
  AE: { currency: 'AED', locale: 'en-AE', symbol: 'د.إ' },
  CA: { currency: 'CAD', locale: 'en-CA', symbol: 'CA$' },
  AU: { currency: 'AUD', locale: 'en-AU', symbol: 'A$' },
  DE: { currency: 'EUR', locale: 'de-DE', symbol: '€' },
  FR: { currency: 'EUR', locale: 'fr-FR', symbol: '€' },
  JP: { currency: 'JPY', locale: 'ja-JP', symbol: '¥' },
  SG: { currency: 'SGD', locale: 'en-SG', symbol: 'S$' },
  SA: { currency: 'SAR', locale: 'en-SA', symbol: 'ر.س' },
  ZA: { currency: 'ZAR', locale: 'en-ZA', symbol: 'R' },
  NZ: { currency: 'NZD', locale: 'en-NZ', symbol: 'NZ$' },
  CH: { currency: 'CHF', locale: 'de-CH', symbol: 'CHF' },
  BR: { currency: 'BRL', locale: 'pt-BR', symbol: 'R$' },
  MX: { currency: 'MXN', locale: 'es-MX', symbol: 'MX$' },
};

export function getCurrencyMeta(countryCode) {
  const code = String(countryCode || 'IN').toUpperCase();
  const meta = COUNTRY_SETTINGS[code] || COUNTRY_SETTINGS.IN;

  return {
    currency: meta.currency,
    locale: meta.locale,
    symbol: meta.symbol,
  };
}

export function formatCurrency(value, currency = 'INR', locale = 'en-IN') {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return `${currency} 0.00`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
