import React, { useState } from 'react';
import { X, PlusCircle } from 'lucide-react';
import type { Transaction, UserSettings } from '../types/finance';
import { MASTER_CATEGORIES } from '../data/categories';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Transaction) => void;
  settings: UserSettings;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
  settings,
}) => {
  const [flow, setFlow] = useState<'debit' | 'credit'>('debit');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [owner, setOwner] = useState<string>('Joint');
  const [account, setAccount] = useState('Chequing');
  const [masterCategory, setMasterCategory] = useState(MASTER_CATEGORIES[0].name);
  const [subCategory, setSubCategory] = useState(MASTER_CATEGORIES[0].subCategories[0]);

  if (!isOpen) return null;

  // Selected master category definition
  const currentMasterDef = MASTER_CATEGORIES.find((m) => m.name === masterCategory) || MASTER_CATEGORIES[0];

  const handleMasterChange = (newMaster: string) => {
    setMasterCategory(newMaster);
    const def = MASTER_CATEGORIES.find((m) => m.name === newMaster);
    if (def && def.subCategories.length > 0) {
      setSubCategory(def.subCategories[0]);
    }
    // Auto-switch flow if Income & Transfers is chosen
    if (newMaster === 'Income & Transfers') {
      setFlow('credit');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const debit = flow === 'debit' ? parsedAmount : 0;
    const credit = flow === 'credit' ? parsedAmount : 0;

    const newTx: Transaction = {
      id: `manual-${Date.now()}`,
      date,
      description: description.trim() || 'Transaction',
      owner,
      account: account.trim() || 'Chequing',
      masterCategory,
      subCategory,
      debit,
      credit,
      amount: parsedAmount,
      type: flow === 'credit' ? 'income' : 'expense',
      confidence: 'manual',
    };

    onAddTransaction(newTx);
    onClose();

    // Reset
    setDescription('');
    setAmount('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Log Transaction</h3>
            <p className="text-xs text-slate-400">Add an expense or income entry</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Flow Type Toggle (Debit vs Credit) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setFlow('debit')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                flow === 'debit'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Debit (Expense)
            </button>
            <button
              type="button"
              onClick={() => setFlow('credit')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                flow === 'credit'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Credit (Inflow/Refund)
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Amount ({settings.currency} CAD)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                {settings.currency}
              </span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-2 text-lg font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Description
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Costco, Hydro, Salary deposit"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Master Category & Sub Category */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Master Category
              </label>
              <select
                value={masterCategory}
                onChange={(e) => handleMasterChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {MASTER_CATEGORIES.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Sub Category
              </label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {currentMasterDef.subCategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Owner & Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Owner
              </label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Joint">Joint</option>
                <option value={settings.user1Name}>{settings.user1Name}</option>
                <option value={settings.user2Name}>{settings.user2Name}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Account
              </label>
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="e.g. Visa, Chequing"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition"
            >
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
