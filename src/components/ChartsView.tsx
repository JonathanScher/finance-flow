import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { CategoryBudget, Transaction, UserSettings } from '../types/finance';
import { MASTER_CATEGORIES } from '../data/categories';
import {
  PieChart as PieIcon,
  BarChart2,
  Layers,
  CreditCard,
  Users,
  ExternalLink,
} from 'lucide-react';

interface ChartsViewProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  settings: UserSettings;
  onDrilldownCategory?: (category: string) => void;
}

export const ChartsView: React.FC<ChartsViewProps> = ({
  transactions,
  budgets,
  settings,
  onDrilldownCategory,
}) => {
  const [viewMode, setViewMode] = useState<'master' | 'sub' | 'budget'>('master');

  // Only consider expense outflows (debit > 0 and not internal transfers)
  const expenseTransactions = transactions.filter(
    (t) => t.debit > 0 && t.subCategory !== 'Internal Transfer'
  );

  const totalOutflow = expenseTransactions.reduce((sum, t) => sum + t.debit, 0);

  // 1. Group by Master Category
  const masterSpending = expenseTransactions.reduce((acc, t) => {
    acc[t.masterCategory] = (acc[t.masterCategory] || 0) + t.debit;
    return acc;
  }, {} as Record<string, number>);

  const masterData = Object.entries(masterSpending)
    .map(([name, value]) => {
      const def = MASTER_CATEGORIES.find((m) => m.name === name);
      return {
        name,
        value: Math.round(value * 100) / 100,
        color: def?.color || '#94a3b8',
      };
    })
    .sort((a, b) => b.value - a.value);

  // 2. Group by Sub Category
  const subSpending = expenseTransactions.reduce((acc, t) => {
    acc[t.subCategory] = (acc[t.subCategory] || 0) + t.debit;
    return acc;
  }, {} as Record<string, number>);

  const subColors = [
    '#6366f1',
    '#10b981',
    '#f59e0b',
    '#ec4899',
    '#3b82f6',
    '#8b5cf6',
    '#14b8a6',
    '#f97316',
    '#06b6d4',
    '#eab308',
  ];

  const subData = Object.entries(subSpending)
    .map(([name, value], i) => ({
      name,
      value: Math.round(value * 100) / 100,
      color: subColors[i % subColors.length],
    }))
    .sort((a, b) => b.value - a.value);

  // 3. Budget vs Actual by Master Category
  const budgetVsActualData = budgets.map((b) => {
    const spent = masterSpending[b.category] || 0;
    return {
      category: b.category,
      Budget: b.limit,
      Actual: Math.round(spent * 100) / 100,
    };
  });

  // 4. Group by Account
  const accountSpending = expenseTransactions.reduce((acc, t) => {
    const key = t.account || 'Other';
    acc[key] = (acc[key] || 0) + t.debit;
    return acc;
  }, {} as Record<string, number>);

  const accountList = Object.entries(accountSpending)
    .map(([name, value]) => ({
      name,
      value,
      pct: totalOutflow > 0 ? (value / totalOutflow) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // 5. Group by Owner
  const ownerSpending = expenseTransactions.reduce((acc, t) => {
    const key = t.owner || 'Joint';
    acc[key] = (acc[key] || 0) + t.debit;
    return acc;
  }, {} as Record<string, number>);

  const ownerList = Object.entries(ownerSpending)
    .map(([name, value]) => ({
      name,
      value,
      pct: totalOutflow > 0 ? (value / totalOutflow) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const formatCurrency = (val: number) =>
    `${settings.currency}${val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  const activeDonutData = viewMode === 'sub' ? subData : masterData;

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-sm">
        {/* Header & Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Visual Breakdown</h2>
            <p className="text-xs text-slate-400">
              {viewMode === 'master'
                ? 'Spending share by Master Category (click any category to filter transactions)'
                : viewMode === 'sub'
                ? 'Granular drilldown by Sub-Category'
                : 'Master Category monthly target vs. actual outflow'}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewMode('master')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                viewMode === 'master'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Master Categories</span>
            </button>
            <button
              onClick={() => setViewMode('sub')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                viewMode === 'sub'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sub-Categories</span>
            </button>
            <button
              onClick={() => setViewMode('budget')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                viewMode === 'budget'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Budget vs Actual</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {expenseTransactions.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500">
            <p className="text-sm">No expenses recorded for this timeframe.</p>
          </div>
        ) : viewMode !== 'budget' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {activeDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Outflow']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* List legend */}
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-2">
              {activeDonutData.map((item) => {
                const sharePct = totalOutflow > 0 ? (item.value / totalOutflow) * 100 : 0;
                const isClickable = viewMode === 'master' && Boolean(onDrilldownCategory);
                return (
                  <div
                    key={item.name}
                    onClick={() => {
                      if (isClickable && onDrilldownCategory) {
                        onDrilldownCategory(item.name);
                      }
                    }}
                    className={`flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 border border-transparent hover:border-slate-700/70 transition ${
                      isClickable ? 'cursor-pointer group' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-200 font-medium truncate">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        ({sharePct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <span className="font-semibold text-white">
                        {formatCurrency(item.value)}
                      </span>
                      {isClickable && (
                        <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={budgetVsActualData}
                margin={{ top: 10, right: 10, left: -15, bottom: 35 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis
                  dataKey="category"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `${settings.currency}${v}`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val) || 0), '']}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                />
                <Bar dataKey="Budget" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Secondary Analytics Grid: Spending by Payment Account & Spending by Partner/Owner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Method / Account Breakdown */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Outflow by Account
              </h3>
              <p className="text-xs text-slate-400">
                Cards and bank accounts used this period
              </p>
            </div>
          </div>

          {accountList.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No account data</p>
          ) : (
            <div className="space-y-3">
              {accountList.map((acc) => (
                <div key={acc.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-200">{acc.name}</span>
                    <span className="text-slate-300 font-semibold">
                      {formatCurrency(acc.value)}{' '}
                      <span className="text-slate-500 font-normal">
                        ({acc.pct.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(acc.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Household Partner / Owner Breakdown */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Outflow by Household Member
              </h3>
              <p className="text-xs text-slate-400">
                Distribution between Joint and individual spending
              </p>
            </div>
          </div>

          {ownerList.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No owner data</p>
          ) : (
            <div className="space-y-3">
              {ownerList.map((o) => (
                <div key={o.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-200">{o.name}</span>
                    <span className="text-slate-300 font-semibold">
                      {formatCurrency(o.value)}{' '}
                      <span className="text-slate-500 font-normal">
                        ({o.pct.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${Math.min(o.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
