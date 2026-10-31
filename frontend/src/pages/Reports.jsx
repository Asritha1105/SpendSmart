
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currency';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PIE_COLORS = [
  '#059669',
  '#0d9488',
  '#10b981',
  '#34d399',
  '#064e3b',
  '#0284c7',
  '#f59e0b',
  '#dc2626',
];

function CustomTooltip({ active, payload, label, currency = 'INR', locale = 'en-IN' }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1 font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </p>

      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }}>
          {item.name}: {formatCurrency(item.value, currency, locale)}
        </p>
      ))}
    </div>
  );
}

const cardClass =
  'rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-900';

const headingClass =
  'text-base font-semibold text-slate-800 dark:text-slate-100';

const selectClass =
  'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

const tableHeaderClass =
  'border-b border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800';

const tableHeadingClass =
  'text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300';

export default function Reports() {
  const { user } = useAuth();
  const currency = user?.currency || 'INR';
  const locale = user?.locale || 'en-IN';
  const formatMoney = (value) => formatCurrency(value, currency, locale);

  const [report, setReport] = useState(null);
  const [yearlyReport, setYearlyReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [tab, setTab] = useState('monthly');

  const fetchReports = async () => {
    setLoading(true);

    try {
      if (tab === 'monthly') {
        const res = await api.get(
          `/reports/monthly?month=${month}&year=${year}`
        );
        setReport(res.data);
      } else {
        const res = await api.get(`/reports/yearly?year=${year}`);
        setYearlyReport(res.data);
      }
    } catch {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [month, year, tab]);

  const monthName = new Date(year, month - 1).toLocaleString('default', {
    month: 'long',
  });

  return (
    <Layout
      title="Monthly Reports"
      subtitle="Detailed financial analysis and summaries"
    >
      {/* Tabs and selectors */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-900">
          {['monthly', 'yearly'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-semibold capitalize transition ${tab === t
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'monthly' && (
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className={selectClass}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2024, m - 1).toLocaleString('default', {
                  month: 'long',
                })}
              </option>
            ))}
          </select>
        )}

        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className={selectClass}
        >
          {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : tab === 'monthly' && report ? (
        <>
          {/* Monthly summary cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[
              {
                label: 'Total Income',
                value: report.totalIncome,
                icon: TrendingUp,
                color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
              },
              {
                label: 'Total Expenses',
                value: report.totalExpenses,
                icon: TrendingDown,
                color: 'text-red-500 bg-red-50 dark:bg-red-950/40 dark:text-red-400',
              },
              {
                label: 'Net Balance',
                value: report.balance,
                icon: Wallet,
                color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
              },
              {
                label: 'Savings Rate',
                value: `${report.savingsRate}%`,
                icon: PiggyBank,
                color: 'text-teal-700 bg-teal-50 dark:bg-teal-950/50 dark:text-teal-400',
                isPercent: true,
              },
            ].map((c) => (
              <div
                key={c.label}
                className={`${cardClass} card-hover fade-in p-4`}
              >
                <div
                  className={`mb-3 flex h-8 w-8 items-center justify-center rounded-xl ${c.color}`}
                >
                  <c.icon size={16} />
                </div>

                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {c.isPercent
                    ? c.value
                    : formatMoney(c.value)}
                </p>

                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-400">
                  {c.label}
                </p>
              </div>
            ))}
          </div>

          {/* Monthly charts */}
          <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {/* Daily cash flow */}
            {report.dailyData.length > 0 && (
              <div className={`${cardClass} p-5`}>
                <h2 className={`${headingClass} mb-4`}>
                  Daily Cash Flow
                </h2>

                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={report.dailyData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#64748b"
                      opacity={0.2}
                    />

                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickFormatter={(d) => d.slice(5)}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatMoney(v)}
                    />

                    <Tooltip content={<CustomTooltip currency={currency} locale={locale} />} />

                    <Line
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={false}
                    />

                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#dc2626"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Expense breakdown */}
            {report.expensesByCategory.length > 0 && (
              <div className={`${cardClass} p-5`}>
                <h2 className={`${headingClass} mb-4`}>
                  Expense Breakdown
                </h2>

                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={report.expensesByCategory}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {report.expensesByCategory.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--chart-tooltip-bg, #ffffff)',
                        border: '1px solid var(--chart-tooltip-border, #e2e8f0)',
                        borderRadius: '12px',
                        color: 'var(--chart-tooltip-text, #0f172a)',
                      }}
                      formatter={(v) => formatMoney(v)}
                    />

                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{
                        fontSize: '11px',
                        color: 'var(--chart-legend-text, #64748b)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Transactions table */}
          {report.transactions.length > 0 && (
            <div className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-slate-100 p-4 dark:border-slate-700">
                <h2 className={headingClass}>
                  All Transactions — {monthName} {year} (
                  {report.transactionCount})
                </h2>
              </div>

              <div className="max-h-80 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className={`px-4 py-2.5 text-left ${tableHeadingClass}`}>
                        Date
                      </th>
                      <th className={`px-4 py-2.5 text-left ${tableHeadingClass}`}>
                        Description
                      </th>
                      <th className={`px-4 py-2.5 text-left ${tableHeadingClass}`}>
                        Category
                      </th>
                      <th className={`px-4 py-2.5 text-right ${tableHeadingClass}`}>
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.transactions.map((t) => (
                      <tr
                        key={t._id}
                        className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                      >
                        <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                          {new Date(t.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>

                        <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">
                          {t.description || '—'}
                        </td>

                        <td className="px-4 py-2.5">
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {t.category}
                          </span>
                        </td>

                        <td
                          className={`px-4 py-2.5 text-right font-semibold ${t.type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-500 dark:text-red-400'
                            }`}
                        >
                          {`${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : tab === 'yearly' && yearlyReport ? (
        <>
          {/* Yearly summary cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[
              {
                label: 'Yearly Income',
                value: yearlyReport.yearlyIncome,
                color: 'text-emerald-600 dark:text-emerald-400',
              },
              {
                label: 'Yearly Expenses',
                value: yearlyReport.yearlyExpenses,
                color: 'text-red-500 dark:text-red-400',
              },
              {
                label: 'Yearly Balance',
                value: yearlyReport.yearlyBalance,
                color: 'text-emerald-700 dark:text-emerald-400',
              },
              {
                label: 'Savings Rate',
                value: `${yearlyReport.yearlySavingsRate}%`,
                color: 'text-teal-700 dark:text-teal-400',
                isPercent: true,
              },
            ].map((c) => (
              <div
                key={c.label}
                className={`${cardClass} card-hover p-4`}
              >
                <p className="mb-2 text-xs text-slate-400 dark:text-slate-400">
                  {c.label}
                </p>

                <p className={`text-xl font-bold ${c.color}`}>
                  {c.isPercent
                    ? c.value
                    : formatMoney(c.value)}
                </p>
              </div>
            ))}
          </div>

          {/* Monthly breakdown chart */}
          <div className={`${cardClass} mb-4 p-5`}>
            <h2 className={`${headingClass} mb-4`}>
              Monthly Breakdown — {year}
            </h2>

            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={yearlyReport.monthlyBreakdown.map((m) => ({
                  ...m,
                  month: m.monthName.slice(0, 3),
                }))}
                barGap={3}
                barCategoryGap="25%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#64748b"
                  opacity={0.2}
                />

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
                  tickFormatter={(v) => formatMoney(v)}
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
          </div>

          {/* Yearly monthly table */}
          <div className={`${cardClass} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={tableHeaderClass}>
                    <th className={`px-5 py-3 text-left ${tableHeadingClass}`}>
                      Month
                    </th>
                    <th className={`px-5 py-3 text-right ${tableHeadingClass}`}>
                      Income
                    </th>
                    <th className={`px-5 py-3 text-right ${tableHeadingClass}`}>
                      Expenses
                    </th>
                    <th className={`px-5 py-3 text-right ${tableHeadingClass}`}>
                      Balance
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {yearlyReport.monthlyBreakdown.map((m) => (
                    <tr
                      key={m.month}
                      className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-5 py-3 font-medium text-slate-700 dark:text-slate-200">
                        {m.monthName}
                      </td>

                      <td className="px-5 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {formatMoney(m.income)}
                      </td>

                      <td className="px-5 py-3 text-right font-medium text-red-500 dark:text-red-400">
                        {formatMoney(m.expenses)}
                      </td>

                      <td
                        className={`px-5 py-3 text-right font-semibold ${m.balance >= 0
                            ? 'text-slate-700 dark:text-slate-200'
                            : 'text-red-500 dark:text-red-400'
                          }`}
                      >
                        {formatMoney(m.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="py-16 text-center text-slate-400 dark:text-slate-500">
          No data available for this period
        </div>
      )}
    </Layout>
  );
}
