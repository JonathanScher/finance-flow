import React, { useState } from 'react';
import { X, Upload, Download, RefreshCw, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import type { Transaction, UserSettings } from '../types/finance';
import { parseGoogleSheetCSV, exportTransactionsToCSV } from '../utils/csvParser';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onImportTransactions: (newTransactions: Transaction[], replace: boolean) => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onImportTransactions,
  settings,
  onUpdateSettings,
}) => {
  const [tab, setTab] = useState<'sheet' | 'csv' | 'settings'>('sheet');
  const [sheetUrl, setSheetUrl] = useState(settings.googleSheetUrl || '');
  const [currency, setCurrency] = useState(settings.currency || '$');
  const [user1, setUser1] = useState(settings.user1Name || 'Me');
  const [user2, setUser2] = useState(settings.user2Name || 'Wife');

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const { transactions: parsed, errors } = parseGoogleSheetCSV(text);
      if (parsed.length > 0) {
        onImportTransactions(parsed, false);
        setStatusMessage({
          type: 'success',
          text: `Successfully imported ${parsed.length} transactions!`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: errors.length > 0 ? errors[0] : 'No valid transactions found in file.',
        });
      }
    };
    reader.readAsText(file);
  };

  // Handle Live Fetch from Published Google Sheet
  const handleSyncFromSheetUrl = async () => {
    if (!sheetUrl.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid Google Sheets URL.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      let fetchUrl = sheetUrl.trim();
      const match = fetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        fetchUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
      }

      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch sheet (${res.status} ${res.statusText})`);
      }

      const csvData = await res.text();
      const { transactions: parsed, errors } = parseGoogleSheetCSV(csvData);

      if (parsed.length > 0) {
        onImportTransactions(parsed, true);
        const updatedSettings = { ...settings, googleSheetUrl: sheetUrl };
        onUpdateSettings(updatedSettings);
        setStatusMessage({
          type: 'success',
          text: `Successfully synced ${parsed.length} transactions from Google Sheets!`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: errors.length > 0 ? errors[0] : 'Sheet responded, but no rows could be parsed.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Sync error: ${err.message}. Make sure your sheet is set to 'Anyone with the link can view' or published to the web.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Export to CSV
  const handleDownloadCSV = () => {
    const csv = exportTransactionsToCSV(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `finances_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Settings
  const handleSaveSettings = () => {
    onUpdateSettings({
      ...settings,
      currency,
      user1Name: user1,
      user2Name: user2,
    });
    setStatusMessage({ type: 'success', text: 'Settings saved successfully!' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white">Google Sheets & Data Settings</h3>
          <p className="text-xs text-slate-400">Import, sync live or configure household parameters</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 mb-4">
          <button
            onClick={() => { setTab('sheet'); setStatusMessage(null); }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              tab === 'sheet'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Live Sheet Sync</span>
          </button>
          <button
            onClick={() => { setTab('csv'); setStatusMessage(null); }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              tab === 'csv'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>CSV Import/Export</span>
          </button>
          <button
            onClick={() => { setTab('settings'); setStatusMessage(null); }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              tab === 'settings'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* TAB 1: Live Google Sheet Sync */}
        {tab === 'sheet' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5 text-slate-300">
              <span className="font-semibold text-white block">How live sync works:</span>
              <p>
                1. In your Google Sheet, click <strong>File</strong> → <strong>Share</strong> → <strong>Publish to web</strong>.
              </p>
              <p>
                2. Choose <strong>Entire Document</strong> (or your expense tab) as <strong>Comma-separated values (.csv)</strong> and click <strong>Publish</strong>.
              </p>
              <p>
                3. Paste the published link or your sheet URL below:
              </p>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Google Sheet URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSyncFromSheetUrl}
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition flex items-center gap-1.5 flex-shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CSV Upload & Download */}
        {tab === 'csv' && (
          <div className="space-y-4 text-xs">
            {/* Upload File */}
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-5 text-center hover:border-indigo-500 transition">
              <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="font-medium text-slate-200 mb-1">
                Upload Google Sheets CSV Export
              </p>
              <p className="text-[11px] text-slate-400 mb-3">
                In Google Sheets, go to File → Download → Comma Separated Values (.csv)
              </p>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition">
                <span>Select .CSV File</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Export Current Data */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div>
                <span className="font-semibold text-white block">Download App Data</span>
                <span className="text-slate-400 text-[11px]">
                  Export all {transactions.length} transactions to CSV
                </span>
              </div>
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Preferences */}
        {tab === 'settings' && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Partner 1 Name
                </label>
                <input
                  type="text"
                  value={user1}
                  onChange={(e) => setUser1(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Partner 2 Name
                </label>
                <input
                  type="text"
                  value={user2}
                  onChange={(e) => setUser2(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
            >
              Save Preferences
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
