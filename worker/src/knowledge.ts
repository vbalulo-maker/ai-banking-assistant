// Содержимое knowledge/*.md захардкожено здесь.
// Это упрощает сборку: не нужно настраивать правила Wrangler
// для импорта .md файлов.
//
// Если хочешь автоматически подтягивать содержимое из .md —
// можно будет сделать позже через [rules] в wrangler.toml.

export interface KnowledgeDocument {
  source: string;
  title: string;
  content: string;
}

export const KNOWLEDGE_DOCUMENTS: KnowledgeDocument[] = [
  {
    source: 'fees.md',
    title: 'Fees and Commissions',
    content: `# Fees and Commissions

## Subscription charges

If a customer sees a recurring charge for a small fixed amount (typically between 199 ₽ and 999 ₽ per month), it is most likely a subscription service: streaming, music, cloud storage, or a mobile app. The bank does not charge an additional fee for these operations — the amount is debited directly by the merchant.

## Monthly account maintenance

The "Comfort" tariff plan has no monthly maintenance fee if the customer maintains a minimum balance of 50 000 ₽ or receives a salary to the account. Otherwise, a fee of 99 ₽ per month applies.

## Card-to-card transfers

Transfers between the customer's own accounts are always free. Transfers to other customers within the same bank are free up to 100 000 ₽ per month. Above this threshold, a fee of 1% applies, capped at 1 000 ₽ per operation.

## External transfers

Transfers to accounts in other banks via the Faster Payments System (СБП) are free for amounts up to 100 000 ₽ per month. Above this limit, a 0.5% fee applies. SWIFT transfers to foreign banks start at 1 000 ₽ plus 0.5% of the amount.

## Currency conversion

When the customer pays in a currency different from the account currency, the bank applies its internal exchange rate. The markup over the Central Bank rate is 2%. This markup is not shown as a separate line in the transaction history — it is already included in the final amount.

## Fee reversal

If a customer believes a fee was charged in error, they can request a reversal through the in-app support within 30 days of the charge. Reversals are processed within 3 business days.`,
  },
  {
    source: 'credit_cards.md',
    title: 'Credit Cards',
    content: `# Credit Cards

## Grace period

The credit card has a grace period of 55 days. During this period, no interest is charged on purchases — provided the customer pays the full outstanding balance by the grace period end date. The grace period end date is shown in the app and in the monthly statement.

## Minimum payment

The minimum monthly payment is 5% of the outstanding balance, but not less than 4 500 ₽. If the customer pays only the minimum, the grace period is terminated and interest starts accruing from the date of each purchase.

## Interest rate

If the customer does not pay the full outstanding balance within the grace period, interest accrues at 24.9% per annum from the date of each purchase. Interest is capitalized monthly.

## Statement date

The statement is generated on the 1st of each month. The grace period starts from the statement date, not from the individual purchase date.

## To avoid interest

To avoid paying interest, the customer must pay the **full outstanding balance** (not just the minimum payment) before the grace period end date. The exact amount is shown in the app under "Credit card → Outstanding balance".

## Cash withdrawals

Cash withdrawals from a credit card incur a 3% fee (minimum 300 ₽) and start accruing interest immediately — they are not covered by the grace period.`,
  },
  {
    source: 'transfers.md',
    title: 'Transfers',
    content: `# Transfers

## Transfer preparation

When the customer initiates a transfer via the AI Assistant, the assistant prepares the operation and shows a confirmation card with all details: recipient, amount, fee, and total. The transfer is not executed until the customer explicitly confirms.

## Recipient verification

The recipient is verified through the bank's internal contact book and the Faster Payments System (СБП). If the recipient is found and the account is active, the transfer can proceed. If the recipient is not found, the assistant asks for clarification.

## Transfer limits

Standard limits for a single transfer:
- Up to 100 000 ₽ — free, immediate.
- 100 000 ₽ to 1 000 000 ₽ — 1% fee, capped at 1 000 ₽.
- Above 1 000 000 ₽ — requires additional verification.

Daily limits: 5 000 000 ₽ for transfers to other banks, 10 000 000 ₽ within the same bank.

## Execution time

Transfers within the same bank are executed instantly. Transfers to other banks via СБП are executed within 15 minutes. SWIFT transfers can take up to 3 business days.

## Cancellation

A transfer cannot be cancelled after execution. If the customer made a mistake, they must contact the recipient directly or file a dispute with the bank.`,
  },
  {
    source: 'deposits.md',
    title: 'Deposits',
    content: `# Deposits

## Classic deposit

Term: 3, 6, 12, or 24 months.
Rate: from 10.5% to 12.5% per annum, depending on the term and amount.
Minimum amount: 50 000 ₽.
Liquidity: medium. Partial withdrawal is allowed after 90 days without losing accrued interest.
Withdrawal restrictions: early full withdrawal loses all accrued interest.

## Flexible deposit

Term: from 1 month, no upper limit.
Rate: 10.0% per annum.
Minimum amount: 10 000 ₽.
Liquidity: high. Withdrawal at any time without losing accrued interest.
Withdrawal restrictions: none.

## Maximum income deposit

Term: 6, 12, or 24 months.
Rate: up to 13.5% per annum.
Minimum amount: 100 000 ₽.
Liquidity: low. No withdrawal until maturity.
Withdrawal restrictions: any withdrawal terminates the deposit and forfeits accrued interest.

## Interest calculation

Interest is calculated daily on the actual balance and paid at maturity. For terms of 12 months or longer, the customer may choose monthly interest payouts to a separate account.

## Early termination

Early termination of a fixed-term deposit (Classic or Maximum income) results in interest recalculated at 0.1% per annum for the days the money was on deposit. The principal is returned in full.

## Tax

Interest income above 1 000 000 ₽ × key rate is subject to 13% personal income tax. The bank withholds the tax automatically.`,
  },
  {
    source: 'cashback.md',
    title: 'Cashback',
    content: `# Cashback

## Standard cashback

1% cashback on all purchases.
5% cashback on selected categories (restaurants, taxi, grocery stores), chosen by the customer each month in the app.
Maximum cashback per month: 5 000 ₽.

## Category selection

The customer selects up to 3 categories for the next month before the 25th of the current month. If not selected, the categories from the previous month carry over.

## Cashback crediting

Cashback is credited to the account on the 5th of the following month. It can be withdrawn or used to pay for purchases.

## Excluded categories

Cashback is not accrued on:
- Cash withdrawals.
- Money transfers.
- Utility payments.
- Payments to government agencies.
- Purchase of securities and cryptocurrency.
- Purchases from certain MCC codes (gambling, tobacco, adult content).`,
  },
  {
    source: 'payments.md',
    title: 'Payments',
    content: `# Payments

## Utility payments

The customer can pay utility bills through the AI Assistant or the app. The assistant can:
- Parse a bill (photo or PDF) and extract the supplier, account number, amount, and due date.
- Match the supplier account with the customer's account in the bank.
- Prepare a payment and show a confirmation card.

## Supplier identification

Suppliers are identified by their INN (tax ID) and by the account number in the bill. The bank maintains a database of utility suppliers and their requisites.

## Payment limits

Standard utility payment limit: 50 000 ₽ per operation.
Daily limit: 500 000 ₽ for all payments.

## Execution time

Utility payments are executed within 1 business day. The supplier typically sees the payment on the next business day.

## Receipts

After a successful payment, the customer can download a receipt in the app. Receipts are stored for 5 years.`,
  },
  {
    source: 'cards.md',
    title: 'Cards',
    content: `# Cards

## Debit card

Issued in RUB. No issuance fee. No annual maintenance fee under the "Comfort" tariff.
Free cash withdrawals at the bank's ATMs. 1% fee at other banks' ATMs (minimum 100 ₽).
Contactless payments supported.

## Credit card

Issued in RUB. No issuance fee.
Credit limit: up to 500 000 ₽, set individually.
Grace period: 55 days on purchases.
Minimum payment: 5% of outstanding, but not less than 4 500 ₽.
Interest rate: 24.9% per annum if grace period is violated.

## Card blocking

The customer can block the card instantly through the app or by calling support. Blocking is irreversible — to unblock, a new card must be issued.

## Reissue

Reissue is free if the card is lost or stolen, or if the expiry date is near (within 30 days). In other cases, a 500 ₽ fee applies.

## Card-to-card transfers

Between the customer's own cards: free, instant.
To other customers' cards within the same bank: free up to 100 000 ₽ per month.
To cards of other banks: 1% fee, capped at 1 000 ₽.`,
  },
];

// ---------- Chunking ----------

export interface Chunk {
  source: string;
  index: number;
  content: string;
}

/**
 * Разбивает markdown на чанки по заголовкам уровня 2 (`## `).
 */
export function chunkDocument(doc: KnowledgeDocument): Chunk[] {
  const sections = doc.content.split(/\n## /);

  const chunks: Chunk[] = [];

  sections.forEach((section, i) => {
    const text = section.trim();
    if (!text) return;

    const withHeading = i === 0 ? text : `## ${text}`;

    chunks.push({
      source: doc.source,
      index: chunks.length,
      content: withHeading,
    });
  });

  return chunks;
}