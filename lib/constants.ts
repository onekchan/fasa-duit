/**
 * App-wide constants that ports directly from the prototype's DEFAULTS +
 * ACCOUNT_PRESETS + CURRENCIES.
 */

export const CURRENCIES = [
  { code: "MYR", label: "Malaysian Ringgit (RM)" },
  { code: "SGD", label: "Singapore Dollar (S$)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "IDR", label: "Indonesian Rupiah (Rp)" },
  { code: "THB", label: "Thai Baht (฿)" },
  { code: "PHP", label: "Philippine Peso (₱)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const ACCOUNT_PRESETS = [
  // Banks
  { name: "Maybank", type: "current" },
  { name: "CIMB", type: "current" },
  { name: "Public Bank", type: "current" },
  { name: "RHB", type: "current" },
  { name: "Hong Leong", type: "current" },
  { name: "AmBank", type: "current" },
  { name: "Bank Islam", type: "current" },
  { name: "Bank Rakyat", type: "current" },
  { name: "BSN", type: "current" },
  { name: "Alliance", type: "current" },
  // eWallets
  { name: "TnG eWallet", type: "ewallet" },
  { name: "MAE", type: "ewallet" },
  { name: "Boost", type: "ewallet" },
  { name: "GrabPay", type: "ewallet" },
  { name: "ShopeePay", type: "ewallet" },
  { name: "BigPay", type: "ewallet" },
  { name: "Setel", type: "ewallet" },
  // Generic
  { name: "Cash", type: "cash" },
  { name: "Credit Card", type: "credit" },
  { name: "Savings", type: "savings" },
] as const;

export const CATEGORIES_SEED = [
  // Needs
  { name: "Groceries", bucket: "needs" },
  { name: "Rent / Mortgage", bucket: "needs" },
  { name: "Utilities — TNB", bucket: "needs" },
  { name: "Water", bucket: "needs" },
  { name: "Telco", bucket: "needs" },
  { name: "Internet", bucket: "needs" },
  { name: "Transport — Petrol", bucket: "needs" },
  { name: "Transport — Tolls", bucket: "needs" },
  { name: "Public Transport", bucket: "needs" },
  { name: "Insurance & Takaful", bucket: "needs" },
  { name: "Medical", bucket: "needs" },
  { name: "PTPTN", bucket: "needs" },
  { name: "Childcare", bucket: "needs" },
  // Wants
  { name: "Mamak & Kopitiam", bucket: "wants" },
  { name: "Dining Out", bucket: "wants" },
  { name: "Coffee", bucket: "wants" },
  { name: "Shopping", bucket: "wants" },
  { name: "Subscriptions", bucket: "wants" },
  { name: "Travel", bucket: "wants" },
  { name: "Personal Care", bucket: "wants" },
  { name: "Gifts", bucket: "wants" },
  // Savings
  { name: "EPF top-up", bucket: "savings" },
  { name: "ASB / ASNB", bucket: "savings" },
  { name: "Tabung Haji", bucket: "savings" },
  { name: "PRS", bucket: "savings" },
  { name: "Sinking Funds", bucket: "savings" },
  { name: "Zakat", bucket: "savings" },
  { name: "Debt (extra)", bucket: "savings" },
] as const;
