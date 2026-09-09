/**
 * Debt-payoff math — Snowball vs Avalanche simulator. Ported verbatim from
 * the prototype. Integer sen throughout; APR is basis points (0..100000).
 *
 * Both strategies pay every minimum first, then apply the remaining monthly
 * budget (freed minimums + user's extra) to a focused debt:
 *   snowball  → smallest balance first
 *   avalanche → highest APR first
 *
 * Banker's rounding via money.bankersRound so interest accrual matches the
 * regression tests we shipped in the prototype.
 */

import { bankersRound } from "./money";

export type Strategy = "snowball" | "avalanche";

export interface DebtInput {
  id: string;
  name: string;
  balance_sen: number;
  apr_bps: number;
  min_payment_sen: number;
}

export interface ScheduleRow {
  month: number;
  interest: number;
  payment: number;
  balance: number;
}

export interface SimulationResult {
  strategy: Strategy;
  months: number;
  total_interest_sen: number;
  debt_free_iso: string;
  perDebt: Array<{ id: string; name: string; schedule: ScheduleRow[] }>;
  finished: boolean;
}

const MAX_MONTHS = 600;

export function simulateDebts(
  debts: DebtInput[],
  strategy: Strategy,
  extra_sen: number,
): SimulationResult {
  const state = debts.map((d) => ({
    id: d.id,
    name: d.name,
    balance: d.balance_sen ?? 0,
    apr_bps: d.apr_bps ?? 0,
    min: d.min_payment_sen ?? 0,
    schedule: [] as ScheduleRow[],
    _m_int: 0,
    _m_pay: 0,
  }));

  const totalMin = debts.reduce((s, d) => s + (d.min_payment_sen ?? 0), 0);
  const monthlyBudget = totalMin + (extra_sen ?? 0);

  let month = 0;
  let total_interest = 0;

  while (state.some((d) => d.balance > 0) && month < MAX_MONTHS) {
    month++;

    // 1) Accrue interest on every active debt
    for (const d of state) {
      if (d.balance <= 0) {
        d._m_int = 0;
        d._m_pay = 0;
        continue;
      }
      const int_sen = bankersRound((d.balance * (d.apr_bps / 10000)) / 12);
      d.balance += int_sen;
      total_interest += int_sen;
      d._m_int = int_sen;
      d._m_pay = 0;
    }

    // 2) Determine focus order for this month
    const active = state.filter((d) => d.balance > 0);
    if (active.length === 0) break;
    const focusOrder = [...active].sort((a, b) =>
      strategy === "snowball" ? a.balance - b.balance : b.apr_bps - a.apr_bps,
    );

    // 3) Pay minimums (bounded by remaining balance + budget)
    let budget = monthlyBudget;
    for (const d of active) {
      const pay = Math.min(d.min, d.balance, budget);
      d.balance -= pay;
      budget -= pay;
      d._m_pay += pay;
      if (budget <= 0) break;
    }

    // 4) Apply remaining budget to the focus debts, priority first
    for (const d of focusOrder) {
      if (budget <= 0) break;
      if (d.balance <= 0) continue;
      const pay = Math.min(d.balance, budget);
      d.balance -= pay;
      budget -= pay;
      d._m_pay += pay;
    }

    // 5) Record schedule rows (only for debts that had activity)
    for (const d of state) {
      if (d._m_pay === 0 && d._m_int === 0) continue;
      d.schedule.push({
        month,
        interest: d._m_int,
        payment: d._m_pay,
        balance: d.balance,
      });
    }

    // Safety net — if literally nothing changed, break to avoid infinite loop
    const anyProgress = active.some((d) => d._m_pay > 0);
    if (!anyProgress) break;
  }

  const debtFree = new Date();
  debtFree.setMonth(debtFree.getMonth() + month);

  return {
    strategy,
    months: month,
    total_interest_sen: total_interest,
    debt_free_iso: debtFree.toISOString().slice(0, 10),
    perDebt: state.map((d) => ({ id: d.id, name: d.name, schedule: d.schedule })),
    finished: state.every((d) => d.balance <= 0),
  };
}

/** Standard periodic payment formula, for a debt in isolation. */
export function amortMonthly_sen(
  principal_sen: number,
  apr_bps: number,
  months: number,
): number {
  const r = apr_bps / 10000 / 12;
  if (r === 0) return bankersRound(principal_sen / months);
  const factor = Math.pow(1 + r, months);
  const M = (principal_sen * r * factor) / (factor - 1);
  return bankersRound(M);
}

export const DEBT_TYPES = [
  "credit",
  "ptptn",
  "personal",
  "car",
  "mortgage",
  "asb",
  "family",
  "other",
] as const;
export type DebtType = (typeof DEBT_TYPES)[number];
