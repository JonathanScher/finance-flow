import type { MasterCategoryDef, CategoryBudget, UserSettings } from '../types/finance';

export const MASTER_CATEGORIES: MasterCategoryDef[] = [
  {
    name: 'Housing & Utilities',
    type: 'expense',
    color: '#6366f1', // Indigo
    subCategories: [
      'Rent / Mortgage',
      'Property Tax',
      'Home / Tenant Insurance',
      'Electricity / Gas',
      'Water / Municipal Services',
      'Internet / Home Telecom',
      'Home Maintenance & Repairs',
    ],
  },
  {
    name: 'Transportation',
    type: 'expense',
    color: '#3b82f6', // Blue
    subCategories: [
      'Auto Payment / Lease',
      'Auto Insurance',
      'Fuel / Charging',
      'Public Transit / Rideshare',
      'Maintenance & Repairs',
      'Parking & Tolls',
    ],
  },
  {
    name: 'Essential Living',
    type: 'expense',
    color: '#10b981', // Emerald
    subCategories: [
      'Groceries',
      'Healthcare & Pharmacy',
      'Health & Dental Insurance',
      'Childcare & Education',
      'Personal Care & Hygiene',
    ],
  },
  {
    name: 'Discretionary',
    type: 'expense',
    color: '#f59e0b', // Amber
    subCategories: [
      'Dining Out & Cafes',
      'Entertainment & Hobbies',
      'Subscriptions & Streaming',
      'Shopping & Apparel',
      'Electronics & Tech',
      'Travel & Vacations',
    ],
  },
  {
    name: 'Financial Goals',
    type: 'savings',
    color: '#8b5cf6', // Violet
    subCategories: [
      'Emergency Fund',
      'Retirement Investments',
      'Tax-Advantaged Accounts',
      'High-Yield Savings',
      'Debt Repayment (Principal)',
    ],
  },
  {
    name: 'Sinking Funds',
    type: 'expense',
    color: '#ec4899', // Pink
    subCategories: [
      'Annual / Periodic Fees',
      'Gifts & Celebrations',
      'Major Household Purchases',
    ],
  },
  {
    name: 'Income & Transfers',
    type: 'income',
    color: '#14b8a6', // Teal
    subCategories: [
      'Primary Income',
      'Secondary / Side Income',
      'Investment Returns',
      'Internal Transfer',
      'Reimbursement / Refund',
    ],
  },
  {
    name: 'Other',
    type: 'other',
    color: '#64748b', // Slate
    subCategories: ['Unknown'],
  },
];

export const DEFAULT_BUDGETS: CategoryBudget[] = [
  { category: 'Housing & Utilities', limit: 2600, color: '#6366f1' },
  { category: 'Transportation', limit: 650, color: '#3b82f6' },
  { category: 'Essential Living', limit: 1100, color: '#10b981' },
  { category: 'Discretionary', limit: 750, color: '#f59e0b' },
  { category: 'Financial Goals', limit: 1200, color: '#8b5cf6' },
  { category: 'Sinking Funds', limit: 400, color: '#ec4899' },
  { category: 'Other', limit: 100, color: '#64748b' },
];

export const DEFAULT_SETTINGS: UserSettings = {
  currency: '$', // CAD $
  user1Name: 'Me',
  user2Name: 'Wife',
  googleSheetUrl: '',
};
