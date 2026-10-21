import Papa from 'papaparse';
import type { Transaction, TransactionType } from '../types/finance';

export interface CSVParseResult {
  transactions: Transaction[];
  errors: string[];
}

export function parseGoogleSheetCSV(csvText: string): CSVParseResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const transactions: Transaction[] = [];
  const errors: string[] = [];

  if (result.errors.length > 0) {
    result.errors.forEach((err) => errors.push(`Row ${err.row}: ${err.message}`));
  }

  const cleanNum = (val: string | undefined): number => {
    if (!val) return 0;
    const cleaned = val.replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.abs(num);
  };

  result.data.forEach((row, index) => {
    // 1. Column matching
    const ownerKey = Object.keys(row).find((k) => /^(owner|who|person|payer)/i.test(k));
    const accountKey = Object.keys(row).find((k) => /^(account|bank|card)/i.test(k));
    const dateKey = Object.keys(row).find((k) => /^(date|timestamp|day)/i.test(k));
    const descKey = Object.keys(row).find((k) => /^(description|desc|item|merchant|payee)/i.test(k));
    const creditKey = Object.keys(row).find((k) => /^(credit|income|inflow|deposit)/i.test(k));
    const debitKey = Object.keys(row).find((k) => /^(debit|expense|outflow|spent|amount)/i.test(k));
    const masterCatKey = Object.keys(row).find((k) => /^(master\s*category|master_cat|category)/i.test(k));
    const subCatKey = Object.keys(row).find((k) => /^(sub\s*category|sub_cat|subcategory|sub-category)/i.test(k));
    const confidenceKey = Object.keys(row).find((k) => /^(confidence|conf)/i.test(k));

    const debit = cleanNum(debitKey ? row[debitKey] : '');
    const credit = cleanNum(creditKey ? row[creditKey] : '');

    // Skip rows where neither debit nor credit is recorded
    if (debit === 0 && credit === 0) {
      return;
    }

    const rawDate = dateKey ? row[dateKey]?.trim() : '';
    let formattedDate = rawDate;
    const parsedDate = new Date(rawDate);
    if (!isNaN(parsedDate.getTime())) {
      formattedDate = parsedDate.toISOString().split('T')[0];
    }

    const masterCategory = masterCatKey && row[masterCatKey]?.trim()
      ? row[masterCatKey].trim()
      : (credit > 0 ? 'Income & Transfers' : 'Other');

    const subCategory = subCatKey && row[subCatKey]?.trim()
      ? row[subCatKey].trim()
      : 'Unknown';

    // Determine type
    let type: TransactionType = 'expense';
    if (masterCategory.toLowerCase().includes('income') || credit > 0) {
      type = 'income';
    } else if (masterCategory.toLowerCase().includes('goals') || subCategory.toLowerCase().includes('transfer')) {
      type = 'transfer';
    }

    const amount = debit > 0 ? debit : credit;

    transactions.push({
      id: `csv-${Date.now()}-${index}`,
      date: formattedDate || new Date().toISOString().split('T')[0],
      owner: ownerKey && row[ownerKey]?.trim() ? row[ownerKey].trim() : 'Joint',
      account: accountKey && row[accountKey]?.trim() ? row[accountKey].trim() : 'Chequing',
      description: descKey && row[descKey]?.trim() ? row[descKey].trim() : 'Transaction',
      masterCategory,
      subCategory,
      debit,
      credit,
      amount,
      type,
      confidence: confidenceKey ? row[confidenceKey]?.trim() : 'manual',
    });
  });

  return { transactions, errors };
}

/**
 * Converts a 2D array of values from Google Sheets API v4 (spreadsheets.values.get)
 * into Transactions, automatically finding the header row even if there are title rows above it.
 */
export function parseGoogleSheetValues(values: string[][]): CSVParseResult {
  if (!values || values.length < 2) {
    return { transactions: [], errors: ['La feuille semble vide ou ne contient aucune ligne de données.'] };
  }

  // Find the header row (first row containing at least 2 recognizable column names)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(values.length, 15); i++) {
    const row = values[i].map((cell) => (cell || '').toString().trim());
    const matches = row.filter((col) =>
      /^(owner|who|person|payer|account|bank|card|date|timestamp|day|description|desc|item|merchant|payee|credit|income|inflow|deposit|debit|expense|outflow|spent|amount|master\s*category|master_cat|category|sub\s*category|sub_cat|subcategory)/i.test(
        col
      )
    );
    if (matches.length >= 2) {
      headerRowIndex = i;
      break;
    }
  }

  const relevantRows = values.slice(headerRowIndex);
  const csvString = Papa.unparse(relevantRows);
  return parseGoogleSheetCSV(csvString);
}

export function exportTransactionsToCSV(transactions: Transaction[]): string {
  const exportData = transactions.map((t) => ({
    Owner: t.owner,
    Account: t.account,
    Date: t.date,
    Description: t.description,
    Credit: t.credit > 0 ? t.credit.toFixed(2) : '',
    Debit: t.debit > 0 ? t.debit.toFixed(2) : '',
    'Master Category': t.masterCategory,
    'Sub Category': t.subCategory,
    confidence: t.confidence || 'manual',
  }));

  return Papa.unparse(exportData);
}
