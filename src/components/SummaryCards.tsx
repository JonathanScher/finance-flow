import React from 'react';
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Users } from 'lucide-react';
import type { CategoryBudget, Transaction, UserSettings } from '../types/finance';

interface SummaryCardsProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  settings: UserSettings;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  transactions,
  budgets,
  settings,
}) => {
  // Income: Credit from Income & Transfers (or any transaction where credit > 0 and not internal transfer)
  const totalIncome = transactions.reduce((acc, t) => {
    if (t.credit > 0 && t.subCategory !== 'Internal Transfer') {
      return acc + t.credit;
    }
    return acc;
  }, 0);

  // Total Expenses: Debit from expense categories (excluding internal transfers)
  const totalExpenses = transactions.reduce((acc, t) => {
    if (t.debit > 0 && t.subCategory !== 'Internal Transfer') {
      return acc + t.debit;
    }
    return acc;
  }, 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Monthly Budget Comparison (for expense categories)
  const totalBudget = budgets.reduce((acc, b) => acc + b.limit, 0);
  const percentUsed = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

  // Spending by Owner (Debit only)
  const ownerSpending = transactions.reduce((acc, t) => {
    if (t.debit > 0) {
      const owner = t.owner || 'Joint';
      acc[owner] = (acc[owner] || 0) + t.debit;
    }
    return acc;
  }, {} as Record<string, number>);

  const formatCurrency = (val: number) => {
    return `${settings.currency}${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Income */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm hover:border-slate-600 transition">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs uppercase font-semibold tracking-wider">Total Inflow</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-emerald-400 tracking-tight">
          {formatCurrency(totalIncome)}
        </div>
        <div className="text-xs text-slate-400 mt-2">
          Primary & side income, reimbursements
        </div>
      </div>

      {/* 2. Total Outflow / Expenses */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm hover:border-slate-600 transition">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs uppercase font-semibold tracking-wider">Total Outflow</span>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">
          {formatCurrency(totalExpenses)}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentUsed > 100
                  ? 'bg-rose-500'
                  : percentUsed > 85
                  ? 'bg-amber-500'
                  : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-300">
            {percentUsed.toFixed(0)}% of target
          </span>
        </div>
      </div>

      {/* 3. Net Savings & Savings Rate */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm hover:border-slate-600 transition">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs uppercase font-semibold tracking-wider">Net Cashflow</span>
          <div
            className={`p-2 rounded-xl ${
              netSavings >= 0 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'
            }`}
          >
            <PiggyBank className="w-4 h-4" />
          </div>
        </div>
        <div
          className={`text-2xl font-bold tracking-tight ${
            netSavings >= 0 ? 'text-indigo-400' : 'text-rose-400'
          }`}
        >
          {netSavings >= 0 ? '+' : ''}
          {formatCurrency(netSavings)}
        </div>
        <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
          <span className="font-semibold text-slate-200">{savingsRate.toFixed(1)}%</span>
          <span>savings rate</span>
        </div>
      </div>

      {/* 4. Owner Outflow Split */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm hover:border-slate-600 transition">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs uppercase font-semibold tracking-wider">Owner Spending</span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1.5 mt-1">
          {Object.entries(ownerSpending).length > 0 ? (
            Object.entries(ownerSpending).map(([owner, amount]) => (
              <div key={owner} className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium truncate max-w-[100px]">{owner}:</span>
                <span className="text-white font-semibold">{formatCurrency(amount)}</span>
              </div>
            ))
          ) : (
            <span className="text-xs text-slate-500">No outflow data</span>
          )}
        </div>
      </div>
    </div>
  );
};
