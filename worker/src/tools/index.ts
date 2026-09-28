import customerData from '../data/customer.json';
import productsData from '../data/products.json';

export interface ToolResult {
  [key: string]: unknown;
}

// ---------- Customer tools ----------

export function getCustomerProfile(): ToolResult {
  return {
    name: customerData.name,
    accounts: customerData.accounts,
    cards: customerData.cards,
    cashback: customerData.cashback,
  };
}

export function getAccounts(): ToolResult {
  return { accounts: customerData.accounts };
}

export function getCards(): ToolResult {
  return { cards: customerData.cards };
}

export function getTransactions(limit = 10): ToolResult {
  return { transactions: customerData.transactions.slice(0, limit) };
}

export function getTransaction(id: string): ToolResult {
  const tx = customerData.transactions.find((t) => t.id === id);
  return tx ? { transaction: tx } : { error: 'not_found' };
}

export function getCreditCardStatus(): ToolResult {
  const card = customerData.cards.find((c) => c.type === 'credit');
  if (!card) return { error: 'no_credit_card' };
  return {
    masked: card.masked,
    outstanding: card.outstanding,
    minimumPayment: card.minimumPayment,
    graceEndsAt: card.graceEndsAt,
    gracePeriodDays: card.gracePeriodDays,
    currency: card.currency,
  };
}

export function getCashback(): ToolResult {
  return { cashback: customerData.cashback };
}

// ---------- Products ----------

export function getProducts(): ToolResult {
  return { products: productsData };
}

export function calculateDepositReturn(
  amount: number,
  months: number,
  ratePercent: number
): ToolResult {
  const gross = amount * (1 + (ratePercent / 100) * (months / 12));
  return {
    amount,
    months,
    ratePercent,
    expectedReturn: Math.round(gross),
    interest: Math.round(gross - amount),
  };
}

// ---------- Recipient / Transfer ----------

const RECIPIENTS = [
  {
    name: 'Anna Petrova',
    aliases: ['Anna', 'Анна', 'Анне', 'Петрова'],
    bank: 'Example Bank',
    phone: '+7 9XX XXX XX XX',
    accountMasked: '••4832',
    verified: true,
  },
  {
    name: 'Ivan Sidorov',
    aliases: ['Ivan', 'Иван'],
    bank: 'Example Bank',
    phone: '+7 9XX XXX XX XX',
    accountMasked: '••1122',
    verified: true,
  },
];

export function getRecipient(query: string): ToolResult {
  const q = query.toLowerCase();
  const found = RECIPIENTS.find(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.aliases.some((a) => a.toLowerCase().includes(q))
  );
  return found ? { recipient: found } : { error: 'not_found', query };
}

export function calculateTransferFee(amount: number): ToolResult {
  // Illustrative rule: no fee up to 100 000 ₽, 1% выше
  const fee = amount > 100000 ? Math.round(amount * 0.01) : 0;
  return { amount, fee, currency: 'RUB' };
}

// ---------- Documents (orchestrate) ----------

export function parseDocument(): ToolResult {
  return {
    supplier: 'Example Energy',
    accountMasked: '••••4832',
    amount: 7842,
    dueDate: '2026-09-20',
    currency: 'RUB',
    documentType: 'utility_bill',
  };
}

export function getSupplier(name: string): ToolResult {
  return {
    id: 'sup_example_energy',
    name,
    category: 'utilities',
  };
}

export function matchCustomerAccount(masked: string): ToolResult {
  const found = customerData.accounts.find((a) => a.masked === masked);
  return found
    ? { matched: true, accountId: found.id, masked: found.masked }
    : { matched: false };
}