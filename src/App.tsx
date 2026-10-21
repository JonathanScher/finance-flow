import { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { ChartsView } from './components/ChartsView';
import { BudgetProgress } from './components/BudgetProgress';
import { TransactionList } from './components/TransactionList';
import { AddTransactionModal } from './components/AddTransactionModal';
import { ImportExportModal } from './components/ImportExportModal';
import {
  loadBudgets,
  loadSettings,
  loadTransactions,
  saveBudgets,
  saveSettings,
  saveTransactions,
} from './utils/storage';
import type { CategoryBudget, Transaction, UserSettings } from './types/finance';
import { Smartphone } from 'lucide-react';

export function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [settings, setSettings] = useState<UserSettings>(loadSettings());
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);

  // PWA Install prompt event
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Initial Load
  useEffect(() => {
    const loadedTx = loadTransactions();
    const loadedB = loadBudgets();
    const loadedS = loadSettings();
    setTransactions(loadedTx);
    setBudgets(loadedB);
    setSettings(loadedS);

    if (loadedTx.length > 0) {
      const latestMonth = loadedTx
        .map((t) => t.date.slice(0, 7))
        .sort()
        .reverse()[0];
      if (latestMonth) {
        setSelectedMonth(latestMonth);
      }
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        months.add(t.date.slice(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (selectedMonth === 'ALL') return transactions;
    return transactions.filter((t) => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const handleAddTransaction = (newTx: Transaction) => {
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    saveTransactions(updated);
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    saveTransactions(updated);
  };

  const handleUpdateBudgets = (newBudgets: CategoryBudget[]) => {
    setBudgets(newBudgets);
    saveBudgets(newBudgets);
  };

  const handleImportTransactions = (imported: Transaction[], replace: boolean) => {
    const updated = replace ? imported : [...imported, ...transactions];
    setTransactions(updated);
    saveTransactions(updated);
    if (imported.length > 0) {
      const latestMonth = imported
        .map((t) => t.date.slice(0, 7))
        .sort()
        .reverse()[0];
      if (latestMonth) setSelectedMonth(latestMonth);
    }
  };

  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        availableMonths={availableMonths}
        onOpenAddModal={() => setIsAddOpen(true)}
        onOpenSyncModal={() => setIsSyncOpen(true)}
        settings={settings}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* PWA Banner if installable */}
        {deferredPrompt && (
          <div className="bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/40 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Install on Home Screen</h4>
                <p className="text-xs text-slate-300">
                  Add this PWA to your mobile device for one-tap offline access.
                </p>
              </div>
            </div>
            <button
              onClick={handleInstallApp}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition shadow"
            >
              Install App
            </button>
          </div>
        )}

        {/* 1. Summary KPI Cards (Income, Outflow, Net Cashflow, Owner Split) */}
        <SummaryCards
          transactions={filteredTransactions}
          budgets={budgets}
          settings={settings}
        />

        {/* 2. Visual Analytics (Master Categories & Sub-Category Drilldown) */}
        <ChartsView
          transactions={filteredTransactions}
          budgets={budgets}
          settings={settings}
        />

        {/* 3. Budget Limits vs Spending Progress */}
        <BudgetProgress
          budgets={budgets}
          transactions={filteredTransactions}
          settings={settings}
          onUpdateBudget={handleUpdateBudgets}
        />

        {/* 4. Filterable Transaction Register */}
        <TransactionList
          transactions={filteredTransactions}
          settings={settings}
          onDeleteTransaction={handleDeleteTransaction}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>FinanceFlow PWA • CAD ($) • Synced with Google Sheets</p>
      </footer>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddTransaction={handleAddTransaction}
        settings={settings}
      />

      <ImportExportModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
        transactions={transactions}
        onImportTransactions={handleImportTransactions}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}

export default App;
