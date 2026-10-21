// Google Identity Services & Google Sheets API v4 (Read-Only) client helper

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const SHEETS_READONLY_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const TOKEN_STORAGE_KEY = 'budget_pwa_google_oauth_token';

interface StoredToken {
  accessToken: string;
  expiresAt: number; // epoch ms
  clientId: string;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: {
              access_token?: string;
              expires_in?: number;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

let gisLoadPromise: Promise<void> | null = null;

/**
 * Dynamically loads the Google Identity Services script if not already loaded.
 */
export function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  if (gisLoadPromise) {
    return gisLoadPromise;
  }

  gisLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Impossible de charger le script Google Identity Services.'))
      );
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoadPromise = null;
      reject(new Error('Impossible de charger le script Google Identity Services (vérifiez votre connexion).'));
    };
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

/**
 * Returns a valid cached access token for the given clientId if still valid.
 */
export function getCachedAccessToken(clientId?: string): string | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed: StoredToken = JSON.parse(raw);
    if (clientId && parsed.clientId !== clientId.trim()) {
      return null;
    }
    // Check if token expires in more than 60 seconds
    if (Date.now() + 60_000 < parsed.expiresAt) {
      return parsed.accessToken;
    }
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

/**
 * Saves the OAuth access token in sessionStorage for the duration of its validity (~1 hour).
 */
function saveAccessToken(accessToken: string, expiresInSeconds: number, clientId: string): void {
  try {
    const data: StoredToken = {
      accessToken,
      expiresAt: Date.now() + expiresInSeconds * 1000,
      clientId: clientId.trim(),
    };
    sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clears and revokes the stored Google OAuth token.
 */
export function disconnectGoogleAccount(): void {
  try {
    const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    if (raw) {
      const parsed: StoredToken = JSON.parse(raw);
      if (parsed.accessToken && window.google?.accounts?.oauth2?.revoke) {
        window.google.accounts.oauth2.revoke(parsed.accessToken, () => {});
      }
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Requests a Google OAuth 2.0 Access Token with `spreadsheets.readonly` scope.
 * Uses cached token if valid unless forcePrompt is true.
 */
export async function getGoogleAccessToken(
  clientId: string,
  forcePrompt = false
): Promise<string> {
  const cleanClientId = clientId.trim();
  if (!cleanClientId) {
    throw new Error('Veuillez renseigner votre Google OAuth Client ID.');
  }

  if (!forcePrompt) {
    const cached = getCachedAccessToken(cleanClientId);
    if (cached) {
      return cached;
    }
  }

  await loadGoogleIdentityScript();

  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error('Google Identity Services non disponible dans ce navigateur.');
  }

  return new Promise<string>((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: cleanClientId,
      scope: SHEETS_READONLY_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ||
                response.error ||
                'Autorisation Google refusée ou annulée.'
            )
          );
          return;
        }
        saveAccessToken(
          response.access_token,
          response.expires_in || 3599,
          cleanClientId
        );
        resolve(response.access_token);
      },
      error_callback: (err) => {
        if (err?.type === 'popup_closed') {
          reject(new Error('La fenêtre de connexion Google a été fermée.'));
        } else if (err?.type === 'popup_failed_to_open') {
          reject(new Error('Le popup Google a été bloqué par le navigateur. Veuillez autoriser les popups.'));
        } else {
          reject(new Error(err?.message || 'Erreur lors de l’ouverture de la connexion Google.'));
        }
      },
    });

    tokenClient.requestAccessToken({
      prompt: forcePrompt ? 'consent' : '',
    });
  });
}

/**
 * Extracts the Spreadsheet ID from either a full Google Sheets URL or a direct ID string.
 */
export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Match /spreadsheets/d/{ID}
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // Or if user pasted raw spreadsheet ID directly
  if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Fetches the list of sheet/tab titles in a private spreadsheet using Google Sheets API v4.
 */
export async function fetchSpreadsheetTabs(
  spreadsheetId: string,
  accessToken: string
): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}?fields=sheets.properties.title`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      throw new Error(
        `Accès refusé (${res.status}). Vérifiez que votre compte Google a accès à cette feuille et que l'API Google Sheets est activée dans votre projet Google Cloud.`
      );
    }
    const errBody = await res.json().catch(() => ({}));
    const msg = errBody?.error?.message || `${res.status} ${res.statusText}`;
    throw new Error(`Erreur Google Sheets API : ${msg}`);
  }

  const data = await res.json();
  const titles: string[] =
    data?.sheets
      ?.map((s: any) => s?.properties?.title)
      .filter((t: any): t is string => typeof t === 'string' && t.length > 0) || [];

  return titles;
}

/**
 * Fetches raw 2D cell values from a private Google Sheet using OAuth 2.0 Bearer token.
 * If tabName is omitted, reads the first visible sheet automatically.
 */
export async function fetchPrivateSheetValues(
  spreadsheetId: string,
  tabName: string | undefined,
  accessToken: string
): Promise<{ values: string[][]; resolvedTabName: string }> {
  let targetTab = tabName?.trim() || '';

  // If no tab name is specified, fetch the spreadsheet metadata to find the first tab name
  if (!targetTab) {
    const tabs = await fetchSpreadsheetTabs(spreadsheetId, accessToken);
    if (tabs.length === 0) {
      throw new Error('Aucun onglet trouvé dans cette feuille Google Sheets.');
    }
    targetTab = tabs[0];
  }

  // Escape single quotes in tab name for A1 notation
  const escapedTab = `'${targetTab.replace(/'/g, "''")}'!A1:Z5000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(escapedTab)}?valueRenderOption=FORMATTED_VALUE`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      throw new Error('Session Google expirée. Veuillez cliquer à nouveau pour vous reconnecter.');
    }
    const errBody = await res.json().catch(() => ({}));
    const msg = errBody?.error?.message || `${res.status} ${res.statusText}`;
    throw new Error(`Impossible de lire l'onglet "${targetTab}" : ${msg}`);
  }

  const data = await res.json();
  const values: string[][] = Array.isArray(data?.values) ? data.values : [];

  return { values, resolvedTabName: targetTab };
}
