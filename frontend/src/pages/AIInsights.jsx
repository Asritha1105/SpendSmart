
import { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
  TrendingDown,
  Send,
  Bot,
  User,
  MessageCircle,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';

const typeConfig = {
  positive: {
    icon: CheckCircle,
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    title: 'text-emerald-900 dark:text-emerald-200',
    text: 'text-emerald-800 dark:text-emerald-300',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    title: 'text-emerald-900 dark:text-emerald-200',
    text: 'text-emerald-800 dark:text-emerald-300',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800/60',
    title: 'text-amber-900 dark:text-amber-200',
    text: 'text-amber-800 dark:text-amber-300',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  danger: {
    icon: AlertTriangle,
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800/60',
    title: 'text-red-900 dark:text-red-200',
    text: 'text-red-800 dark:text-red-300',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  info: {
    icon: Info,
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-200 dark:border-teal-800/60',
    title: 'text-teal-900 dark:text-teal-200',
    text: 'text-teal-800 dark:text-teal-300',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
  tip: {
    icon: Lightbulb,
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    title: 'text-emerald-900 dark:text-emerald-200',
    text: 'text-emerald-800 dark:text-emerald-300',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
};

function InsightCard({ insight }) {
  const cfg = typeConfig[insight.type] || typeConfig.info;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-2xl border p-5 ${cfg.bg} ${cfg.border} transition-colors duration-200`}>
      <div className="flex items-start gap-3">
        <Icon
          size={21}
          className={`flex-shrink-0 mt-0.5 ${cfg.iconColor}`}
        />
        <div>
          <h3 className={`text-sm font-bold mb-1 ${cfg.title}`}>
            {insight.title}
          </h3>
          <p className={`text-sm leading-relaxed ${cfg.text}`}>
            {insight.message}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AIInsights() {
  const [insights, setInsights] = useState(null);
  const [source, setSource] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      text: 'Hi! 👋 I am your SpendSmart AI assistant. Ask me about your expenses, budgets, savings, or ways to reduce spending.',
    },
  ]);

  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setInsights(null);
    setMessage(null);

    try {
      const res = await api.get(
        `/ai/insights?month=${month}&year=${year}`
      );

      setInsights(
        Array.isArray(res.data.insights) ? res.data.insights : []
      );
      setSource(res.data.source || 'rules');
      setMessage(res.data.message || null);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to generate AI insights';

      toast.error(errorMessage);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const sendMessage = async (event) => {
    event.preventDefault();

    const question = chatInput.trim();

    if (!question || chatLoading) return;

    setChatMessages((previous) => [
      ...previous,
      { role: 'user', text: question },
    ]);

    setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: question,
        month,
        year,
      });

      setChatMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          text: res.data.answer || 'I could not generate an answer.',
        },
      ]);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        'Sorry, I could not answer right now. Please try again.';

      setChatMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          text: `Sorry! ${errorMessage}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const monthName = new Date(year, month - 1).toLocaleString(
    'default',
    { month: 'long' }
  );

  const suggestedQuestions = [
    'How can I save more money?',
    'Where am I spending the most?',
    'How can I reduce my expenses?',
    'Suggest a monthly budget for me.',
  ];

  return (
    <Layout
      title="AI Insights"
      subtitle="Personalized financial advice powered by Gemini AI"
    >
      {/* Month and year controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {new Date(2024, m - 1).toLocaleString('default', {
                month: 'long',
              })}
            </option>
          ))}
        </select>

        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
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
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition shadow-xs disabled:opacity-60"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {loading ? 'Analyzing...' : 'Generate Insights'}
        </button>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-emerald-50/70 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800 transition disabled:opacity-60"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* AI status */}
      {source && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${source === 'gemini'
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
          >
            <Sparkles size={12} />
            {source === 'gemini'
              ? 'Powered by Gemini AI'
              : 'Basic analysis'}
          </span>

          {message && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{message}</p>
          )}
        </div>
      )}

      {/* AI insights */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-950/70 rounded-xl">
            <Lightbulb size={19} className="text-emerald-700 dark:text-emerald-300" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Your Smart Spending Recommendations
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalized advice for {monthName} {year}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center py-12 shadow-xs transition-colors">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-700 dark:text-slate-200 font-medium">
              Analyzing your financial data...
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Generating personalized suggestions
            </p>
          </div>
        ) : insights && insights.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <InsightCard
                key={`${insight.title}-${index}`}
                insight={insight}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-xs transition-colors">
            <Wallet
              size={32}
              className="mx-auto text-emerald-500 mb-3"
            />
            <h3 className="font-bold text-slate-700 dark:text-slate-200">
              No recommendations available
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Add transactions for {monthName} {year}, then refresh your insights.
            </p>
          </div>
        )}
      </section>

      {/* Finance chatbot */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 p-5 text-white shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl">
              <MessageCircle size={24} />
            </div>

            <div>
              <h2 className="font-bold text-lg">
                SpendSmart Finance Assistant
              </h2>
              <p className="text-xs text-emerald-100 mt-1">
                Ask questions about your spending and savings
              </p>
            </div>
          </div>
        </div>

        {/* Suggested questions */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
            TRY ASKING
          </p>

          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                disabled={chatLoading}
                onClick={() => setChatInput(question)}
                className="text-xs px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 disabled:opacity-50 transition"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation */}
        <div className="h-80 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950 transition-colors">
          {chatMessages.map((item, index) => (
            <div
              key={index}
              className={`flex gap-2 ${item.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
            >
              {item.role === 'assistant' && (
                <div className="w-8 h-8 flex-shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950/70 flex items-center justify-center">
                  <Bot size={17} className="text-emerald-700 dark:text-emerald-300" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${item.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-sm shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-bl-sm shadow-xs'
                  }`}
              >
                {item.text}
              </div>

              {item.role === 'user' && (
                <div className="w-8 h-8 flex-shrink-0 rounded-full bg-emerald-700 flex items-center justify-center">
                  <User size={17} className="text-white" />
                </div>
              )}
            </div>
          ))}

          {chatLoading && (
            <div className="flex gap-2 items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/70 flex items-center justify-center">
                <Bot size={17} className="text-emerald-700 dark:text-emerald-300" />
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-500 dark:text-slate-300 shadow-xs">
                Thinking
                <span className="inline-block animate-pulse">...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Message input */}
        <form
          onSubmit={sendMessage}
          className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 transition-colors"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask about your expenses, budget, or savings..."
              rows={2}
              maxLength={1500}
              disabled={chatLoading}
              className="flex-1 resize-none px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 dark:disabled:bg-slate-900 transition-colors"
            />

            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <Send size={19} />
            </button>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            AI responses may be imperfect. Check important financial decisions carefully.
          </p>
        </form>
      </section>
    </Layout>
  );
}
