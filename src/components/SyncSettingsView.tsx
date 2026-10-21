import React, { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Settings,
  Lock,
  HelpCircle,
  LogOut,
  ChevronDown,
  ChevronUp,
  ListFilter,
  FileSpreadsheet,
} from 'lucide-react';
import type { Transaction, UserSettings } from '../types/finance';
import {
  parseGoogleSheetCSV,
  parseGoogleSheetValues,
  exportTransactionsToCSV,
} from '../utils/csvParser';
import {
  getGoogleAccessToken,
  getCachedAccessToken,
  disconnectGoogleAccount,
  extractSpreadsheetId,
  fetchSpreadsheetTabs,
  fetchPrivateSheetValues,
} from '../utils/googleSheetsApi';

interface SyncSettingsViewProps {
  transactions: Transaction[];
  onImportTransactions: (newTransactions: Transaction[], replace: boolean) => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
}

export const SyncSettingsView: React.FC<SyncSettingsViewProps> = ({
  transactions,
  onImportTransactions,
  settings,
  onUpdateSettings,
}) => {
  // Google Private OAuth Settings
  const [clientId, setClientId] = useState(settings.googleClientId || '');
  const [sheetUrl, setSheetUrl] = useState(settings.googleSheetUrl || '');
  const [sheetTab, setSheetTab] = useState(settings.googleSheetTab || '');
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Preferences
  const [currency, setCurrency] = useState(settings.currency || '$');
  const [user1, setUser1] = useState(settings.user1Name || 'Me');
  const [user2, setUser2] = useState(settings.user2Name || 'Wife');

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    setClientId(settings.googleClientId || '');
    setSheetUrl(settings.googleSheetUrl || '');
    setSheetTab(settings.googleSheetTab || '');
    setCurrency(settings.currency || '$');
    setUser1(settings.user1Name || 'Me');
    setUser2(settings.user2Name || 'Wife');
    const token = getCachedAccessToken(settings.googleClientId);
    setIsConnected(Boolean(token));
  }, [settings]);

  const handleLoadTabs = async () => {
    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    if (!spreadsheetId) {
      setStatusMessage({
        type: 'error',
        text: 'Veuillez entrer une URL ou un ID Google Sheets valide.',
      });
      return;
    }
    if (!clientId.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Veuillez renseigner votre Google OAuth Client ID.',
      });
      return;
    }

    setIsLoadingTabs(true);
    setStatusMessage(null);

    try {
      const token = await getGoogleAccessToken(clientId);
      setIsConnected(true);
      const tabs = await fetchSpreadsheetTabs(spreadsheetId, token);
      setAvailableTabs(tabs);
      if (tabs.length > 0 && !sheetTab) {
        setSheetTab(tabs[0]);
      }
      setStatusMessage({
        type: 'success',
        text: `${tabs.length} onglet(s) détecté(s) dans votre feuille privée !`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Impossible de charger les onglets.',
      });
    } finally {
      setIsLoadingTabs(false);
    }
  };

  const handlePrivateGoogleSync = async () => {
    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    if (!spreadsheetId) {
      setStatusMessage({
        type: 'error',
        text: 'Veuillez coller l’URL complète (ou l’ID) de votre feuille Google Sheets.',
      });
      return;
    }

    if (!clientId.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Veuillez entrer votre Google OAuth Client ID (voir le guide ci-dessous).',
      });
      setShowSetupGuide(true);
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const accessToken = await getGoogleAccessToken(clientId);
      setIsConnected(true);

      const { values, resolvedTabName } = await fetchPrivateSheetValues(
        spreadsheetId,
        sheetTab,
        accessToken
      );

      const { transactions: parsed, errors } = parseGoogleSheetValues(values);

      if (parsed.length > 0) {
        const nowIso = new Date().toISOString();
        onImportTransactions(parsed, true);
        if (!sheetTab && resolvedTabName) {
          setSheetTab(resolvedTabName);
        }
        onUpdateSettings({
          ...settings,
          googleClientId: clientId.trim(),
          googleSheetUrl: sheetUrl.trim(),
          googleSheetTab: sheetTab.trim() || resolvedTabName,
          lastSyncedAt: nowIso,
        });
        setStatusMessage({
          type: 'success',
          text: `Synchronisation réussie : ${parsed.length} transactions importées depuis l'onglet "${resolvedTabName}" !`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text:
            errors.length > 0
              ? errors[0]
              : `L'onglet "${resolvedTabName}" a été lu, mais aucune transaction valide n'a été détectée.`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Erreur lors de la synchronisation Google Sheets.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectGoogle = () => {
    disconnectGoogleAccount();
    setIsConnected(false);
    setStatusMessage({
      type: 'success',
      text: 'Session Google déconnectée.',
    });
  };

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
          text: `${parsed.length} transactions importées avec succès !`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text:
            errors.length > 0
              ? errors[0]
              : 'Aucune transaction valide trouvée dans le fichier.',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadCSV = () => {
    const csv = exportTransactionsToCSV(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `finances_export_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      currency,
      user1Name: user1,
      user2Name: user2,
    });
    setStatusMessage({ type: 'success', text: 'Préférences du foyer enregistrées !' });
  };

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

  return (
    <div className="space-y-6">
      {/* Status Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-start justify-between gap-2 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-start gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed font-medium">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column (2/3 width on desktop): Private Google Sheets OAuth 2.0 Sync */}
        <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Connexion Google Sheets Privée
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Lecture seule OAuth 2.0
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synchronisez directement votre feuille privée via votre compte Google sans jamais la publier
                </p>
              </div>
            </div>
          </div>

          {/* Connection Status Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/70 text-xs">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                    : 'bg-slate-500'
                }`}
              />
              <div>
                <span className="font-semibold text-white block">
                  {isConnected ? 'Compte Google authentifié' : 'Non connecté à Google'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {settings.lastSyncedAt
                    ? `Dernière synchro : ${new Date(settings.lastSyncedAt).toLocaleString('fr-CA')}`
                    : 'Accès direct sécurisé via Google Sheets API v4'}
                </span>
              </div>
            </div>
            {isConnected && (
              <button
                onClick={handleDisconnectGoogle}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 transition text-[11px]"
              >
                <LogOut className="w-3 h-3" />
                <span>Déconnecter</span>
              </button>
            )}
          </div>

          <div className="space-y-4 text-xs">
            {/* Step 1: OAuth Client ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-slate-300">
                  1. Google OAuth Client ID
                </label>
                <button
                  type="button"
                  onClick={() => setShowSetupGuide(!showSetupGuide)}
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Comment l'obtenir en 2 min ?</span>
                  {showSetupGuide ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>
              <input
                type="text"
                placeholder="1234567890-abcdefg.apps.googleusercontent.com"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />

              {showSetupGuide && (
                <div className="mt-2 p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-slate-300 space-y-2 text-[11px] leading-relaxed">
                  <p className="font-semibold text-indigo-300">
                    Configuration unique dans Google Cloud (100% gratuit & privé) :
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>
                      Allez sur{' '}
                      <a
                        href="https://console.cloud.google.com/apis/library/sheets.googleapis.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 underline hover:text-indigo-300"
                      >
                        Google Cloud Console (Google Sheets API)
                      </a>{' '}
                      et cliquez sur <strong>Activer (Enable)</strong>.
                    </li>
                    <li>
                      Dans <strong>APIs & Services → OAuth consent screen</strong>, choisissez{' '}
                      <em>External</em> (mode Test) et ajoutez votre adresse Gmail dans{' '}
                      <strong>Test users</strong>.
                    </li>
                    <li>
                      Dans <strong>Credentials → Create Credentials → OAuth client ID</strong> :
                      <ul className="list-disc list-inside ml-4 mt-1 text-slate-400 space-y-0.5">
                        <li>
                          Type d'application :{' '}
                          <strong className="text-slate-200">
                            Application Web (Web application)
                          </strong>
                        </li>
                        <li>
                          <strong>Origines JavaScript autorisées</strong> : ajoutez{' '}
                          <code className="px-1.5 py-0.5 rounded bg-slate-900 text-emerald-400 font-mono select-all">
                            {currentOrigin}
                          </code>
                        </li>
                      </ul>
                    </li>
                    <li>
                      Copiez le <strong>Client ID</strong> généré et collez-le ci-dessus.
                    </li>
                  </ol>
                </div>
              )}
            </div>

            {/* Step 2: Private Google Sheet URL */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                2. URL (ou ID) de votre feuille Google Sheet privée
              </label>
              <input
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Gardez votre feuille <strong>Restreinte (Privée)</strong> — aucune publication sur le Web n'est requise.
              </p>
            </div>

            {/* Step 3: Sheet Tab Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-slate-300">
                  3. Nom de l'onglet (Optionnel — 1er onglet par défaut)
                </label>
                <button
                  type="button"
                  onClick={handleLoadTabs}
                  disabled={isLoadingTabs}
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium disabled:opacity-50"
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>{isLoadingTabs ? 'Chargement...' : 'Détecter les onglets'}</span>
                </button>
              </div>

              {availableTabs.length > 0 ? (
                <select
                  value={sheetTab}
                  onChange={(e) => setSheetTab(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {availableTabs.map((tName) => (
                    <option key={tName} value={tName}>
                      {tName}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Ex: Transactions, Dépenses 2026 (laisser vide pour le 1er onglet)"
                  value={sheetTab}
                  onChange={(e) => setSheetTab(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              )}
            </div>

            {/* Action Button: Google Sign-In & Sync */}
            <button
              onClick={handlePrivateGoogleSync}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>
                {isLoading
                  ? 'Connexion & lecture de la feuille...'
                  : isConnected
                  ? 'Synchroniser maintenant depuis Google Sheets'
                  : 'Se connecter avec Google & Synchroniser'}
              </span>
            </button>
          </div>
        </div>

        {/* Right Column (1/3 width on desktop): Household Preferences + CSV Backup */}
        <div className="space-y-6">
          {/* Household Preferences Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Household Preferences
                </h3>
                <p className="text-xs text-slate-400">
                  Currency & partner labels
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Symbole de devise
                </label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Partenaire 1
                  </label>
                  <input
                    type="text"
                    value={user1}
                    onChange={(e) => setUser1(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Partenaire 2
                  </label>
                  <input
                    type="text"
                    value={user2}
                    onChange={(e) => setUser2(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-indigo-600 text-white font-semibold transition"
              >
                Enregistrer les préférences
              </button>
            </form>
          </div>

          {/* CSV Import / Export Backup Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  CSV Import / Export
                </h3>
                <p className="text-xs text-slate-400">
                  Manual backup & spreadsheet import
                </p>
              </div>
            </div>

            <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 text-center hover:border-indigo-500 transition">
              <Upload className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
              <p className="font-medium text-slate-200 mb-1">
                Importer un fichier CSV
              </p>
              <p className="text-[11px] text-slate-400 mb-2.5">
                Fichier → Télécharger → .csv
              </p>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition">
                <span>Choisir un .CSV</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
              <div>
                <span className="font-semibold text-white block">Exporter CSV</span>
                <span className="text-slate-400 text-[11px]">
                  {transactions.length} transactions
                </span>
              </div>
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
