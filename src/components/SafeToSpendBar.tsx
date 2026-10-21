import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  OctagonAlert,
  CalendarClock,
  Flame,
  Lock,
  Sparkles,
  Wallet,
  Info,
} from 'lucide-react';
import type { CategoryBudget, Transaction, UserSettings } from '../types/finance';

interface SafeToSpendBarProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
  budgets: CategoryBudget[];
  settings: UserSettings;
  selectedMonth: string;
}

// Categories that are lumpy monthly or annual/periodic obligations (not spent linearly day-by-day)
const FIXED_AND_SINKING_CATEGORIES = new Set([
  'Housing & Utilities',
  'Financial Goals',
  'Sinking Funds',
]);

// Categories that are day-to-day essential living
const ESSENTIAL_VARIABLE_CATEGORIES = new Set([
  'Essential Living',
  'Transportation',
]);

// Categories that are pure discretionary
const DISCRETIONARY_CATEGORIES = new Set([
  'Discretionary',
  'Other',
]);

export const SafeToSpendBar: React.FC<SafeToSpendBarProps> = ({
  transactions,
  allTransactions,
  budgets,
  settings,
  selectedMonth,
}) => {
  // Mode toggle: Strict Discretionary vs. All Day-to-Day Variable (Discretionary + Groceries/Transit)
  const [poolMode, setPoolMode] = useState<'discretionary' | 'variable'>('discretionary');
  const [todayDate] = useState(() => new Date());

  const formatCurrency = React.useCallback(
    (val: number, decimals = 0) => {
      const absVal = Math.abs(val);
      const formatted = absVal.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return `${val < 0 ? '-' : ''}${settings.currency}${formatted}`;
    },
    [settings.currency]
  );

  const metrics = useMemo(() => {
    const now = todayDate;
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Determine reference date based on selectedMonth
    let refDate = now;
    if (selectedMonth !== 'ALL' && selectedMonth !== currentYearMonth) {
      const [y, m] = selectedMonth.split('-').map(Number);
      // Find latest transaction date in that month, or fallback to mid/end of month
      const monthTxDates = transactions
        .map((t) => t.date)
        .filter((d) => d.startsWith(selectedMonth))
        .sort();
      if (monthTxDates.length > 0) {
        const latestStr = monthTxDates[monthTxDates.length - 1];
        const [ly, lm, ld] = latestStr.split('-').map(Number);
        refDate = new Date(ly, lm - 1, ld, 12, 0, 0);
      } else {
        refDate = new Date(y, m, 0, 12, 0, 0);
      }
    }

    const year = refDate.getFullYear();
    const monthIndex = refDate.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const dayOfMonth = refDate.getDate();
    const daysRemainingInMonth = Math.max(1, daysInMonth - dayOfMonth + 1);
    const monthElapsedPct = (dayOfMonth / daysInMonth) * 100;

    // Next Thursday calculation (Thursday = dayOfWeek 4)
    const dayOfWeek = refDate.getDay(); // 0 = Sun ... 4 = Thu ... 6 = Sat
    const rawDaysUntilThu = (4 - dayOfWeek + 7) % 7;
    // If today is Thursday, countdown to next Thursday is 7 days (full pay cycle), else 1..6 days
    const daysUntilNextThursday = rawDaysUntilThu === 0 ? 7 : rawDaysUntilThu;
    const isTodayThursday = rawDaysUntilThu === 0;

    const nextThursdayDate = new Date(refDate);
    nextThursdayDate.setDate(refDate.getDate() + daysUntilNextThursday);
    const nextThursdayLabel = nextThursdayDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    // Analyze payroll history from allTransactions to identify alternating Thursday paychecks
    const payrollTx = [...allTransactions]
      .filter(
        (t) =>
          t.credit > 0 &&
          (t.subCategory === 'Primary Income' ||
            (t.masterCategory === 'Income & Transfers' &&
              t.subCategory !== 'Internal Transfer' &&
              t.subCategory !== 'Reimbursement / Refund'))
      )
      .sort((a, b) => b.date.localeCompare(a.date));

    const lastPayroll = payrollTx[0];
    // Find distinct owners in payroll
    const payrollByOwner: Record<string, number[]> = {};
    payrollTx.forEach((t) => {
      const owner = t.owner || 'Joint';
      if (!payrollByOwner[owner]) payrollByOwner[owner] = [];
      payrollByOwner[owner].push(t.credit);
    });

    const owners = Object.keys(payrollByOwner);
    let nextPayOwner = settings.user1Name || 'Partner 1';
    let expectedNextPayAmount = 0;

    if (lastPayroll && owners.length >= 2) {
      // Alternating Thursday logic: if last payroll was owner A, next Thursday is owner B
      const otherOwner = owners.find((o) => o !== lastPayroll.owner) || lastPayroll.owner;
      nextPayOwner = otherOwner;
      const amounts = payrollByOwner[otherOwner] || [];
      expectedNextPayAmount =
        amounts.reduce((a, b) => a + b, 0) / (amounts.length || 1);
    } else if (lastPayroll) {
      nextPayOwner = lastPayroll.owner;
      expectedNextPayAmount = lastPayroll.credit;
    }

    // Expense outflows in selected timeframe (excluding internal transfers)
    const expenseTx = transactions.filter(
      (t) => t.debit > 0 && t.subCategory !== 'Internal Transfer'
    );

    const spentByCategory: Record<string, number> = {};
    expenseTx.forEach((t) => {
      spentByCategory[t.masterCategory] = (spentByCategory[t.masterCategory] || 0) + t.debit;
    });

    // Categorize budgets & spending depending on poolMode
    // Committed categories = everything NOT in the active flexible pool
    const isPoolCategory = (cat: string) => {
      if (poolMode === 'discretionary') {
        return DISCRETIONARY_CATEGORIES.has(cat);
      }
      return DISCRETIONARY_CATEGORIES.has(cat) || ESSENTIAL_VARIABLE_CATEGORIES.has(cat);
    };

    let committedSpent = 0;
    let committedReserved = 0;
    let committedOverrun = 0;

    let poolBudget = 0;
    let poolSpent = 0;

    let fixedSinkingBudget = 0;
    let fixedSinkingSpent = 0;
    let variableTotalBudget = 0;

    budgets.forEach((b) => {
      const spent = spentByCategory[b.category] || 0;

      if (FIXED_AND_SINKING_CATEGORIES.has(b.category)) {
        fixedSinkingBudget += b.limit;
        fixedSinkingSpent += spent;
      } else {
        variableTotalBudget += b.limit;
      }

      if (isPoolCategory(b.category)) {
        poolBudget += b.limit;
        poolSpent += spent;
      } else {
        committedSpent += spent;
        if (spent <= b.limit) {
          committedReserved += b.limit - spent;
        } else {
          committedOverrun += spent - b.limit;
        }
      }
    });

    // Any expenses in unbudgeted categories
    Object.entries(spentByCategory).forEach(([cat, spent]) => {
      const hasBudget = budgets.some((b) => b.category === cat);
      if (!hasBudget) {
        if (isPoolCategory(cat)) {
          poolSpent += spent;
        } else {
          committedSpent += spent;
          committedOverrun += spent;
        }
      }
    });

    const totalBudget = budgets.reduce((acc, b) => acc + b.limit, 0);
    const totalSpent = committedSpent + poolSpent;

    // Safe to spend remaining in the active pool (reduced by any overrun in committed categories)
    const rawPoolRemaining = poolBudget - poolSpent - committedOverrun;
    const safeToSpendRemaining = Math.max(0, rawPoolRemaining);
    const overBudgetAmount = rawPoolRemaining < 0 ? Math.abs(rawPoolRemaining) : 0;

    // Total bar denominator (at least totalBudget, or expanded if totalSpent + committedReserved exceeds budget)
    const barTotalCapacity = Math.max(
      totalBudget,
      committedSpent + poolSpent + committedReserved + safeToSpendRemaining,
      1
    );

    // 4 Segments of the Single Horizontal Progress Bar:
    // 1. Committed (Fixed/Essential/Goals) Spent
    // 2. Active Pool (Discretionary) Spent
    // 3. Reserved Upcoming Committed (locked for remaining monthly/yearly bills)
    // 4. Safe-to-Spend Remaining
    const segCommittedSpentPct = (committedSpent / barTotalCapacity) * 100;
    const segPoolSpentPct = (poolSpent / barTotalCapacity) * 100;
    const segReservedPct = (committedReserved / barTotalCapacity) * 100;
    const segSafeRemainingPct = (safeToSpendRemaining / barTotalCapacity) * 100;

    const actualTotalSpentPct = segCommittedSpentPct + segPoolSpentPct;

    // Burn-Rate Marker position on the bar:
    // Because fixed/sinking bills (mortgage, TFSA/RRSP, annual sinking) are lumpy and paid on specific dates,
    // expected spend to date = Fixed/Sinking already paid + (monthElapsed% of Variable/Discretionary budgets)
    //Wait: let's also compute the pure pool burn rate % so the user sees both!
    const expectedSpendToday =
      Math.min(fixedSinkingSpent, fixedSinkingBudget) +
      (dayOfMonth / daysInMonth) * variableTotalBudget;
    const burnMarkerBarPct = Math.min(
      100,
      Math.max(0, (expectedSpendToday / barTotalCapacity) * 100)
    );

    const poolUsedPct = poolBudget > 0 ? (poolSpent / poolBudget) * 100 : 0;
    // Pace delta: positive means we have burned MORE of our discretionary pool than the % of month elapsed
    const paceDeltaPct = poolUsedPct - monthElapsedPct;

    // Daily, Weekly, and Pre-Payday Safe Allowances
    const safePerDay = safeToSpendRemaining / daysRemainingInMonth;
    const daysInWindowUntilPayday = Math.min(daysUntilNextThursday, daysRemainingInMonth);
    const safeUntilNextThursday = safePerDay * daysInWindowUntilPayday;
    const safeThisWeek = safePerDay * Math.min(7, daysRemainingInMonth);

    // Decision status for "Approve or delay a discretionary purchase this week"
    let status: 'approve' | 'caution' | 'delay' = 'approve';
    let statusTitle = 'On Track — Approve Purchase';
    let statusReason = `Discretionary spend (${poolUsedPct.toFixed(0)}%) is comfortably below month elapsed (${monthElapsedPct.toFixed(0)}%).`;

    if (rawPoolRemaining <= 0 || paceDeltaPct > 12) {
      status = 'delay';
      statusTitle =
        rawPoolRemaining <= 0
          ? 'Pool Depleted — Delay Purchase'
          : 'Ahead of Burn Rate — Delay until Payday';
      statusReason =
        rawPoolRemaining <= 0
          ? `You have exceeded your ${poolMode === 'discretionary' ? 'discretionary' : 'variable'} runway by ${formatCurrency(overBudgetAmount)}.`
          : `You've used ${poolUsedPct.toFixed(0)}% of your ${poolMode === 'discretionary' ? 'discretionary' : 'variable'} budget with ${100 - Math.round(monthElapsedPct)}% of the month still ahead.`;
    } else if (paceDeltaPct > 0 || poolUsedPct > 80) {
      status = 'caution';
      statusTitle = 'Tight Runway — Small Purchases Only';
      statusReason = `Discretionary burn (${poolUsedPct.toFixed(0)}%) is slightly ahead of month pace (${monthElapsedPct.toFixed(0)}%). Stay under ${formatCurrency(safePerDay)}/day.`;
    }

    return {
      dayOfMonth,
      daysInMonth,
      daysRemainingInMonth,
      monthElapsedPct,
      daysUntilNextThursday,
      isTodayThursday,
      nextThursdayLabel,
      nextPayOwner,
      expectedNextPayAmount,
      totalBudget,
      totalSpent,
      committedSpent,
      committedReserved,
      poolBudget,
      poolSpent,
      safeToSpendRemaining,
      overBudgetAmount,
      segCommittedSpentPct,
      segPoolSpentPct,
      segReservedPct,
      segSafeRemainingPct,
      actualTotalSpentPct,
      burnMarkerBarPct,
      expectedSpendToday,
      poolUsedPct,
      paceDeltaPct,
      safePerDay,
      safeUntilNextThursday,
      safeThisWeek,
      daysInWindowUntilPayday,
      status,
      statusTitle,
      statusReason,
    };
  }, [transactions, allTransactions, budgets, settings, selectedMonth, poolMode, todayDate, formatCurrency]);

  const statusBadgeStyles = {
    approve: {
      bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
    },
    caution: {
      bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
    },
    delay: {
      bg: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
      icon: <OctagonAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />,
    },
  }[metrics.status];

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-lg relative overflow-hidden">
      {/* Subtle top accent glow */}
      <div
        className={`absolute inset-x-0 top-0 h-1 ${
          metrics.status === 'approve'
            ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500'
            : metrics.status === 'caution'
            ? 'bg-gradient-to-r from-amber-500 via-orange-400 to-indigo-500'
            : 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500'
        }`}
      />

      {/* Top Header Row: Title, Mode Switcher & Decision Status Verdict */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Flame className="w-5 h-5 text-emerald-400" />
              <span>Safe-to-Spend & Monthly Runway</span>
            </h2>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300">
              Day {metrics.dayOfMonth} of {metrics.daysInMonth} ({metrics.monthElapsedPct.toFixed(0)}% elapsed)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Locks in monthly & annual sinking bills first, then paces your remaining runway across Thursday paydays.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pool Mode Toggle */}
          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-700/80 text-xs">
            <button
              onClick={() => setPoolMode('discretionary')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                poolMode === 'discretionary'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Strict Discretionary only (Dining, Entertainment, Shopping, Other)"
            >
              Discretionary Only
            </button>
            <button
              onClick={() => setPoolMode('variable')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                poolMode === 'variable'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="All Day-to-Day Variable (Discretionary + Groceries & Transportation)"
            >
              All Variable
            </button>
          </div>

          {/* Decision Verdict Pill */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${statusBadgeStyles.bg}`}
          >
            {statusBadgeStyles.icon}
            <span>{metrics.statusTitle}</span>
          </div>
        </div>
      </div>

      {/* Primary KPI Callout Strip: Safe This Week, Safe Until Thursday Payday, Safe Per Day, Monthly Safe Pool */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* 1. Safe This Week (Primary purchase decision metric) */}
        <div className="bg-slate-900/75 border border-emerald-500/30 rounded-xl p-3.5 relative">
          <div className="flex items-center justify-between text-xs text-emerald-300/90 font-semibold uppercase tracking-wider mb-1">
            <span>Safe This Week (7d)</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 tracking-tight">
            {formatCurrency(metrics.safeThisWeek, 0)}
            <span className="text-xs font-normal text-slate-400 ml-1">/ wk</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Max discretionary spend to stay on pace this week
          </div>
        </div>

        {/* 2. Safe Before Next Thursday Payday */}
        <div className="bg-slate-900/75 border border-indigo-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold uppercase tracking-wider mb-1">
            <span>Before Next Payday</span>
            <CalendarClock className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white tracking-tight">
              {formatCurrency(metrics.safeUntilNextThursday, 0)}
            </span>
            <span className="text-xs font-medium text-indigo-300">
              ({metrics.daysInWindowUntilPayday}d left)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            Next: <span className="text-slate-200 font-medium">{metrics.nextThursdayLabel}</span>
            {metrics.expectedNextPayAmount > 0 && (
              <span>
                {' '}
                • {metrics.nextPayOwner} (~{formatCurrency(metrics.expectedNextPayAmount, 0)})
              </span>
            )}
          </div>
        </div>

        {/* 3. Daily Safe Burn Allowance */}
        <div className="bg-slate-900/75 border border-slate-700/70 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
            <span>Daily Safe Allowance</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 tracking-tight">
            {formatCurrency(metrics.safePerDay, 2)}
            <span className="text-xs font-normal text-slate-400 ml-1">/ day</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Spread across {metrics.daysRemainingInMonth} remaining day
            {metrics.daysRemainingInMonth === 1 ? '' : 's'} in month
          </div>
        </div>

        {/* 4. Remaining Monthly Safe-to-Spend Pool */}
        <div className="bg-slate-900/75 border border-slate-700/70 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
            <span>Monthly Safe-to-Spend</span>
            <Wallet className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-teal-300 tracking-tight">
            {formatCurrency(metrics.safeToSpendRemaining, 0)}
            <span className="text-xs font-normal text-slate-400 ml-1.5">
              of {formatCurrency(metrics.poolBudget, 0)}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {formatCurrency(metrics.committedReserved, 0)} locked for upcoming bills & goals
          </div>
        </div>
      </div>

      {/* Segmented Single Horizontal Progress Bar + Burn-Rate Marker */}
      <div className="pt-5 pb-3">
        <div className="relative">
          {/* Burn-Rate Marker Callout Pin (Above Bar) */}
          <div
            className="absolute -top-6 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none transition-all duration-500"
            style={{
              left: `${Math.min(96, Math.max(4, metrics.burnMarkerBarPct))}%`,
            }}
          >
            <div className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-bold text-[10px] tracking-tight whitespace-nowrap shadow-md">
              Pace Target: {formatCurrency(metrics.expectedSpendToday, 0)}
            </div>
          </div>

          {/* Horizontal Segmented Track */}
          <div className="h-7 w-full bg-slate-950 rounded-xl overflow-hidden flex border border-slate-700/90 p-0.5 gap-0.5 relative">
            {/* Segment 1: Fixed & Essential Committed Spent */}
            {metrics.segCommittedSpentPct > 0 && (
              <div
                style={{ width: `${metrics.segCommittedSpentPct}%` }}
                className="h-full bg-indigo-500/85 first:rounded-l-lg transition-all duration-500 relative group"
                title={`Fixed, Essential & Goals Spent: ${formatCurrency(metrics.committedSpent)}`}
              />
            )}

            {/* Segment 2: Discretionary / Active Pool Spent */}
            {metrics.segPoolSpentPct > 0 && (
              <div
                style={{ width: `${metrics.segPoolSpentPct}%` }}
                className={`h-full transition-all duration-500 relative group ${
                  metrics.status === 'delay'
                    ? 'bg-rose-500'
                    : metrics.status === 'caution'
                    ? 'bg-amber-500'
                    : 'bg-sky-400'
                }`}
                title={`${poolMode === 'discretionary' ? 'Discretionary' : 'Variable'} Spent: ${formatCurrency(metrics.poolSpent)}`}
              />
            )}

            {/* Segment 3: Reserved Upcoming Essentials & Sinking Funds (Hatched / Locked) */}
            {metrics.segReservedPct > 0 && (
              <div
                style={{
                  width: `${metrics.segReservedPct}%`,
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(100,116,139,0.28) 0px, rgba(100,116,139,0.28) 6px, rgba(30,41,59,0.6) 6px, rgba(30,41,59,0.6) 12px)',
                }}
                className="h-full border-x border-slate-700/60 transition-all duration-500"
                title={`Reserved for Upcoming Monthly/Yearly Bills: ${formatCurrency(metrics.committedReserved)}`}
              />
            )}

            {/* Segment 4: Safe-to-Spend Remaining */}
            {metrics.segSafeRemainingPct > 0 && (
              <div
                style={{ width: `${metrics.segSafeRemainingPct}%` }}
                className="h-full bg-emerald-500/90 last:rounded-r-lg transition-all duration-500"
                title={`Safe-to-Spend Remaining: ${formatCurrency(metrics.safeToSpendRemaining)}`}
              />
            )}
          </div>

          {/* Vertical Burn-Rate Marker Line */}
          <div
            className="absolute -top-1 -bottom-1.5 w-0.5 bg-amber-400 z-10 pointer-events-none shadow-[0_0_8px_rgba(251,191,36,0.9)] transition-all duration-500"
            style={{ left: `${metrics.burnMarkerBarPct}%` }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-slate-950 -translate-x-[4px] -translate-y-0.5" />
          </div>
        </div>

        {/* Segment Legend & Explanations */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 text-xs">
          <div className="flex items-center gap-2 bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <span className="w-3 h-3 rounded-sm bg-indigo-500 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-slate-400 text-[11px] truncate">Fixed & Essential Spent</div>
              <div className="font-semibold text-slate-200">
                {formatCurrency(metrics.committedSpent, 0)}{' '}
                <span className="text-[10px] text-slate-500 font-normal">
                  ({metrics.segCommittedSpentPct.toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <span
              className={`w-3 h-3 rounded-sm flex-shrink-0 ${
                metrics.status === 'delay'
                  ? 'bg-rose-500'
                  : metrics.status === 'caution'
                  ? 'bg-amber-500'
                  : 'bg-sky-400'
              }`}
            />
            <div className="min-w-0">
              <div className="text-slate-400 text-[11px] truncate">
                {poolMode === 'discretionary' ? 'Discretionary Spent' : 'Variable Spent'}
              </div>
              <div className="font-semibold text-slate-200">
                {formatCurrency(metrics.poolSpent, 0)}{' '}
                <span className="text-[10px] text-slate-500 font-normal">
                  ({metrics.poolUsedPct.toFixed(0)}% of pool)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <span
              className="w-3 h-3 rounded-sm border border-slate-500 flex-shrink-0"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(148,163,184,0.45) 0px, rgba(148,163,184,0.45) 3px, transparent 3px, transparent 6px)',
              }}
            />
            <div className="min-w-0">
              <div className="text-slate-400 text-[11px] truncate flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-slate-400" />
                <span>Reserved Bills & Goals</span>
              </div>
              <div className="font-semibold text-slate-300">
                {formatCurrency(metrics.committedReserved, 0)}{' '}
                <span className="text-[10px] text-slate-500 font-normal">
                  ({metrics.segReservedPct.toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-950/30 px-2.5 py-1.5 rounded-lg border border-emerald-500/30">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-emerald-300/90 text-[11px] font-medium truncate">
                Safe-to-Spend Left
              </div>
              <div className="font-bold text-emerald-400">
                {formatCurrency(metrics.safeToSpendRemaining, 0)}{' '}
                <span className="text-[10px] text-emerald-500/80 font-normal">
                  ({metrics.segSafeRemainingPct.toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Insight Footer */}
      <div className="mt-2 pt-3 border-t border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
          <span>{metrics.statusReason}</span>
        </div>
        <div className="text-[11px] text-slate-500 flex-shrink-0">
          Total Spent: <span className="text-slate-300 font-medium">{formatCurrency(metrics.totalSpent, 0)}</span> /{' '}
          <span className="text-slate-300 font-medium">{formatCurrency(metrics.totalBudget, 0)}</span> monthly target
        </div>
      </div>
    </div>
  );
};
