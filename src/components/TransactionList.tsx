import React, { useState, useMemo, useEffect } from 'react';
import type { Transaction, UserSettings } from '../types/finance';
import { MASTER_CATEGORIES } from '../data/categories';
import {
  Search,
  Trash2,
  Calendar,
  CreditCard,
  User,
  Layers,
  RotateCcw,
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  settings: UserSettings;
  onDeleteTransaction: (id: string) => void;
  externalCategoryFilter?: string | null;
  onClearExternalFilter?: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  settings,
  onDeleteTransaction,
  externalCategoryFilter,
  onClearExternalFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMasterCat, setFilterMasterCat] = useState<string>('ALL');
  const [filterOwner, setFilterOwner] = useState<string>('ALL');
  const [filterAccount, setFilterAccount] = useState<string>('ALL');
  const [filterFlow, setFilterFlow] = useState<'ALL' | 'EXPENSE' | 'INFLOW'>('ALL');

  useEffect(() => {
    if (externalCategoryFilter) {
      setFilterMasterCat(externalCategoryFilter);
    }
  }, [externalCategoryFilter]);

  // Unique accounts
  const availableAccounts = useMemo(() => {
    const accs = new Set<string>();
    transactions.forEach((t) => {
      if (t.account) accs.add(t.account);
    });
    return Array.from(accs).sort();
  }, [transactions]);

  // Unique owners
  const availableOwners = useMemo(() => {
    const owners = new Set<string>();
    transactions.forEach((t) => {
      if (t.owner) owners.add(t.owner);
    });
    return Array.from(owners).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.masterCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.subCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.account.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMasterCat =
        filterMasterCat === 'ALL' || t.masterCategory === filterMasterCat;

      const matchesOwner = filterOwner === 'ALL' || t.owner === filterOwner;

      const matchesAccount = filterAccount === 'ALL' || t.account === filterAccount;

      const matchesFlow =
        filterFlow === 'ALL' ||
        (filterFlow === 'EXPENSE' && t.debit > 0) ||
        (filterFlow === 'INFLOW' && t.credit > 0);

      return (
        matchesSearch &&
        matchesMasterCat &&
        matchesOwner &&
        matchesAccount &&
        matchesFlow
      );
    });
  }, [transactions, searchTerm, filterMasterCat, filterOwner, filterAccount, filterFlow]);

  const filteredStats = useMemo(() => {
    let debits = 0;
    let credits = 0;
    filtered.forEach((t) => {
      if (t.subCategory !== 'Internal Transfer') {
        debits += t.debit || 0;
        credits += t.credit || 0;
      }
    });
    return {
      debits,
      credits,
      net: credits - debits,
    };
  }, [filtered]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    filterMasterCat !== 'ALL' ||
    filterOwner !== 'ALL' ||
    filterAccount !== 'ALL' ||
    filterFlow !== 'ALL';

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterMasterCat('ALL');
    setFilterOwner('ALL');
    setFilterAccount('ALL');
    setFilterFlow('ALL');
    if (onClearExternalFilter) onClearExternalFilter();
  };

  const getMasterCategoryColor = (name: string) => {
    return MASTER_CATEGORIES.find((m) => m.name === name)?.color || '#64748b';
  };

  const formatCurrency = (val: number) =>
    `${settings.currency}${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="space-y-4">
      {/* Filtered Totals Summary Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5">
          <div className="text-[11px] uppercase font-semibold tracking-wider text-slate-400">
            Filtered Outflows
          </div>
          <div className="text-base sm:text-xl font-bold text-white mt-0.5">
            {formatCurrency(filteredStats.debits)}
          </div>
        </div>
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5">
          <div className="text-[11px] uppercase font-semibold tracking-wider text-slate-400">
            Filtered Inflows
          </div>
          <div className="text-base sm:text-xl font-bold text-emerald-400 mt-0.5">
            {formatCurrency(filteredStats.credits)}
          </div>
        </div>
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5">
          <div className="text-[11px] uppercase font-semibold tracking-wider text-slate-400">
            Filtered Net
          </div>
          <div
            className={`text-base sm:text-xl font-bold mt-0.5 ${
              filteredStats.net >= 0 ? 'text-indigo-400' : 'text-rose-400'
            }`}
          >
            {filteredStats.net >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(filteredStats.net))}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-sm">
        {/* Header and Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Transaction Register
            </h2>
            <p className="text-xs text-slate-400">
              Showing {filtered.length} of {transactions.length} items
              {filterMasterCat !== 'ALL' && (
                <span className="ml-1.5 text-indigo-400 font-semibold">
                  • Filtered by {filterMasterCat}
                </span>
              )}
            </p>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search description, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Flow Filter (All / Debit / Credit) */}
            <select
              value={filterFlow}
              onChange={(e) => setFilterFlow(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Flows</option>
              <option value="EXPENSE">Debit (Expenses)</option>
              <option value="INFLOW">Credit (Inflows)</option>
            </select>

            {/* Master Category Filter */}
            <select
              value={filterMasterCat}
              onChange={(e) => {
                setFilterMasterCat(e.target.value);
                if (onClearExternalFilter && e.target.value === 'ALL') {
                  onClearExternalFilter();
                }
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {MASTER_CATEGORIES.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* Owner Filter */}
            <select
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Owners</option>
              {availableOwners.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>

            {/* Account Filter */}
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Accounts</option>
              {availableAccounts.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition"
                title="Clear all active filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Transactions List */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm space-y-2">
            <p>No matching transactions found.</p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline"
              >
                Clear active filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => {
              const isCredit = t.credit > 0;
              const catColor = getMasterCategoryColor(t.masterCategory);

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-2.5 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: catColor }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {t.description}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {t.date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                          <User className="w-2.5 h-2.5 text-indigo-400" />
                          {t.owner}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          <CreditCard className="w-2.5 h-2.5 text-emerald-400" />
                          {t.account}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-200 font-medium">
                          <Layers className="w-2.5 h-2.5 text-slate-400" />
                          {t.masterCategory} <span className="text-slate-500">&gt;</span>{' '}
                          {t.subCategory}
                        </span>
                        {t.confidence && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-500">
                            {t.confidence}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span
                      className={`text-sm sm:text-base font-bold ${
                        isCredit ? 'text-emerald-400' : 'text-slate-100'
                      }`}
                    >
                      {isCredit ? '+' : '-'}
                      {settings.currency}
                      {(isCredit ? t.credit : t.debit).toFixed(2)}
                    </span>
                    <button
                      onClick={() => onDeleteTransaction(t.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
