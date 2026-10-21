import React from 'react';
import { Plus, Wallet, RefreshCw } from 'lucide-react';
import type { UserSettings } from '../types/finance';

interface HeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  availableMonths: string[];
  onOpenAddModal: () => void;
  onOpenSyncModal: () => void;
  settings: UserSettings;
}

export const Header: React.FC<HeaderProps> = ({
  selectedMonth,
  onMonthChange,
  availableMonths,
  onOpenAddModal,
  onOpenSyncModal,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">
                FinanceFlow
              </h1>
              <span className="text-xs text-slate-400">Household Budget PWA</span>
            </div>
          </div>

          {/* Mobile Quick Add Button */}
          <button
            onClick={onOpenAddModal}
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow"
            title="Add Transaction"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Controls: Month Selector & Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end overflow-x-auto pb-1 sm:pb-0">
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="bg-slate-800 text-slate-200 text-sm border border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Time</option>
            {availableMonths.map((m) => {
              const [year, month] = m.split('-');
              const date = new Date(parseInt(year), parseInt(month) - 1, 1);
              const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              return (
                <option key={m} value={m}>
                  {label}
                </option>
              );
            })}
          </select>

          <button
            onClick={onOpenSyncModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google Sheets</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>
    </header>
  );
};
