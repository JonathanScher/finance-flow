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
import { PieChart as PieIcon, BarChart2, Layers } from 'lucide-react';

interface ChartsViewProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  settings: UserSettings;
}

export const ChartsView: React.FC<ChartsViewProps> = ({
  transactions,
  budgets,
  settings,
}) => {
  const [viewMode, setViewMode] = useState<'master' | 'sub' | 'budget'>('master');

  // Only consider expense outflows (debit > 0 and not internal transfers)
  const expenseTransactions = transactions.filter(
    (t) => t.debit > 0 && t.subCategory !== 'Internal Transfer'
  );

  // 1. Group by Master Category
  const masterSpending = expenseTransactions.reduce((acc, t) => {
    acc[t.masterCategory] = (acc[t.masterCategory] || 0) + t.debit;
    return acc;
  }, {} as Record<string, number>);

  const masterData = Object.entries(masterSpending).map(([name, value]) => {
    const def = MASTER_CATEGORIES.find((m) => m.name === name);
    return {
      name,
      value: Math.round(value * 100) / 100,
      color: def?.color || '#94a3b8',
    };
  }).sort((a, b) => b.value - a.value);

  // 2. Group by Sub Category
  const subSpending = expenseTransactions.reduce((acc, t) => {
    acc[t.subCategory] = (acc[t.subCategory] || 0) + t.debit;
    return acc;
  }, {} as Record<string, number>);

  const subColors = [
    '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6',
    '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#eab308',
  ];

  const subData = Object.entries(subSpending).map(([name, value], i) => ({
    name,
    value: Math.round(value * 100) / 100,
    color: subColors[i % subColors.length],
  })).sort((a, b) => b.value - a.value);

  // 3. Budget vs Actual by Master Category
  const budgetVsActualData = budgets.map((b) => {
    const spent = masterSpending[b.category] || 0;
    return {
      category: b.category,
      Budget: b.limit,
      Actual: Math.round(spent * 100) / 100,
    };
  });

  const formatCurrency = (val: number) => `${settings.currency}${val.toLocaleString()}`;

  const activeDonutData = viewMode === 'sub' ? subData : masterData;

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-sm">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white">Visual Breakdown</h2>
          <p className="text-xs text-slate-400">
            {viewMode === 'master'
              ? 'Spending share by Master Category'
              : viewMode === 'sub'
              ? 'Drilldown by Sub-Category'
              : 'Master Category target vs actual'}
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
            <span>Budget Limits</span>
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
            {activeDonutData.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900/70 transition"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-300 truncate">{item.name}</span>
                </div>
                <span className="font-semibold text-white ml-2 flex-shrink-0">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
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
              <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
              <Bar dataKey="Budget" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
