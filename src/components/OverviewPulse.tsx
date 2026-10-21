import React from 'react';
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ReceiptText,
  Target,
  PieChart,
  Calendar,
  User,
} from 'lucide-react';
import type { CategoryBudget, Transaction, UserSettings } from '../types/finance';
import { MASTER_CATEGORIES } from '../data/categories';
import type { NavTab } from './Header';

interface OverviewPulseProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  settings: UserSettings;
  onNavigate: (tab: NavTab) => void;
  onDrilldownCategory: (category: string) => void;
}

export const OverviewPulse: React.FC<OverviewPulseProps> = ({
  transactions,
  budgets,
  settings,
  onNavigate,
  onDrilldownCategory,
}) => {
  const expenseTx = transactions.filter(
    (t) => t.debit > 0 && t.subCategory !== 'Internal Transfer'
  );

  const spentByCategory = expenseTx.reduce((acc, t) => {
    acc[t.masterCategory] = (acc[t.masterCategory] || 0) + t.debit;
    return acc;
  }, {} as Record<string, number>);

  // Sort budgets by highest % used so at-risk categories surface first
  const watchlist = budgets
    .map((b) => {
      const spent = spentByCategory[b.category] || 0;
      const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
      return {
        ...b,
        spent,
        pct,
        remaining: b.limit - spent,
        isOver: spent > b.limit,
      };
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);

  // Latest 5 transactions sorted by date descending
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const getCategoryColor = (name: string) =>
    MASTER_CATEGORIES.find((m) => m.name === name)?.color || '#64748b';

  const formatCurrency = (val: number, decimals = 0) =>
    `${settings.currency}${val.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Card: Category Watchlist (Top 4 by utilization) */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Category Watchlist
                </h3>
                <p className="text-xs text-slate-400">
                  Highest budget utilization this period
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('analytics')}
                className="text-xs text-slate-400 hover:text-indigo-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-700/50 transition"
                title="Open Visual Analytics"
              >
                <PieChart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Charts</span>
              </button>
              <button
                onClick={() => onNavigate('budgets')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 transition"
              >
                <span>All Budgets</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {watchlist.map((item) => (
              <div
                key={item.category}
                onClick={() => onDrilldownCategory(item.category)}
                className="p-3 rounded-xl bg-slate-900/55 border border-slate-700/60 hover:border-indigo-500/50 transition cursor-pointer group"
                title={`Click to view ${item.category} transactions`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-slate-200 group-hover:text-white transition">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-medium">
                      {formatCurrency(item.spent)} / {formatCurrency(item.limit)}
                    </span>
                    {item.isOver ? (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" />
                        +{formatCurrency(item.spent - item.limit)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        {item.pct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.isOver
                        ? 'bg-rose-500'
                        : item.pct > 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(item.pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Click any category to inspect its transactions
          </span>
          <button
            onClick={() => onNavigate('budgets')}
            className="text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Edit targets →
          </button>
        </div>
      </div>

      {/* Right Card: Recent Activity Preview */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <ReceiptText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Recent Transactions
                </h3>
                <p className="text-xs text-slate-400">
                  Latest {recentTransactions.length} of {transactions.length} entries
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 transition"
            >
              <span>View All ({transactions.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No transactions recorded for this period.
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((t) => {
                const isCredit = t.credit > 0;
                const catColor = getCategoryColor(t.masterCategory);
                return (
                  <div
                    key={t.id}
                    onClick={() => onNavigate('transactions')}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/55 border border-slate-700/50 hover:border-slate-600 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2 h-8 rounded-full flex-shrink-0"
                        style={{ backgroundColor: catColor }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                          {t.description}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5 text-slate-500" />
                            {t.date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-300">
                            <User className="w-2.5 h-2.5 text-indigo-400" />
                            {t.owner}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline text-slate-400 truncate">
                            {t.subCategory}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-xs sm:text-sm font-bold ml-3 flex-shrink-0 ${
                        isCredit ? 'text-emerald-400' : 'text-slate-100'
                      }`}
                    >
                      {isCredit ? '+' : '-'}
                      {formatCurrency(isCredit ? t.credit : t.debit, 2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
          <span>Search, filter by owner, account, or flow in the full register</span>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Open Register →
          </button>
        </div>
      </div>
    </div>
  );
};
