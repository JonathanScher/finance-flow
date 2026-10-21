# FinanceFlow - Personal & Household Finance PWA

A Progressive Web App (PWA) designed to visualize personal and household finances, manage monthly budgets, and sync with your Google Spreadsheet data.

---

## 🚀 Live Development Server

- **Local (on your computer):** [http://localhost:5173/](http://localhost:5173/)
- **Network (on your phone / tablet):** [http://192.168.0.12:5173/](http://192.168.0.12:5173/)

---

## ✨ Features

1. **Dashboard & KPIs**:
   - Total spent in selected month/period
   - Budget target limit & remaining safe margin
   - Payer split (e.g., Me vs. Wife vs. Joint)
   - Monthly cycle breakdown

2. **Visual Analytics**:
   - **Category Share**: Interactive Donut chart displaying spending percentage by category.
   - **Budget vs. Actual**: Bar chart highlighting over-budget vs within-budget categories.

3. **Category Budget Limits**:
   - Real-time progress bars with color warnings (green < 80%, yellow 80-100%, red > 100%).
   - Click the pencil icon next to any category to adjust its monthly limit on the fly.

4. **Transaction Register & Quick Add**:
   - Search by merchant or keyword.
   - Filter by category and payer.
   - Mobile-first "Log Expense" modal to capture expenses quickly.

5. **Google Sheets Sync**:
   - **Live Sync**: Publish your Google Sheet as a CSV web link and auto-sync updates.
   - **CSV File Import**: Download CSV from Google Sheets (`File -> Download -> Comma-separated values .csv`) and drag-and-drop.
   - **CSV Export**: Export all transactions formatted back to standard spreadsheet CSV.

---

## 📱 Installing on Your Phone (PWA)

### iPhone / iPad (Safari)
1. Open `http://192.168.0.12:5173/` in Safari on your phone (make sure you are connected to the same Wi-Fi).
2. Tap the **Share** button (box with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**.

### Android (Chrome)
1. Open `http://192.168.0.12:5173/` in Chrome.
2. Tap the three dots menu in the top right.
3. Tap **Install app** or **Add to Home Screen**.

---

## 🛠️ Project Structure

- `src/App.tsx`: Main application container, state coordination, and PWA prompt.
- `src/components/Header.tsx`: Navigation bar, period selector, and action buttons.
- `src/components/SummaryCards.tsx`: Household KPI cards.
- `src/components/ChartsView.tsx`: Donut and bar charts powered by Recharts.
- `src/components/BudgetProgress.tsx`: Category spending health indicators.
- `src/components/TransactionList.tsx`: Filterable, searchable transaction log.
- `src/components/AddTransactionModal.tsx`: Expense logger dialog.
- `src/components/ImportExportModal.tsx`: Google Sheets live link sync and CSV tools.
- `src/utils/csvParser.ts`: Tolerant parser for Google Sheet CSV exports.
- `src/utils/storage.ts`: Local persistence with localStorage.
