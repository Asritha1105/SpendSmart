
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  Eye,
  EyeOff,
  LogIn,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500';

  const labelClass =
    'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200';

  return (
    <div className="flex min-h-screen transition-colors duration-300">
      {/* Left panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[#064E3B] via-[#047857] to-[#059669] p-12 text-white lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs">
            <TrendingUp size={22} className="text-white" />
          </div>

          <span className="text-xl font-bold tracking-tight">
            SpendSmart AI
          </span>
        </div>

        {/* Features */}
        <div className="space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Take control of your finances with AI
          </h2>

          <p className="text-lg leading-relaxed text-emerald-100">
            Track every rupee, set smart budgets, and get personalized
            financial insights powered by AI.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: 'Smart Tracking',
                desc: 'Income & expense in one place',
              },
              {
                label: 'AI Insights',
                desc: 'Personalized recommendations',
              },
              {
                label: 'Budget Alerts',
                desc: 'Stay within your limits',
              },
              {
                label: 'Visual Reports',
                desc: 'Charts & monthly summaries',
              },
            ].map((feature) => (
              <div
                key={feature.label}
                className="rounded-xl border border-white/10 bg-white/10 p-3 transition hover:bg-white/15"
              >
                <p className="text-sm font-semibold">
                  {feature.label}
                </p>

                <p className="mt-0.5 text-xs text-emerald-100">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-emerald-200/80">
          © 2026 SpendSmart AI. All rights reserved.
        </p>
      </div>

      {/* Right panel - Login form */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6 transition-colors duration-300 dark:bg-slate-950">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-xs">
              <TrendingUp size={18} className="text-white" />
            </div>

            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
              SpendSmart AI
            </span>
          </div>

          {/* Login card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Welcome back
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className={labelClass}
                >
                  Email address
                </label>

                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="login-password"
                  className={labelClass}
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`${inputClass} pr-11`}
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-900"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <LogIn size={16} />
                )}

                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Register link */}
            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Don't have an account?{' '}

              <Link
                to="/register"
                className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Create one free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
