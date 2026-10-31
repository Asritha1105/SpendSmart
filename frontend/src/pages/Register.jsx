
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  Eye,
  EyeOff,
  UserPlus,
  Globe
} from 'lucide-react';
import toast from 'react-hot-toast';

const COUNTRIES = [
  { name: 'India', code: 'IN', currency: 'INR', locale: 'en-IN', symbol: '₹' },
  { name: 'United States', code: 'US', currency: 'USD', locale: 'en-US', symbol: '$' },
  { name: 'United Kingdom', code: 'GB', currency: 'GBP', locale: 'en-GB', symbol: '£' },
  { name: 'United Arab Emirates', code: 'AE', currency: 'AED', locale: 'en-AE', symbol: 'د.إ' },
  { name: 'Canada', code: 'CA', currency: 'CAD', locale: 'en-CA', symbol: 'CA$' },
  { name: 'Australia', code: 'AU', currency: 'AUD', locale: 'en-AU', symbol: 'A$' },
  { name: 'Germany', code: 'DE', currency: 'EUR', locale: 'de-DE', symbol: '€' },
  { name: 'France', code: 'FR', currency: 'EUR', locale: 'fr-FR', symbol: '€' },
  { name: 'Japan', code: 'JP', currency: 'JPY', locale: 'ja-JP', symbol: '¥' },
  { name: 'Singapore', code: 'SG', currency: 'SGD', locale: 'en-SG', symbol: 'S$' },
  { name: 'Saudi Arabia', code: 'SA', currency: 'SAR', locale: 'en-SA', symbol: 'ر.س' },
  { name: 'South Africa', code: 'ZA', currency: 'ZAR', locale: 'en-ZA', symbol: 'R' },
  { name: 'New Zealand', code: 'NZ', currency: 'NZD', locale: 'en-NZ', symbol: 'NZ$' },
  { name: 'Switzerland', code: 'CH', currency: 'CHF', locale: 'de-CH', symbol: 'CHF' },
  { name: 'Brazil', code: 'BR', currency: 'BRL', locale: 'pt-BR', symbol: 'R$' },
  { name: 'Mexico', code: 'MX', currency: 'MXN', locale: 'es-MX', symbol: 'MX$' }
];

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countryCode, setCountryCode] = useState('IN');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const selectedCountry = COUNTRIES.find(
    country => country.code === countryCode
  ) || COUNTRIES[0];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(
        name.trim(),
        email.trim(),
        password,
        {
          country: selectedCountry.code,
          currency: selectedCountry.currency,
          locale: selectedCountry.locale
        }
      );

      toast.success('Account created! Welcome to SpendSmart AI!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    if (!password) return null;

    if (password.length < 6) {
      return { label: 'Too short', color: 'bg-red-400', width: '20%' };
    }

    if (password.length < 8) {
      return { label: 'Weak', color: 'bg-orange-400', width: '40%' };
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return { label: 'Fair', color: 'bg-yellow-400', width: '60%' };
    }

    return { label: 'Strong', color: 'bg-emerald-600', width: '100%' };
  };

  const strength = passwordStrength();

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500';

  const labelClass =
    'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 transition-colors duration-300 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-xs">
            <TrendingUp size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
            SpendSmart AI
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Start tracking your finances for free
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="register-name" className={labelClass}>
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                className={inputClass}
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label htmlFor="register-email" className={labelClass}>
                Email address
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
                autoComplete="email"
                required
              />
            </div>

            {/* Country and currency */}
            <div>
              <label htmlFor="register-country" className={labelClass}>
                <Globe size={14} className="inline mr-1" />
                Select your country
              </label>

              <select
                id="register-country"
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                className={inputClass}
              >
                {COUNTRIES.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>

              <div className="mt-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your selected currency
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {selectedCountry.symbol} {selectedCountry.currency}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="register-password" className={labelClass}>
                Password
              </label>

              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className={`${inputClass} pr-11`}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              {strength && (
                <div className="mt-2">
                  <div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full transition-all ${strength.color}`}
                      style={{ width: strength.width }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {strength.label} password
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="register-confirm-password" className={labelClass}>
                Confirm Password
              </label>

              <input
                id="register-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                className={`${inputClass} ${confirmPassword && confirmPassword !== password
                    ? '!border-red-300 !bg-red-50 dark:!border-red-700 dark:!bg-red-950/30'
                    : ''
                  }`}
                required
              />

              {confirmPassword && confirmPassword !== password && (
                <p className="mt-1 text-xs text-red-500">
                  Passwords don't match
                </p>
              )}
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <UserPlus size={16} />
              )}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
