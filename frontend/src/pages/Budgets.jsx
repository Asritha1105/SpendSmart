
import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currency';
import {
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  X,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

const EXPENSE_CATEGORIES = [
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
  'Other',
];

// Convert database values safely to numbers.
const getAmount = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

// Support both PostgreSQL id and MongoDB _id.
const getBudgetId = (budget) => budget.id ?? budget._id;

// Calculate percentage safely if the backend does not provide it.
const getPercentage = (budget) => {
  if (budget.percentage !== undefined && budget.percentage !== null) {
    return getAmount(budget.percentage);
  }

  const amount = getAmount(budget.amount);

  if (amount <= 0) return 0;

  return (getAmount(budget.spent) / amount) * 100;
};

const isBudgetExceeded = (budget) => {
  if (budget.exceeded !== undefined && budget.exceeded !== null) {
    return budget.exceeded === true || budget.exceeded === 1;
  }

  return getAmount(budget.spent) > getAmount(budget.amount);
};

function BudgetModal({ onClose, onSave, month, year, currency }) {
  const [form, setForm] = useState({
    category: '',
    amount: '',
    month,
    year,
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.category || getAmount(form.amount) <= 0) {
      toast.error('Please select a category and enter a valid amount.');
      return;
    }

    setSaving(true);

    try {
      await api.post('/budgets', {
        ...form,
        amount: getAmount(form.amount),
        month: Number(month),
        year: Number(year),
      });

      toast.success('Budget saved successfully!');
      onClose();
      await onSave();
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to save budget.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Set Monthly Budget
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Category
            </label>

            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              required
            >
              <option value="">Select a category</option>

              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Monthly Budget ({currency})
            </label>

            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) =>
                setForm({ ...form, amount: e.target.value })
              }
              placeholder="e.g. 500.00"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              required
            />
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            This budget applies to{' '}
            {new Date(year, month - 1).toLocaleString('en-US', {
              month: 'long',
            })}{' '}
            {year}.
          </p>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-xs disabled:opacity-60"
            >
              {saving && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}

              {saving ? 'Saving...' : 'Set Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Budgets() {
  const { user } = useAuth();
  const locale = user?.locale || 'en-IN';
  const now = new Date();

  const [budgets, setBudgets] = useState([]);
  const [currency, setCurrency] = useState(user?.currency || 'INR');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setLoadError(false);

    try {
      const res = await api.get(
        `/budgets?month=${month}&year=${year}`
      );

      // Support common API response formats.
      const responseData = res.data;
      const budgetList = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.budgets)
          ? responseData.budgets
          : Array.isArray(responseData?.data)
            ? responseData.data
            : [];

      setCurrency(
        responseData?.currency || budgetList[0]?.currency || user?.currency || 'INR'
      );

      setBudgets(
        budgetList.map((budget) => {
          const amount = getAmount(budget.amount);
          const spent = getAmount(budget.spent);
          const percentage = getPercentage({
            ...budget,
            amount,
            spent,
          });

          return {
            ...budget,
            id: getBudgetId(budget),
            amount,
            spent,
            percentage,
            exceeded: isBudgetExceeded({
              ...budget,
              amount,
              spent,
            }),
            currency: budget.currency || responseData?.currency || user?.currency || 'INR',
          };
        })
      );
    } catch (err) {
      console.error(
        'Failed to load budgets:',
        err.response?.data || err.message
      );

      setBudgets([]);
      setLoadError(true);

      toast.error(
        err.response?.data?.message || 'Failed to load budgets.'
      );
    } finally {
      setLoading(false);
    }
  }, [month, year, user?.currency]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleDelete = async (id) => {
    if (!id) {
      toast.error('Budget ID is missing.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this budget?')) {
      return;
    }

    setDeletingId(id);

    try {
      await api.delete(`/budgets/${id}`);

      toast.success('Budget deleted successfully!');
      await fetchBudgets();
    } catch (err) {
      console.error(
        'Failed to delete budget:',
        err.response?.data || err.message
      );

      toast.error(
        err.response?.data?.message || 'Failed to delete budget.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const monthName = new Date(year, month - 1).toLocaleString('en-US', {
    month: 'long',
  });

  const totalBudgeted = budgets.reduce(
    (sum, budget) => sum + getAmount(budget.amount),
    0
  );

  const totalSpent = budgets.reduce(
    (sum, budget) => sum + getAmount(budget.spent),
    0
  );

  const remainingBudget = totalBudgeted - totalSpent;

  const exceededCount = budgets.filter(
    (budget) => budget.exceeded
  ).length;

  const warningCount = budgets.filter(
    (budget) => budget.percentage >= 80
  ).length;

  const daysInMonth = new Date(year, month, 0).getDate();

  const currentDate = new Date();

  const isCurrentMonth =
    year === currentDate.getFullYear() &&
    month === currentDate.getMonth() + 1;

  const isPastMonth =
    year < currentDate.getFullYear() ||
    (year === currentDate.getFullYear() &&
      month < currentDate.getMonth() + 1);

  const daysElapsed = isCurrentMonth
    ? currentDate.getDate()
    : isPastMonth
      ? daysInMonth
      : 0;

  const dailyBudget =
    daysInMonth > 0 ? totalBudgeted / daysInMonth : 0;

  const dailySpent =
    daysElapsed > 0 ? totalSpent / daysElapsed : 0;

  const dailyBudgetStatus =
    dailySpent > dailyBudget
      ? 'You are spending above your average daily budget.'
      : 'Your average daily spending is within budget.';

  return (
    <Layout
      title="Budgets"
      subtitle={`Manage your spending limits for ${monthName} ${year}`}
    >
      <div className="space-y-6">
        {/* Month and year selectors */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            aria-label="Select month"
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (m) => (
                <option key={m} value={m}>
                  {new Date(2024, m - 1).toLocaleString('en-US', {
                    month: 'long',
                  })}
                </option>
              )
            )}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            aria-label="Select year"
          >
            {[
              now.getFullYear() - 1,
              now.getFullYear(),
              now.getFullYear() + 1,
            ].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={fetchBudgets}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition"
          >
            <RefreshCw
              size={16}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh
          </button>

          <button
            id="add-budget-btn"
            type="button"
            onClick={() => setShowModal(true)}
            className="ml-auto flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 shadow-xs"
          >
            <Plus size={16} />
            Add Budget
          </button>
        </div>

        {/* Loading and error states */}
        {loading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading budgets...</p>
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-6 py-10 text-center transition-colors">
            <AlertTriangle
              size={30}
              className="mx-auto mb-3 text-red-500"
            />

            <h3 className="mb-2 font-semibold text-red-700 dark:text-red-300">
              Unable to load budgets
            </h3>

            <p className="mb-4 text-sm text-red-600 dark:text-red-400">
              Check whether the backend server is running and the budgets
              API is working.
            </p>

            <button
              type="button"
              onClick={fetchBudgets}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 shadow-xs"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SummaryCard
                title="Total Budgeted"
                value={totalBudgeted}
                color="text-slate-800 dark:text-slate-100"
                currency={currency}
                locale={locale}
              />

              <SummaryCard
                title="Total Spent"
                value={totalSpent}
                color={
                  totalSpent > totalBudgeted
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-slate-800 dark:text-slate-100'
                }
                currency={currency}
                locale={locale}
              />

              <SummaryCard
                title="Remaining Budget"
                value={remainingBudget}
                color={
                  remainingBudget < 0
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }
                currency={currency}
                locale={locale}
              />

              <SummaryCard
                title="Daily Budget"
                value={dailyBudget}
                color="text-emerald-600 dark:text-emerald-400"
                subtitle="Average budget per calendar day"
                currency={currency}
                locale={locale}
              />

              <SummaryCard
                title="Average Daily Spending"
                value={dailySpent}
                color="text-slate-800 dark:text-slate-100"
                subtitle={`Based on ${daysElapsed} elapsed day(s)`}
                currency={currency}
                locale={locale}
              />

              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-colors">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Budget Alerts
                </p>

                <p
                  className={`text-2xl font-bold ${exceededCount > 0
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                >
                  {exceededCount > 0
                    ? `${exceededCount} exceeded`
                    : 'All good!'}
                </p>

                {warningCount > 0 && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    {warningCount} budget(s) have reached 80% usage.
                  </p>
                )}
              </div>
            </div>

            {/* Daily spending alert */}
            {budgets.length > 0 && (
              <div
                className={`rounded-xl border p-4 transition-colors ${dailySpent > dailyBudget
                    ? 'border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                    : 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  }`}
              >
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {dailySpent > dailyBudget ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <CheckCircle size={18} />
                  )}

                  {dailyBudgetStatus}
                </p>

                <p className="mt-2 text-xs opacity-90">
                  Average daily spending: {formatCurrency(dailySpent, currency, locale)}.
                  {' '}Average daily budget: {formatCurrency(dailyBudget, currency, locale)}.
                </p>
              </div>
            )}

            {/* Budget cards */}
            {budgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-16 text-center shadow-xs transition-colors">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60">
                  <TrendingDown
                    size={24}
                    className="text-emerald-500 dark:text-emerald-400"
                  />
                </div>

                <h3 className="mb-1 text-base font-semibold text-slate-700 dark:text-slate-200">
                  No budgets set
                </h3>

                <p className="mb-5 text-sm text-slate-400 dark:text-slate-500">
                  Set spending limits for {monthName} {year} to track your
                  expenses.
                </p>

                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 shadow-xs"
                >
                  <Plus size={16} />
                  Add Your First Budget
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {budgets.map((budget, index) => {
                  const id = budget.id ?? getBudgetId(budget) ?? index;
                  const percentage = getPercentage(budget);
                  const exceeded = isBudgetExceeded(budget);
                  const spent = getAmount(budget.spent);
                  const amount = getAmount(budget.amount);
                  const progressWidth = Math.min(
                    Math.max(percentage, 0),
                    100
                  );

                  return (
                    <div
                      key={id}
                      className={`rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-xs transition hover:shadow-md ${exceeded
                          ? 'border-red-200 dark:border-red-900/60'
                          : 'border-slate-200/80 dark:border-slate-800'
                        }`}
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                              {budget.category || 'Other'}
                            </h3>

                            {exceeded ? (
                              <AlertTriangle
                                size={15}
                                className="text-red-500"
                              />
                            ) : percentage >= 80 ? (
                              <AlertTriangle
                                size={15}
                                className="text-amber-500"
                              />
                            ) : (
                              <CheckCircle
                                size={15}
                                className="text-emerald-500"
                              />
                            )}
                          </div>

                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {monthName} {year}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(id)}
                          disabled={deletingId === id}
                          className="rounded-lg p-1.5 text-slate-300 dark:text-slate-600 transition hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50"
                          aria-label={`Delete ${budget.category} budget`}
                        >
                          {deletingId === id ? (
                            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${exceeded
                                ? 'bg-red-500'
                                : percentage >= 80
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-600'
                              }`}
                            style={{ width: `${progressWidth}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between gap-2 text-sm">
                        <div>
                          <p className="text-xs text-slate-400 dark:text-slate-500">Spent</p>
                          <p
                            className={`font-bold ${exceeded
                                ? 'text-red-500 dark:text-red-400'
                                : 'text-slate-800 dark:text-slate-100'
                              }`}
                          >
                            {formatCurrency(spent, budget.currency || currency, locale)}
                          </p>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-slate-400 dark:text-slate-500">Used</p>
                          <p
                            className={`font-bold ${exceeded
                                ? 'text-red-500 dark:text-red-400'
                                : 'text-slate-700 dark:text-slate-200'
                              }`}
                          >
                            {Math.round(percentage)}%
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-400 dark:text-slate-500">Budget</p>
                          <p className="font-bold text-slate-800 dark:text-slate-100">
                            {formatCurrency(amount, budget.currency || currency, locale)}
                          </p>
                        </div>
                      </div>

                      {exceeded && (
                        <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-950/50 px-3 py-2">
                          <p className="text-xs font-medium text-red-600 dark:text-red-400">
                            Over budget by {formatCurrency(
                              spent - amount,
                              budget.currency || currency,
                              locale
                            )}
                          </p>
                        </div>
                      )}

                      {!exceeded && percentage >= 80 && (
                        <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 px-3 py-2">
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            You have used {Math.round(percentage)}% of
                            this budget.
                          </p>
                        </div>
                      )}

                      {!exceeded && percentage < 80 && (
                        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                          {formatCurrency(
                            amount - spent,
                            budget.currency || currency,
                            locale
                          )} remaining
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {showModal && (
          <BudgetModal
            onClose={() => setShowModal(false)}
            onSave={fetchBudgets}
            month={month}
            year={year}
            currency={currency}
          />
        )}
      </div>
    </Layout>
  );
}

function SummaryCard({ title, value, color, subtitle, currency, locale = 'en-IN' }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-colors">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {title}
      </p>

      <p className={`text-2xl font-bold ${color}`}>
        {formatCurrency(value, currency, locale)}
      </p>

      {subtitle && (
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}
