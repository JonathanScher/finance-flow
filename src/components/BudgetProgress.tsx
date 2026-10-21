import React, { useState } from 'react';
import type { CategoryBudget, Transaction, UserSettings } from '../types/finance';
import { MASTER_CATEGORIES } from '../data/categories';
import {
  Edit2,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ChevronsUpDown,
} from 'lucide-react';

interface BudgetProgressProps {
  budgets: CategoryBudget[];
  transactions: Transaction[];
  settings: UserSettings;
  onUpdateBudget: (newBudgets: CategoryBudget[]) => void;
  onDrilldownCategory?: (category: string) => void;
}

export const BudgetProgress: React.FC<BudgetProgressProps> = ({
  budgets,
  transactions,
  settings,
  onUpdateBudget,
  onDrilldownCategory,
}) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editLimitValue, setEditLimitValue] = useState<string>('');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // Expense debit only
  const expenseTx = transactions.filter(
    (t) => t.debit > 0 && t.subCategory !== 'Internal Transfer'
  );

  // Group by Master Category
  const masterSpent = expenseTx.reduce((acc, t) => {
    acc[t.masterCategory] = (acc[t.masterCategory] || 0) + t.debit;
    return acc;
  }, {} as Record<string, number>);

  // Group by Sub Category
  const subSpent = expenseTx.reduce((acc, t) => {
    acc[t.subCategory] = (acc[t.subCategory] || 0) + t.debit;
    return acc;
  }, {} as Record<string, number>);

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (masterSpent[b.category] || 0), 0);
  const totalRemaining = totalBudget - totalSpent;
  const overBudgetCount = budgets.filter(
    (b) => (masterSpent[b.category] || 0) > b.limit
  ).length;

  const allExpanded = budgets.every((b) => expandedCats[b.category]);

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedCats({});
    } else {
      const next: Record<string, boolean> = {};
      budgets.forEach((b) => {
        next[b.category] = true;
      });
      setExpandedCats(next);
    }
  };

  const toggleExpand = (cat: string) => {
    setExpandedCats((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleStartEdit = (category: string, currentLimit: number) => {
    setEditingCategory(category);
    setEditLimitValue(currentLimit.toString());
  };

  const handleSaveEdit = (category: string) => {
    const val = parseFloat(editLimitValue);
    if (!isNaN(val) && val >= 0) {
      const updated = budgets.map((b) =>
        b.category === category ? { ...b, limit: val } : b
      );
      onUpdateBudget(updated);
    }
    setEditingCategory(null);
  };

  const formatCurrency = (val: number, decimals = 0) =>
    `${settings.currency}${val.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;

  return (
    <div className="space-y-6">
      {/* Top Budget Health Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <div className="text-xs uppercase font-semibold tracking-wider text-slate-400">
            Total Monthly Target
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {formatCurrency(totalBudget)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Across {budgets.length} Master Categories
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <div className="text-xs uppercase font-semibold tracking-wider text-slate-400">
            Budgeted Outflow Spent
          </div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {formatCurrency(totalSpent)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}% of total target used
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <div className="text-xs uppercase font-semibold tracking-wider text-slate-400">
            Net Budget Headroom
          </div>
          <div
            className={`text-2xl font-bold mt-1 ${
              totalRemaining >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalRemaining >= 0
              ? formatCurrency(totalRemaining)
              : `-${formatCurrency(Math.abs(totalRemaining))}`}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {overBudgetCount === 0
              ? 'All categories within limit'
              : `${overBudgetCount} categor${overBudgetCount === 1 ? 'y' : 'ies'} over target`}
          </div>
        </div>
      </div>

      {/* Category Cards Section */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Master Category Budgets
            </h2>
            <p className="text-xs text-slate-400">
              Edit monthly targets inline, expand sub-categories, or jump to category transactions.
            </p>
          </div>

          <button
            onClick={toggleExpandAll}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-xs font-medium text-slate-300 transition"
          >
            <ChevronsUpDown className="w-3.5 h-3.5 text-indigo-400" />
            <span>{allExpanded ? 'Collapse Sub-Categories' : 'Expand All Sub-Categories'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((b) => {
            const spent = masterSpent[b.category] || 0;
            const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
            const isOver = spent > b.limit;
            const isEditing = editingCategory === b.category;
            const isExpanded = !!expandedCats[b.category];

            const categoryDef = MASTER_CATEGORIES.find((m) => m.name === b.category);
            const subCats = categoryDef?.subCategories || [];

            return (
              <div
                key={b.category}
                className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/60 hover:border-slate-600 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      onClick={() => toggleExpand(b.category)}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <button className="text-slate-400 hover:text-white p-0.5">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: b.color }}
                      />
                      <span className="text-sm font-semibold text-slate-200">
                        {b.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">{settings.currency}</span>
                          <input
                            type="number"
                            value={editLimitValue}
                            onChange={(e) => setEditLimitValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(b.category);
                              if (e.key === 'Escape') setEditingCategory(null);
                            }}
                            className="w-20 px-2 py-0.5 rounded bg-slate-800 border border-indigo-500 text-white text-xs outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(b.category)}
                            className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-300">
                            {formatCurrency(spent)} / {formatCurrency(b.limit)}
                          </span>
                          <button
                            onClick={() => handleStartEdit(b.category, b.limit)}
                            className="p-1 text-slate-400 hover:text-slate-200 transition rounded hover:bg-slate-800"
                            title="Edit Monthly Target Limit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          {onDrilldownCategory && (
                            <button
                              onClick={() => onDrilldownCategory(b.category)}
                              className="p-1 text-slate-400 hover:text-indigo-400 transition rounded hover:bg-slate-800"
                              title={`Filter transactions by ${b.category}`}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver
                          ? 'bg-rose-500'
                          : pct > 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                    <span>{pct.toFixed(0)}% used</span>
                    {isOver ? (
                      <span className="text-rose-400 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        +{formatCurrency(spent - b.limit)} over
                      </span>
                    ) : (
                      <span>{formatCurrency(b.limit - spent)} left</span>
                    )}
                  </div>

                  {/* Sub categories expand */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1 text-xs">
                      {subCats.map((sub) => {
                        const sSpent = subSpent[sub] || 0;
                        return (
                          <div
                            key={sub}
                            className="flex justify-between items-center text-slate-400 py-1 px-2 rounded hover:bg-slate-800/40"
                          >
                            <span>{sub}</span>
                            <span
                              className={`font-semibold ${
                                sSpent > 0 ? 'text-slate-200' : 'text-slate-500'
                              }`}
                            >
                              {formatCurrency(sSpent, 2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
