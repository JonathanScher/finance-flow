import React from 'react';
import {
  Plus,
  Wallet,
  RefreshCw,
  LayoutDashboard,
  Target,
  PieChart,
  ReceiptText,
  Settings2,
} from 'lucide-react';
import type { UserSettings } from '../types/finance';

export type NavTab = 'overview' | 'budgets' | 'analytics' | 'transactions' | 'settings';

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  availableMonths: string[];
  onOpenAddModal: () => void;
  onQuickSync?: () => void;
  isQuickSyncing?: boolean;
  settings: UserSettings;
  transactionCount?: number;
  overBudgetCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  selectedMonth,
  onMonthChange,
  availableMonths,
  onOpenAddModal,
  onQuickSync,
  isQuickSyncing = false,
  settings,
  transactionCount = 0,
  overBudgetCount = 0,
}) => {
  const isPrivateSheetConfigured = Boolean(
    settings.googleClientId?.trim() && settings.googleSheetUrl?.trim()
  );

  const navItems: {
    id: NavTab;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      shortLabel: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'budgets',
      label: 'Budgets',
      shortLabel: 'Budgets',
      icon: <Target className="w-4 h-4" />,
      badge: overBudgetCount > 0 ? overBudgetCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      shortLabel: 'Charts',
      icon: <PieChart className="w-4 h-4" />,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      shortLabel: 'Ledger',
      icon: <ReceiptText className="w-4 h-4" />,
      badge: transactionCount > 0 ? transactionCount : undefined,
      badgeColor: 'bg-slate-700/80 text-slate-300 border-slate-600',
    },
    {
      id: 'settings',
      label: 'Sync & Settings',
      shortLabel: 'Sync',
      icon: <Settings2 className="w-4 h-4" />,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-slate-900/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar: Brand, Desktop Navigation, Global Controls */}
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Brand */}
            <div
              onClick={() => onTabChange('overview')}
              className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
                  FinanceFlow
                </h1>
                <span className="text-[11px] text-slate-400 hidden sm:inline-block">
                  Household Budget PWA
                </span>
              </div>
            </div>

            {/* Desktop Primary Navigation (Center) */}
            <nav
              aria-label="Main Navigation"
              className="hidden md:flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800"
            >
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition relative ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full border font-bold ${
                          isActive
                            ? 'bg-white/20 text-white border-white/30'
                            : item.badgeColor
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Global Controls: Month Filter, Quick Sync, Add Transaction */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Global Timeframe Selector */}
              <select
                value={selectedMonth}
                onChange={(e) => onMonthChange(e.target.value)}
                aria-label="Select Month"
                className="bg-slate-800/90 text-slate-200 text-xs sm:text-sm border border-slate-700 rounded-xl px-2.5 sm:px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium"
              >
                <option value="ALL">All Time</option>
                {availableMonths.map((m) => {
                  const [year, month] = m.split('-');
                  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                  const label = date.toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  });
                  return (
                    <option key={m} value={m}>
                      {label}
                    </option>
                  );
                })}
              </select>

              {/* 1-Click Quick Sync Button (when Google Sheet configured) */}
              {isPrivateSheetConfigured && onQuickSync && (
                <button
                  onClick={onQuickSync}
                  disabled={isQuickSyncing}
                  title="Synchroniser directement depuis votre feuille Google Sheet privée"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-emerald-400 ${
                      isQuickSyncing ? 'animate-spin' : ''
                    }`}
                  />
                  <span className="hidden lg:inline">
                    {isQuickSyncing ? 'Synchro...' : 'Sync Sheet'}
                  </span>
                </button>
              )}

              {/* Primary CTA: Log Transaction */}
              <button
                onClick={onOpenAddModal}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition"
                title="Add Transaction"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Entry</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile & Small Tablet Bottom Navigation Bar (PWA Native Style) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition relative min-w-[60px] ${
                isActive
                  ? 'text-indigo-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition ${
                  isActive ? 'bg-indigo-500/15 text-indigo-400' : ''
                }`}
              >
                {item.icon}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.shortLabel}</span>
              {item.badge !== undefined && (
                <span
                  className={`absolute top-0.5 right-1.5 text-[9px] px-1 min-w-[16px] h-4 flex items-center justify-center rounded-full font-bold border ${
                    item.id === 'budgets'
                      ? 'bg-rose-500 text-white border-slate-900'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
