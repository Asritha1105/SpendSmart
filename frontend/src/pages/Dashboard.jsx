
import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currency';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import { format, isValid } from 'date-fns';
const PIE_COLORS = [
  '#059669', '#0d9488', '#10b981', '#34d399', '#064e3b',
  '#0284c7', '#f59e0b', '#dc2626', '#64748b', '#047857',
];

const money = (value) => Number(value) || 0;

function StatCard({ title, value, icon: Icon, trend, color, subtitle, isPercent = false, currency = 'INR', locale = 'en-IN' }) {
  const colorMap = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400',
    green: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400',
    red: 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400',
    teal: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400',
    mint: 'bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300',
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 card-hover fade-in transition-colors duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color] || colorMap.emerald}`}>
          <Icon size={20} />
        </div>

        {trend !== undefined && trend !== null && (
          <span
            className={`text-xs font-semibold flex items-center gap-0.5 px-2 py-1 rounded-lg ${trend >= 0
              ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
              : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60'
              }`}
          >
            {trend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(money(trend))}%
          </span>
        )}
      </div>

      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
        {isPercent
          ? `${money(value).toFixed(1)}%`
          : formatCurrency(value, currency, locale)}
      </p>

      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function CustomTooltip({ active, payload, label, currency = 'INR', locale = 'en-IN' }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">{label}</p>

      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }} className="font-medium">
          {item.name}: {formatCurrency(item.value, currency, locale)}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const currency = user?.currency || 'INR';
  const locale = user?.locale || 'en-IN';
  const formatMoney = (value) => formatCurrency(value, currency, locale);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const fetchDashboard = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);

    try {
      const response = await api.get(
        `/dashboard?month=${month}&year=${year}`
      );

      setData(response.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error.response?.data || error.message);

      toast.error(
        error.response?.data?.message || 'Failed to load dashboard data'
      );
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Refresh data when returning to this browser tab.
  useEffect(() => {
    const handleFocus = () => fetchDashboard(false);

    window.addEventListener('focus', handleFocus);

    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchDashboard]);

  // Refresh periodically so dashboard values stay up to date.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboard(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const monthName = new Date(year, month - 1).toLocaleString('default', {
    month: 'long',
  });

  // The PostgreSQL dashboard endpoint returns summary.income,
  // summary.expenses, summary.balance and summary.savingsRate.
  const summary = data?.summary || {};

  const totalIncome = money(summary.income);
  const totalExpenses = money(summary.expenses);

  const balance =
    summary.balance !== undefined
      ? money(summary.balance)
      : totalIncome - totalExpenses;

  const savingsRate = money(summary.savingsRate);

  // PostgreSQL returns expensesByCategory with category and total.
  const pieData = (data?.expensesByCategory || [])
    .map((item) => ({
      name: item.category || item._id || 'Other',
      value: money(item.total ?? item.amount),
    }))
    .filter((item) => item.value > 0);

  // PostgreSQL returns monthlyData with month, income and expenses.
  const monthlyData = (data?.monthlyData || []).map((item) => ({
    ...item,
    income: money(item.income),
    expenses: money(item.expenses),
  }));

  const recentTransactions = data?.recentTransactions || [];

  // The backend returns budgets, with amount, spent, remaining and percentage.
  const budgetOverview = (data?.budgets || []).map((item) => {
    const budgeted = money(item.amount ?? item.budgeted);
    const spent = money(item.spent);
    const percentage =
      item.percentage !== undefined
        ? money(item.percentage)
        : budgeted > 0
          ? Math.round((spent / budgeted) * 100)
          : 0;

    return {
      ...item,
      category: item.category || 'Other',
      budgeted,
      spent,
      remaining: budgeted - spent,
      percentage,
      exceeded: item.exceeded ?? spent > budgeted,
    };
  });

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              Loading your financial data...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Dashboard"
      subtitle={`Financial overview for ${monthName} ${year}`}
    >
      {/* Month and year selector */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={month}
          onChange={(event) => setMonth(Number(event.target.value))}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 transition-colors"
        >
          {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
            <option key={item} value={item}>
              {new Date(2024, item - 1).toLocaleString('default', {
                month: 'long',
              })}
            </option>
          ))}
        </select>

        <select
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 transition-colors"
        >
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(
            (item) => (
              <option key={item} value={item}>
                {item}
              </option>
            )
          )}
        </select>

        <button
          onClick={() => fetchDashboard()}
          className="ml-auto px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition shadow-xs"
        >
          Refresh
        </button>
      </div>

      



      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Income"
          value={totalIncome}
          icon={TrendingUp}
          color="green"
          subtitle="Selected month's income"
          currency={currency}
          locale={locale}
        />

        <StatCard
          title="Total Expenses"
          value={totalExpenses}
          icon={TrendingDown}
          color="red"
          subtitle="Selected month's expenses"
          currency={currency}
          locale={locale}
        />

        <StatCard
          title="Remaining Balance"
          value={balance}
          icon={Wallet}
          color="emerald"
          subtitle={balance >= 0 ? "You're in the green!" : 'Overspent this month'}
          currency={currency}
          locale={locale}
        />

        <StatCard
          title="Savings Rate"
          value={savingsRate}
          isPercent
          icon={PiggyBank}
          color="teal"
          subtitle={savingsRate >= 20 ? 'Excellent saving!' : 'Target: 20%+'}
          currency={currency}
          locale={locale}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 transition-colors duration-200 shadow-xs">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Income vs Expenses (Last 6 Months)
          </h2>

          {monthlyData.length === 0 ? (
            <div className="flex items-center justify-center h-60 text-slate-400 dark:text-slate-500 text-sm">
              No monthly data available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:opacity-10" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatCurrency(value, currency, locale)}
                />
                <Tooltip content={<CustomTooltip currency={currency} locale={locale} />} />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#dc2626"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense categories */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 transition-colors duration-200 shadow-xs">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Expenses by Category
          </h2>

          {pieData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500">
              <p className="text-sm">No expense data yet</p>
              <p className="text-xs mt-1">
                Add expense transactions to see the chart.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value) => formatCurrency(value, currency, locale)}
                />

                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent transactions and budget overview */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent transactions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 transition-colors duration-200 shadow-xs">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Recent Transactions
          </h2>

          {recentTransactions.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction, index) => {
                const transactionDate = new Date(transaction.date);
                const validDate = isValid(transactionDate);

                return (
                  <div
                    key={transaction._id || transaction.id || index}
                    className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/80 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${transaction.type === 'income'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60'
                          : 'bg-red-50 dark:bg-red-950/60'
                          }`}
                      >
                        {transaction.type === 'income' ? (
                          <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <TrendingDown size={14} className="text-red-500 dark:text-red-400" />
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {transaction.description || transaction.category}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {transaction.category}
                          {validDate
                            ? ` · ${format(transactionDate, 'MMM d')}`
                            : ''}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-sm font-semibold ${transaction.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-500 dark:text-red-400'
                        }`}
                    >
                      {`${transaction.type === 'income' ? '+' : '-'}${formatMoney(transaction.amount)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Budget overview */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 transition-colors duration-200 shadow-xs">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Budget Overview
          </h2>

          {budgetOverview.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">
              No budgets set for this month.{' '}
              <a href="/budgets" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                Set budgets →
              </a>
            </p>
          ) : (
            <div className="space-y-4">
              {budgetOverview.map((budget, index) => {
                const percentage = Math.max(
                  0,
                  Math.min(100, Math.round(budget.percentage))
                );

                return (
                  <div key={budget._id || budget.id || budget.category || index}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {budget.category}
                        </span>

                        {budget.exceeded && (
                          <AlertTriangle size={13} className="text-red-500" />
                        )}
                      </div>

                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatMoney(budget.spent)} / {formatMoney(budget.budgeted)}
                      </span>
                    </div>

                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${budget.exceeded
                          ? 'bg-red-500'
                          : percentage >= 80
                            ? 'bg-amber-400'
                            : 'bg-emerald-600'
                          }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {Math.round(budget.percentage)}% used
                      </p>

                      <p
                        className={`text-xs ${budget.remaining < 0
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                      >
                        {budget.remaining < 0
                          ? `Exceeded by ${formatMoney(Math.abs(budget.remaining))}`
                          : `${formatMoney(budget.remaining)} remaining`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
