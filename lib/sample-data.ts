/**
 * Sample-month seeder. 20 realistic Malaysian entries (1 income + 19 spend)
 * spread across the most recent 20 calendar days ending today. Uses the
 * user's already-seeded categories + accounts (by name) so the dashboard
 * meters light up immediately. Ported from the prototype's makeSampleMonth.
 */

import { isoDaysAgo } from "./dates";

interface Row {
  merchant: string;
  category: string;
  account: string;
  amount_sen: number;
}

const RAW: readonly Row[] = [
  { merchant: "Maybank Salary",     category: "EPF top-up",         account: "Maybank",     amount_sen:  650000 },
  { merchant: "Village Grocer",     category: "Groceries",          account: "Maybank",     amount_sen: -18450 },
  { merchant: "Petronas Setapak",   category: "Transport — Petrol", account: "Maybank",     amount_sen: -12000 },
  { merchant: "Astro",              category: "Subscriptions",      account: "Maybank",     amount_sen: -12990 },
  { merchant: "Unifi",              category: "Internet",           account: "Maybank",     amount_sen: -13900 },
  { merchant: "Maxis Postpaid",     category: "Telco",              account: "Maybank",     amount_sen:  -9900 },
  { merchant: "Restoran Kapitan",   category: "Mamak & Kopitiam",   account: "TnG eWallet", amount_sen:  -1850 },
  { merchant: "Grab",               category: "Public Transport",   account: "TnG eWallet", amount_sen:  -2400 },
  { merchant: "Starbucks Pavilion", category: "Coffee",             account: "Maybank",     amount_sen:  -2350 },
  { merchant: "TNB",                category: "Utilities — TNB",    account: "Maybank",     amount_sen: -21400 },
  { merchant: "Air Selangor",       category: "Water",              account: "Maybank",     amount_sen:  -3800 },
  { merchant: "Shopee",             category: "Shopping",           account: "ShopeePay",   amount_sen:  -8990 },
  { merchant: "SmartTAG top-up",    category: "Transport — Tolls",  account: "TnG eWallet", amount_sen:  -5000 },
  { merchant: "Netflix",            category: "Subscriptions",      account: "Maybank",     amount_sen:  -5500 },
  { merchant: "Village Grocer",     category: "Groceries",          account: "Maybank",     amount_sen: -15620 },
  { merchant: "PTPTN",              category: "PTPTN",              account: "Maybank",     amount_sen: -30000 },
  { merchant: "Watsons",            category: "Personal Care",      account: "Maybank",     amount_sen:  -4780 },
  { merchant: "KFC Bangsar",        category: "Dining Out",         account: "Maybank",     amount_sen:  -3450 },
  { merchant: "ASNB",               category: "ASB / ASNB",         account: "Maybank",     amount_sen: -50000 },
  { merchant: "Spotify",            category: "Subscriptions",      account: "Maybank",     amount_sen:  -1490 },
];

export interface SampleRow {
  date: string;
  merchant: string;
  amount_sen: number;
  category_id: string | null;
  account_id: string | null;
  tags: string[];
}

/**
 * Build 20 sample transaction rows, mapping category/account NAMES to the
 * user's own row IDs. Falls back to null for missing accounts/categories so
 * inserts still succeed even if the user has renamed or archived some.
 */
export function buildSampleMonth(
  categoriesByName: Record<string, string>,
  accountsByName: Record<string, string>,
): SampleRow[] {
  const firstAccountId = Object.values(accountsByName)[0] ?? null;
  return RAW.map((r, idx) => ({
    date: isoDaysAgo(RAW.length - 1 - idx),
    merchant: r.merchant,
    amount_sen: r.amount_sen,
    category_id: categoriesByName[r.category] ?? null,
    account_id: accountsByName[r.account] ?? firstAccountId,
    tags: ["sample"],
  }));
}
