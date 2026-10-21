export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  owner: string; // Owner (e.g. Partner 1, Partner 2, Joint)
  account: string; // Account (e.g. Chequing, Visa, Amex)
  masterCategory: string; // Master Category
  subCategory: string; // Sub Category
  debit: number; // Debit (expenses)
  credit: number; // Credit (income / refunds)
  amount: number; // Net magnitude
  type: TransactionType;
  confidence?: string;
  notes?: string;
}

export interface MasterCategoryDef {
  name: string;
  type: 'expense' | 'income' | 'savings' | 'transfer' | 'other';
  color: string;
  subCategories: string[];
}

export interface CategoryBudget {
  category: string; // Master Category name
  limit: number;
  color: string;
}

export interface UserSettings {
  currency: string;
  user1Name: string;
  user2Name: string;
  googleSheetUrl?: string;
  autoSyncInterval?: number;
}
