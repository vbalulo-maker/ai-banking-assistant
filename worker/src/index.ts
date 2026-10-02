import type {
  Orchestration,
  OrchestrationItem,
  OrchestrationKnowledge,
  OrchestrationParameter,
  StatusKind,
  Intent,
  IntentParameters,
  IntentDetectionResult,
  KnowledgeChunkRow,
  RetrievedChunk,
  Clarification,
  ClarificationInput,
} from './types';
import * as tools from './tools';
import { KNOWLEDGE_DOCUMENTS, chunkDocument } from './knowledge';

// ---------- Env ----------

interface Env {
  DB: D1Database;
  AI: Ai;
  LLM_API_KEY: string;
  LLM_MODEL: string;
}

// ---------- CORS ----------

const ALLOWED_ORIGINS = [
  'https://vbalulo-maker.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data: unknown, origin: string | null, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

// ---------- Types (запросы) ----------

interface ChatRequestBody {
  message: string;
  conversationId: string;
  scenario?:
    | 'explain'
    | 'understand'
    | 'execute'
    | 'recommend'
    | 'orchestrate';
}

interface ExecuteRequestBody {
  conversationId: string;
  actionId: string;
  parameters: OrchestrationParameter[];
  action?: string;
}

// ---------- Фабрики ----------

function item(
  id: string,
  label: string,
  status: StatusKind = 'success'
): OrchestrationItem {
  return { id, label, status };
}

function param(
  name: string,
  label: string,
  value: string
): OrchestrationParameter {
  return { name, label, value };
}

function knowledge(
  id: string,
  label: string,
  source: string
): OrchestrationKnowledge {
  return { id, label, source, status: 'success' };
}

function formatRub(value: number): string {
  return value.toLocaleString('ru-RU') + ' ₽';
}

function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return fullName;
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

function maskPhone(phone: string): string {
  // Оставляем первые 4 символа (например "+7 9") и последние 6.
  // Всё остальное — "•••".
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return phone;

  const countryAndOperator = phone.slice(0, 4).trim();
  const lastDigits = digits.slice(-4);
  const formatted = lastDigits.replace(/(\d{2})(\d{2})/, '$1 $2');
  return `${countryAndOperator} ••• ${formatted}`;
}

// ---------- Embeddings ----------

const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';

async function embed(text: string, env: Env): Promise<number[]> {
  const result = (await env.AI.run(EMBEDDING_MODEL, {
    text: [text],
  })) as { data: number[][] };

  if (!result.data || !result.data[0]) {
    throw new Error('Embedding returned empty result');
  }

  return result.data[0];
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ---------- Indexing ----------

async function indexKnowledge(env: Env): Promise<{
  documents: number;
  chunks: number;
}> {
  let totalChunks = 0;

  for (const doc of KNOWLEDGE_DOCUMENTS) {
    const chunks = chunkDocument(doc);

    for (const chunk of chunks) {
      const embedding = await embed(chunk.content, env);

      await env.DB.prepare(
        `INSERT OR REPLACE INTO knowledge_chunks
         (id, source, chunk_index, content, embedding, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          `${chunk.source}#${chunk.index}`,
          chunk.source,
          chunk.index,
          chunk.content,
          JSON.stringify(embedding),
          Date.now()
        )
        .run();

      totalChunks++;
    }
  }

  return {
    documents: KNOWLEDGE_DOCUMENTS.length,
    chunks: totalChunks,
  };
}

// ---------- Retrieval ----------

async function retrieve(
  query: string,
  topK: number,
  env: Env
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embed(query, env);

  const { results } = await env.DB.prepare(
    `SELECT source, content, embedding FROM knowledge_chunks`
  ).all<KnowledgeChunkRow>();

  if (!results || results.length === 0) {
    return [];
  }

  const scored = results.map((row) => {
    let embedding: number[] = [];
    try {
      embedding = JSON.parse(row.embedding) as number[];
    } catch {
      embedding = [];
    }
    return {
      source: row.source,
      content: row.content,
      score: cosineSimilarity(queryEmbedding, embedding),
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

function extractHeading(content: string): string {
  const firstLine = content.split('\n')[0] ?? '';
  return firstLine.replace(/^#+\s*/, '').trim() || 'Untitled';
}

// ---------- Intent Detection ----------

const INTENT_SYSTEM_PROMPT = `You are an intent classifier for a digital banking AI assistant.

Classify the user's message into EXACTLY ONE of these intents:

1. explain_transaction — user asks why a transaction happened, what a charge was for.
2. credit_card_status — user asks about credit card balance, minimum payment, or grace period.
3. transfer — user asks to send money to someone.
4. product_recommendation — user asks where to place funds, which deposit or product to choose.
5. pay_utility_bill — user asks to pay a utility bill, check a bill, or pay a received invoice.
6. unknown — none of the above, or not enough information to decide.

Extract parameters STRICTLY from the user's message. Do NOT invent values.
Extract parameters where applicable:
- transfer: recipient (string, the name AS WRITTEN by the user), phone (string, phone if mentioned), amount (number, in RUB)
- explain_transaction: period (string), amount (number), merchant (string)
- product_recommendation: amount (number), term (number, months)

CRITICAL RULES:
- If the user says "Сергею" or "Sergey" as recipient, extract "Сергею" / "Sergey" — never substitute with another name.
- Do NOT use any names from context, examples, or memory. Use ONLY what is present in the user's message.
- Family roles ("мама", "папа", "жена", "муж", "брат", "сестра", "сын", "дочь", "маме", "папе", etc.) are NOT names. Do NOT extract them into "recipient". Leave "recipient" undefined for family roles — the assistant will ask for the actual name or phone.
- If the recipient is not mentioned, leave "recipient" undefined.
- If phone is not mentioned, leave "phone" undefined.

Return STRICTLY valid JSON in this format:
{
  "intent": "<one of the six>",
  "parameters": { ... },
  "confidence": <number 0..1>,
  "reasoning": "<short>"
}

Do not add any text outside JSON. Do not wrap in code fences.`;

async function detectIntent(
  message: string,
  env: Env
): Promise<IntentDetectionResult> {

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.LLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.LLM_MODEL || 'deepseek-chat',
        messages: [
          { role: 'system', content: INTENT_SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        temperature: 0.0,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('intent detection failed:', res.status, errText);
      return fallbackIntent();
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? '{}';

    const parsed = JSON.parse(content) as Partial<IntentDetectionResult>;

    const intent = (parsed.intent as Intent) ?? 'unknown';
    const validIntents: Intent[] = [
      'explain_transaction',
      'credit_card_status',
      'transfer',
      'product_recommendation',
      'pay_utility_bill',
      'unknown',
    ];

    return {
      intent: validIntents.includes(intent) ? intent : 'unknown',
      parameters: parsed.parameters ?? {},
      confidence:
        typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning ?? '',
    };
  } catch (err) {
    console.error('intent detection error:', err);
    return fallbackIntent();
  }
}

function fallbackIntent(): IntentDetectionResult {
  return {
    intent: 'unknown',
    parameters: {},
    confidence: 0,
    reasoning: 'Intent detection failed',
  };
}

// ---------- Scenario builders ----------

interface BlueprintResult {
  orchestration: Orchestration;
  systemFacts: string[];
}

async function buildExplain(
  params: IntentParameters,
  userMessage: string,
  env: Env
): Promise<BlueprintResult> {
  const txs = tools.getTransactions(5) as {
    transactions: {
      merchant: string;
      amount: number;
      date: string;
      fee: number;
    }[];
  };

  const requestedAmount =
    typeof params.amount === 'number' ? params.amount : undefined;
  const tx =
    (requestedAmount !== undefined
      ? txs.transactions.find((t) => t.amount === requestedAmount)
      : undefined) ?? txs.transactions[0];

  const retrieved = await retrieve(userMessage, 3, env);

  const facts: string[] = [
    `Transaction found: ${tx.merchant}, ${formatRub(tx.amount)}, on ${tx.date}`,
    `Fee charged: ${formatRub(tx.fee)}`,
    `Bank rules relevant to this transaction (from knowledge base):`,
    ...retrieved.map(
      (chunk) =>
        `[${chunk.source}] ${chunk.content.replace(/\n+/g, ' ').slice(0, 400)}`
    ),
  ];

  const knowledgeItems: OrchestrationKnowledge[] = retrieved.map(
    (chunk, i) =>
      knowledge(
        `${chunk.source}-${i}`,
        extractHeading(chunk.content),
        chunk.source
      )
  );

  const orchestration: Orchestration = {
    intent: 'explain_transaction',
    intentLabel: 'Explain transaction',
    parameters: [
      param('period', 'Period', params.period ?? 'last 7 days'),
      param('amount', 'Amount', formatRub(tx.amount)),
    ],
    context: [
      item('tx', `Transaction found: ${tx.merchant}, ${formatRub(tx.amount)}`),
    ],
    knowledge:
      knowledgeItems.length > 0
        ? knowledgeItems
        : [knowledge('fee_rules', 'Fee rules', 'fees.md')],
    tools: [
      item('get_transactions', 'get_transactions'),
      item('retrieve_knowledge', 'retrieve_knowledge'),
    ],
    validation: [],
    action: {
      id: 'generate_explanation',
      label: 'Generate explanation',
      status: 'success',
    },
    state: 'completed',
    durationMs: 1800,
  };

  return { orchestration, systemFacts: facts };
}

async function buildUnderstand(
  userMessage: string,
  env: Env
): Promise<BlueprintResult> {
  const cc = tools.getCreditCardStatus() as {
    masked: string;
    outstanding: number;
    minimumPayment: number;
    graceEndsAt: string;
    gracePeriodDays: number;
  };

  const retrieved = await retrieve(userMessage, 3, env);

  const facts: string[] = [
    `Credit card ${cc.masked}`,
    `Outstanding balance: ${formatRub(cc.outstanding)}`,
    `Minimum payment: ${formatRub(cc.minimumPayment)}`,
    `Grace period: ${cc.gracePeriodDays} days, ends ${cc.graceEndsAt}`,
    `Bank rules relevant to the customer's question (from knowledge base):`,
    ...retrieved.map(
      (chunk) =>
        `[${chunk.source}] ${chunk.content.replace(/\n+/g, ' ').slice(0, 400)}`
    ),
  ];

  const knowledgeItems: OrchestrationKnowledge[] = retrieved.map(
    (chunk, i) =>
      knowledge(
        `${chunk.source}-${i}`,
        extractHeading(chunk.content),
        chunk.source
      )
  );

  const orchestration: Orchestration = {
    intent: 'credit_card_status',
    intentLabel: 'Credit card status',
    parameters: [param('card', 'Card', cc.masked)],
    context: [
      item('cc_status', `Outstanding: ${formatRub(cc.outstanding)}`),
      item('cc_min', `Minimum payment: ${formatRub(cc.minimumPayment)}`),
      item('cc_grace', `Grace period ends: ${cc.graceEndsAt}`),
    ],
    knowledge:
      knowledgeItems.length > 0
        ? knowledgeItems
        : [
            knowledge(
              'grace_rules',
              'Grace period rules',
              'credit_cards.md'
            ),
          ],
    tools: [
      item('get_credit_card_status', 'get_credit_card_status'),
      item('retrieve_knowledge', 'retrieve_knowledge'),
    ],
    validation: [item('deterministic_calc', 'Deterministic calculation')],
    action: {
      id: 'generate_explanation',
      label: 'Generate explanation',
      status: 'success',
    },
    state: 'completed',
    durationMs: 1800,
  };

  return { orchestration, systemFacts: facts };
}

function buildExecute(
  params: IntentParameters,
  userMessage: string
):  BlueprintResult {
  const accountsResult = tools.getAccounts() as {
    accounts: { masked: string; balance: number }[];
  };
  const sourceAccount = accountsResult.accounts[0];

  const recipientQuery =
    typeof params.recipient === 'string' ? params.recipient.trim() : '';
  const phone =
    typeof params.phone === 'string' ? params.phone.trim() : undefined;

  const amount =
    typeof params.amount === 'number' && params.amount > 0
      ? params.amount
      : 50000;

  // --- 1. Ищем получателя ---
  const recipientResult = tools.getRecipient(recipientQuery, phone) as {
    recipient?: {
      name: string;
      bank: string;
      accountMasked: string;
      phone: string;
      verified: boolean;
    };
    matchedBy?: 'name' | 'phone';
    error?: string;
  };

  // --- 2. Если получателя не нашли ---
  if (!recipientResult.recipient) {
    // Если телефон передан — значит мы уже искали. Не нашли — fallback.
    if (phone) {
      return buildMissingDataFallback(
        recipientQuery
          ? `получатель с именем «${recipientQuery}» и телефоном ${phone} не найден в системе СБП`
          : `получатель с телефоном ${phone} не найден в системе СБП`
      );
    }

    // Телефона нет — просим его.
    return buildNeedsInputTransfer(recipientQuery, amount, userMessage);
  }

  const r = recipientResult.recipient;
  const feeResult = tools.calculateTransferFee(amount) as { fee: number };
  const total = amount + feeResult.fee;

  const displayName = maskName(r.name);
  const displayPhone = maskPhone(r.phone);

  const facts = [
    `Recipient verified: ${displayName}, ${r.bank}, phone ${displayPhone}, account ${r.accountMasked}`,
    `Amount: ${formatRub(amount)}`,
    `Fee: ${formatRub(feeResult.fee)}`,
    `Total: ${formatRub(total)}`,
    `Source account: ${sourceAccount.masked}, balance ${formatRub(
      sourceAccount.balance
    )}, sufficient funds`,
    `This is a prepared transfer awaiting user confirmation`,
  ];

  const orchestration: Orchestration = {
    intent: 'transfer',
    intentLabel: 'Transfer',
    parameters: [
      param('recipient', 'Recipient', displayName),
      param('phone', 'Phone', displayPhone),
      param('amount', 'Amount', formatRub(amount)),
      param('fee', 'Fee', formatRub(feeResult.fee)),
      param('total', 'Total', formatRub(total)),
    ],
    context: [
      item('recipient', `Recipient found: ${displayName}`),
      item('account', `Account ${sourceAccount.masked} available`),
    ],
    knowledge: [],
    tools: [
      item('get_recipient', 'get_recipient'),
      item('get_account', 'get_account'),
      item('calculate_transfer_fee', 'calculate_transfer_fee'),
    ],
    validation: [
      item('amount_limit', 'Amount limit'),
      item('recipient_verified', 'Recipient verified'),
    ],
    action: {
      id: 'confirmation_required',
      label: 'Confirmation required',
      status: 'warning',
    },
    state: 'awaiting_confirmation',
    durationMs: 1400,
  };

  return { orchestration, systemFacts: facts };
}

function buildNeedsInputTransfer(
  recipientName: string,
  amount: number,
  originalQuery: string
): BlueprintResult {
  const promptName = recipientName
    ? `получателя «${recipientName}»`
    : 'получателя';

  const clarification: Clarification = {
    reason: 'recipient_not_found',
    prompt: `Я не нашёл ${promptName} в ваших контактах и истории переводов. Уточните, пожалуйста, номер телефона — я поищу через СБП.`,
    inputs: [
      {
        name: 'phone',
        label: 'Телефон получателя',
        placeholder: '+7 900 000 00 00',
        kind: 'phone',
        required: true,
      },
    ],
    originalQuery,
  };

  const orchestration: Orchestration = {
    intent: 'transfer',
    intentLabel: 'Transfer — awaiting details',
    parameters: [
      ...(recipientName
        ? [param('recipient', 'Recipient', recipientName)]
        : []),
      param('amount', 'Amount', formatRub(amount)),
    ],
    context: [
      item(
        'recipient_lookup',
        recipientName
          ? `Recipient «${recipientName}» not found in contacts`
          : 'Recipient not specified',
        'warning'
      ),
    ],
    knowledge: [],
    tools: [item('get_recipient', 'get_recipient', 'warning')],
    validation: [],
    action: {
      id: 'clarification_required',
      label: 'Details required',
      status: 'warning',
    },
    state: 'needs_input',
    durationMs: 600,
    clarification,
  };

  const systemFacts = [
    `The assistant is preparing a transfer.`,
    `Recipient: ${recipientName || '(not specified)'}.`,
    `Amount: ${formatRub(amount)}.`,
    `The recipient is not found in the customer's contacts.`,
    `Ask the customer for the recipient's phone number — the assistant will search via the Faster Payments System (СБП).`,
    `Do NOT mention human support. This is a routine clarification, not an escalation.`,
    `Tone: warm, brief, helpful.`,
  ];

  return { orchestration, systemFacts };
}

function buildRecommend(params: IntentParameters): BlueprintResult {
  const accountsResult = tools.getAccounts() as {
    accounts: { balance: number }[];
  };
  const availableBalance = accountsResult.accounts[0]?.balance ?? 0;

  const productsResult = tools.getProducts() as {
    products: {
      id: string;
      name: string;
      termMonths: number;
      ratePercent: number;
      liquidity: string;
      withdrawalRestrictions: string;
    }[];
  };

  const amount =
    typeof params.amount === 'number' && params.amount > 0
      ? params.amount
      : 300000;

  const term =
    typeof params.term === 'number' && params.term > 0 ? params.term : 6;

  const products = productsResult.products
    .filter((p) => p.termMonths === term)
    .map((p) => {
      const calc = tools.calculateDepositReturn(
        amount,
        term,
        p.ratePercent
      ) as { expectedReturn: number; interest: number };
      return { ...p, ...calc };
    });

  const facts = [
    `Amount: ${formatRub(amount)}, term: ${term} months`,
    `Available balance: ${formatRub(availableBalance)}`,
    `Available illustrative products:`,
    ...products.map(
      (p) =>
        `• ${p.name}: rate ${p.ratePercent}%, expected return ${formatRub(
          p.expectedReturn
        )}, liquidity ${p.liquidity}, restrictions: ${p.withdrawalRestrictions}`
    ),
    `Instruction to LLM: present all products with trade-offs. Do NOT label any option as "best".`,
  ];

  const orchestration: Orchestration = {
    intent: 'product_recommendation',
    intentLabel: 'Product recommendation',
    parameters: [
      param('amount', 'Amount', formatRub(amount)),
      param('term', 'Term', `${term} months`),
    ],
    context: [
      item('balance', `Available balance: ${formatRub(availableBalance)}`),
    ],
    knowledge: [
      knowledge('product_conditions', 'Product conditions', 'deposits.md'),
    ],
    tools: [
      item('get_products', 'get_products'),
      item('calculate_deposit_return', 'calculate_deposit_return'),
    ],
    validation: [],
    action: {
      id: 'compare_scenarios',
      label: 'Compare scenarios',
      status: 'success',
    },
    state: 'completed',
    durationMs: 1400,
  };

  return { orchestration, systemFacts: facts };
}

function buildOrchestrate(): BlueprintResult {
  const doc = tools.parseDocument() as {
    supplier: string;
    accountMasked: string;
    amount: number;
    dueDate: string;
  };
  const supplier = tools.getSupplier(doc.supplier) as {
    id: string;
    name: string;
  };
  const match = tools.matchCustomerAccount(doc.accountMasked) as {
    matched: boolean;
  };

  const facts = [
    `Document parsed: supplier ${doc.supplier}, amount ${formatRub(
      doc.amount
    )}, due ${doc.dueDate}`,
    `Supplier identified: ${supplier.name}`,
    `Account matched: ${match.matched ? 'yes' : 'no'}`,
    `Payment prepared, awaiting user confirmation`,
    `This is a utility bill payment`,
  ];

  const orchestration: Orchestration = {
    intent: 'pay_utility_bill',
    intentLabel: 'Pay utility bill',
    parameters: [
      param('supplier', 'Supplier', doc.supplier),
      param('amount', 'Amount', formatRub(doc.amount)),
      param('due_date', 'Due date', doc.dueDate),
    ],
    context: [
      item('doc', 'Document identified'),
      item('supplier', `Supplier: ${supplier.name}`),
      item(
        'account',
        match.matched
          ? `Account ${doc.accountMasked} matched`
          : `Account ${doc.accountMasked} NOT matched`
      ),
    ],
    knowledge: [],
    tools: [
      item('parse_document', 'parse_document'),
      item('get_supplier', 'get_supplier'),
      item('match_customer_account', 'match_customer_account'),
      item('validate_bill', 'validate_bill'),
    ],
    validation: [item('payment_prepared', 'Payment prepared')],
    action: {
      id: 'confirmation_required',
      label: 'Confirmation required',
      status: 'warning',
    },
    state: 'awaiting_confirmation',
    durationMs: 1600,
  };

  return { orchestration, systemFacts: facts };
}

// ---------- Handoff fallbacks ----------

function buildIntentUnknownFallback(): BlueprintResult {
  const orchestration: Orchestration = {
    intent: 'unknown',
    intentLabel: 'Request not recognized',
    parameters: [],
    context: [],
    knowledge: [],
    tools: [],
    validation: [],
    action: {
      id: 'handoff',
      label: 'Offer human specialist',
      status: 'warning',
    },
    state: 'fallback',
    durationMs: 800,
    handoff: {
      reason: 'intent_unknown',
      message:
        'Я не до конца понял ваш вопрос. Могу помочь с переводом, объяснением операций, вопросами по кредитке, подбором вклада и оплатой счетов.',
      options: [
        { id: 'retry', label: 'Попробовать ещё раз', primary: false },
        { id: 'human', label: 'Позвать специалиста', primary: true },
      ],
    },
  };

  const systemFacts = [
    `The assistant could not determine the user's intent.`,
    `Politely acknowledge this. Mention what the assistant CAN help with (a few examples, not the full list).`,
    `Do NOT use the phrase "обратитесь в поддержку" or "свяжитесь с поддержкой".`,
    `Mention that a human specialist can be connected with one tap.`,
    `Tone: warm, brief, respectful. Address the customer as «вы».`,
  ];

  return { orchestration, systemFacts };
}

function buildMissingDataFallback(reason: string): BlueprintResult {
  const orchestration: Orchestration = {
    intent: 'unknown',
    intentLabel: 'Missing data',
    parameters: [],
    context: [],
    knowledge: [],
    tools: [],
    validation: [],
    action: {
      id: 'handoff',
      label: 'Offer alternatives',
      status: 'warning',
    },
    state: 'fallback',
    durationMs: 800,
    handoff: {
      reason: 'missing_data',
      message: `Я не смог подготовить перевод: ${reason}. Давайте попробуем ещё раз — вот что можно сделать.`,
      options: [
        { id: 'retry', label: 'Попробовать снова', primary: true },
        { id: 'human', label: 'Позвать специалиста', primary: false },
      ],
    },
  };

  const systemFacts = [
    `The assistant could not prepare the operation because: ${reason}.`,
    ``,
    `Follow this structure in your reply:`,
    `1) One short, warm sentence acknowledging the situation.`,
    `2) Do NOT say "перевод не прошёл" or "операция не выполнена". Say "не удалось подготовить перевод" / "получателя нет в системе СБП".`,
    `3) Give the customer 2-3 concrete alternatives to try, for example:`,
    `   • проверить номер телефона — возможно, получатель использует другой банк или не подключён к СБП;`,
    `   • назвать имя и фамилию получателя, если это возможно;`,
    `   • если получатель новый — сначала добавить его в контакты.`,
    `4) Only after listing alternatives — mention that a human specialist can be connected if needed.`,
    `5) Do NOT put the reason in quotes inside your reply. Rewrite it naturally in Russian.`,
    `6) Do NOT use the phrase "обратитесь в поддержку".`,
    `7) Address the customer as «вы». Be warm and brief.`,
  ];

  return { orchestration, systemFacts };
}

function buildOutOfScopeFallback(request: string): BlueprintResult {
  const orchestration: Orchestration = {
    intent: 'unknown',
    intentLabel: 'Out of scope',
    parameters: [],
    context: [],
    knowledge: [],
    tools: [],
    validation: [],
    action: {
      id: 'handoff',
      label: 'Offer human specialist',
      status: 'warning',
    },
    state: 'fallback',
    durationMs: 800,
    handoff: {
      reason: 'out_of_scope',
      message:
        'Я пока не могу сделать это сам. Это лучше решить со специалистом — он подключится к диалогу прямо сейчас. Или покажу, как это сделать в приложении.',
      options: [
        { id: 'human', label: 'Позвать специалиста', primary: true },
        { id: 'app', label: 'Показать в приложении', primary: false },
      ],
    },
  };

  const systemFacts = [
    `The user's request is out of scope for the assistant: "${request}".`,
    `Do not pretend you can fulfill it.`,
    `Offer two warm options: connect a human specialist, or show how to do it in the app.`,
    `Be concise and empathetic. Do NOT use the phrase "обратитесь в поддержку".`,
    `Address the customer as «вы».`,
  ];

  return { orchestration, systemFacts };
}

// ---------- Intent router ----------

async function buildFromIntent(
  intent: Intent,
  params: IntentParameters,
  userMessage: string,
  env: Env
): Promise<BlueprintResult> {
  switch (intent) {
    case 'explain_transaction':
      return buildExplain(params, userMessage, env);
    case 'credit_card_status':
      return buildUnderstand(userMessage, env);
    case 'transfer':
      return buildExecute(params, userMessage);
    case 'product_recommendation':
      return buildRecommend(params);
    case 'pay_utility_bill':
      return buildOrchestrate();
    case 'unknown':
      return buildIntentUnknownFallback();
  }
}

// ---------- System context для LLM ----------

function buildSystemContext(facts: string[], userMessage: string): string {
  return [
    'Ты — AI-ассистент digital banking.',
    '',
    'Ниже — достоверные факты, собранные оркестратором из банковских систем.',
    'Используй ТОЛЬКО эти значения. Не выдумывай цифры, даты, названия.',
    'Если в фактах есть правила из базы знаний (строки, начинающиеся с [имя-файла]),',
    'можешь опираться на них и объяснять клиенту, ссылаясь на правила банка.',
    'Если какого-то значения нет в фактах — не упоминай его вовсе.',
    '',
    'Тон: тёплый, уважительный, без канцелярита.',
    'НИКОГДА не пиши фразы вида «обратитесь в поддержку», «свяжитесь с поддержкой»,',
    '«позвоните по номеру». Если нужен человек — используй формулировку',
    '«я могу подключить специалиста».',
    '',
    'Факты:',
    ...facts.map((f) => `• ${f}`),
    '',
    'Запрос клиента:',
    userMessage,
    '',
    'Сформулируй краткий, конкретный ответ клиенту на русском языке.',
    'Используй реальные цифры из фактов. Обращайся на «вы».',
  ].join('\n');
}

// ---------- LLM ----------

async function callDeepSeek(
  systemContext: string,
  env: Env
): Promise<string> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.LLM_MODEL || 'deepseek-chat',
      messages: [{ role: 'user', content: systemContext }],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM request failed: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? '';
}

// ---------- Main handler ----------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({ status: 'ok' }, origin);
    }

        if (url.pathname === '/api/handoff' && request.method === 'POST') {
      try {
        const body = (await request.json()) as {
          conversationId: string;
          reason: string;
          message: string;
        };

        if (!body.conversationId) {
          return json(
            { error: 'conversationId is required' },
            origin,
            400
          );
        }

        // Имитация времени подключения оператора
        await new Promise((r) => setTimeout(r, 800));

        const operators = [
          { name: 'Анна', role: 'Специалист поддержки' },
          { name: 'Михаил', role: 'Специалист поддержки' },
          { name: 'Елена', role: 'Старший специалист' },
        ];
        const operator =
          operators[Math.floor(Math.random() * operators.length)];

        const ticketId = `HD-${Date.now().toString().slice(-6)}`;
        const eta = '1–2 минуты';

        // Сохраняем сообщение оператора в D1
        const operatorMessage =
          `Здравствуйте! Меня зовут ${operator.name}, я ${operator.role.toLowerCase()}. ` +
          `Возьму ваш вопрос на себя — обычно это занимает ${eta}. ` +
          `Ваш тикет: ${ticketId}.`;

        await env.DB.prepare(
          `INSERT INTO messages (id, conversation_id, user_id, timestamp, role, message)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(
            crypto.randomUUID(),
            body.conversationId,
            'demo_user',
            Date.now(),
            'assistant',
            operatorMessage
          )
          .run();

        return json(
          {
            status: 'connected',
            operator,
            eta,
            ticketId,
            message: operatorMessage,
          },
          origin
        );
      } catch (err) {
        return json(
          {
            error: 'handoff failed',
            details: err instanceof Error ? err.message : String(err),
          },
          origin,
          500
        );
      }
    }

    if (
      url.pathname === '/api/admin/index-knowledge' &&
      request.method === 'POST'
    ) {
      try {
        const result = await indexKnowledge(env);
        return json(
          {
            status: 'ok',
            documents: result.documents,
            chunks: result.chunks,
          },
          origin
        );
      } catch (err) {
        return json(
          {
            error: 'indexing failed',
            details: err instanceof Error ? err.message : String(err),
          },
          origin,
          500
        );
      }
    }

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const body = (await request.json()) as ChatRequestBody;
        const { message, conversationId, scenario } = body;

        if (!message || !conversationId) {
          return json(
            { error: 'message and conversationId are required' },
            origin,
            400
          );
        }

        await env.DB.prepare(
          `INSERT INTO messages (id, conversation_id, user_id, timestamp, role, message)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(
            crypto.randomUUID(),
            conversationId,
            'demo_user',
            Date.now(),
            'user',
            message
          )
          .run();

        const detected = await detectIntent(message, env);

        const { orchestration, systemFacts } = await buildFromIntent(
          detected.intent,
          detected.parameters,
          message,
          env
        );

        orchestration.confidence = detected.confidence;

        const systemContext = buildSystemContext(systemFacts, message);
        const answerText = await callDeepSeek(systemContext, env);

        await env.DB.prepare(
          `INSERT INTO messages (id, conversation_id, user_id, timestamp, role, message)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(
            crypto.randomUUID(),
            conversationId,
            'demo_user',
            Date.now(),
            'assistant',
            answerText
          )
          .run();

        await env.DB.prepare(
          `INSERT INTO conversations (id, user_id, title, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`
        )
          .bind(
            conversationId,
            'demo_user',
            message.slice(0, 60),
            Date.now(),
            Date.now()
          )
          .run();

        return json(
          {
            conversationId,
            message: { role: 'assistant', content: answerText },
            orchestration,
          },
          origin
        );
      } catch (err) {
        return json(
          {
            error: 'internal error',
            details: err instanceof Error ? err.message : String(err),
          },
          origin,
          500
        );
      }
    }

    if (url.pathname === '/api/execute' && request.method === 'POST') {
      try {
        const body = (await request.json()) as ExecuteRequestBody;

        if (!body.conversationId || !body.actionId) {
          return json(
            { error: 'conversationId and actionId are required' },
            origin,
            400
          );
        }

        await new Promise((r) => setTimeout(r, 600));

        const transactionId = `AI-${Date.now().toString().slice(-6)}`;

        const summary = (body.parameters || [])
          .map((p) => `${p.label}: ${p.value}`)
          .join(', ');

        const confirmationText = `Операция выполнена.\n\n${summary}\n\nTransaction ID: ${transactionId}`;

        await env.DB.prepare(
          `INSERT INTO messages (id, conversation_id, user_id, timestamp, role, message)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(
            crypto.randomUUID(),
            body.conversationId,
            'demo_user',
            Date.now(),
            'assistant',
            confirmationText
          )
          .run();

        return json(
          {
            status: 'completed',
            transactionId,
            message: confirmationText,
          },
          origin
        );
      } catch (err) {
        return json(
          {
            error: 'execute failed',
            details: err instanceof Error ? err.message : String(err),
          },
          origin,
          500
        );
      }
    }

    if (url.pathname === '/api/conversations' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT id, title, updated_at FROM conversations
         WHERE user_id = ?
         ORDER BY updated_at DESC
         LIMIT 20`
      )
        .bind('demo_user')
        .all();

      return json({ conversations: results }, origin);
    }

    if (url.pathname === '/api/messages' && request.method === 'GET') {
      const conversationId = url.searchParams.get('conversationId');
      if (!conversationId) {
        return json({ error: 'conversationId is required' }, origin, 400);
      }

      const { results } = await env.DB.prepare(
        `SELECT role, message, timestamp FROM messages
         WHERE conversation_id = ?
         ORDER BY timestamp ASC`
      )
        .bind(conversationId)
        .all();

      return json({ messages: results }, origin);
    }

    return json({ error: 'Not found' }, origin, 404);
  },
};