import type {
  Orchestration,
  OrchestrationItem,
  OrchestrationKnowledge,
  OrchestrationParameter,
  StatusKind,
} from './types';
import * as tools from './tools';

// ---------- Env ----------

interface Env {
  DB: D1Database;
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

// ---------- Types ----------

interface ChatRequestBody {
  message: string;
  conversationId: string;
  scenario: 'explain' | 'understand' | 'execute' | 'recommend' | 'orchestrate';
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

// ---------- Scenario builders ----------

interface BlueprintResult {
  orchestration: Orchestration;
  systemFacts: string[];
}

function buildExplain(): BlueprintResult {
  const txs = tools.getTransactions(5) as {
    transactions: {
      merchant: string;
      amount: number;
      date: string;
      fee: number;
    }[];
  };
  const tx = txs.transactions[0];

  const facts = [
    `Transaction found: ${tx.merchant}, ${formatRub(tx.amount)}, on ${tx.date}`,
    `Fee charged: ${formatRub(tx.fee)}`,
    `Fee rules: no additional bank fee was charged for this type of transaction`,
  ];

  const orchestration: Orchestration = {
    intent: 'explain_transaction',
    intentLabel: 'Explain transaction',
    parameters: [
      param('period', 'Period', 'last 7 days'),
      param('amount', 'Amount', formatRub(tx.amount)),
    ],
    context: [
      item('tx', `Transaction found: ${tx.merchant}, ${formatRub(tx.amount)}`),
    ],
    knowledge: [knowledge('fee_rules', 'Fee rules', 'fees.md')],
    tools: [
      item('get_transactions', 'get_transactions'),
      item('get_fee_rules', 'get_fee_rules'),
    ],
    validation: [],
    action: {
      id: 'generate_explanation',
      label: 'Generate explanation',
      status: 'success',
    },
    state: 'completed',
    durationMs: 1400,
  };

  return { orchestration, systemFacts: facts };
}

function buildUnderstand(): BlueprintResult {
  const cc = tools.getCreditCardStatus() as {
    masked: string;
    outstanding: number;
    minimumPayment: number;
    graceEndsAt: string;
    gracePeriodDays: number;
  };

  const facts = [
    `Credit card ${cc.masked}`,
    `Outstanding balance: ${formatRub(cc.outstanding)}`,
    `Minimum payment: ${formatRub(cc.minimumPayment)}`,
    `Grace period: ${cc.gracePeriodDays} days, ends ${cc.graceEndsAt}`,
    `To avoid interest, pay the full outstanding amount before grace period ends`,
  ];

  const orchestration: Orchestration = {
    intent: 'credit_card_status',
    intentLabel: 'Credit card status',
    parameters: [param('card', 'Card', cc.masked)],
    context: [
      item('cc_status', `Outstanding: ${formatRub(cc.outstanding)}`),
      item('cc_min', `Minimum payment: ${formatRub(cc.minimumPayment)}`),
      item('cc_grace', `Grace period ends: ${cc.graceEndsAt}`),
    ],
    knowledge: [
      knowledge('grace_rules', 'Grace period rules', 'credit_cards.md'),
    ],
    tools: [item('get_credit_card_status', 'get_credit_card_status')],
    validation: [item('deterministic_calc', 'Deterministic calculation')],
    action: {
      id: 'generate_explanation',
      label: 'Generate explanation',
      status: 'success',
    },
    state: 'completed',
    durationMs: 1400,
  };

  return { orchestration, systemFacts: facts };
}

function buildExecute(): BlueprintResult {
  const accountsResult = tools.getAccounts() as {
    accounts: { masked: string; balance: number }[];
  };
  const sourceAccount = accountsResult.accounts[0];

  const recipientResult = tools.getRecipient('Anna') as {
    recipient: {
      name: string;
      bank: string;
      accountMasked: string;
      verified: boolean;
    };
  };
  const r = recipientResult.recipient;

  const amount = 50000;
  const feeResult = tools.calculateTransferFee(amount) as { fee: number };
  const total = amount + feeResult.fee;

  const facts = [
    `Recipient verified: ${r.name}, ${r.bank}, account ${r.accountMasked}`,
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
      param('recipient', 'Recipient', r.name),
      param('amount', 'Amount', formatRub(amount)),
      param('fee', 'Fee', formatRub(feeResult.fee)),
      param('total', 'Total', formatRub(total)),
    ],
    context: [
      item('recipient', `Recipient found: ${r.name}`),
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

function buildRecommend(): BlueprintResult {
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

  const amount = 300000;
  const term = 6;

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
    context: [item('balance', `Available balance: ${formatRub(availableBalance)}`)],
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

function buildOrchestration(
  scenario: ChatRequestBody['scenario']
): BlueprintResult {
  switch (scenario) {
    case 'explain':
      return buildExplain();
    case 'understand':
      return buildUnderstand();
    case 'execute':
      return buildExecute();
    case 'recommend':
      return buildRecommend();
    case 'orchestrate':
      return buildOrchestrate();
  }
}

// ---------- System context для LLM ----------

function buildSystemContext(facts: string[], userMessage: string): string {
  return [
    'Ты — AI-ассистент digital banking.',
    '',
    'Ниже — достоверные факты, собранные оркестратором из банковских систем.',
    'Используй ТОЛЬКО эти значения. Не выдумывай цифры, даты, названия.',
    'Если какого-то значения нет в фактах — не упоминай его вовсе.',
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

async function callDeepSeek(systemContext: string, env: Env): Promise<string> {
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

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const body = (await request.json()) as ChatRequestBody;
        const { message, conversationId, scenario } = body;

        if (!message || !conversationId || !scenario) {
          return json(
            { error: 'message, conversationId and scenario are required' },
            origin,
            400
          );
        }

        // 1. Save user message
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

        // 2. Build orchestration + system facts
        const { orchestration, systemFacts } = buildOrchestration(scenario);

        // 3. LLM answer
        const systemContext = buildSystemContext(systemFacts, message);
        const answerText = await callDeepSeek(systemContext, env);

        // 4. Save assistant message
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

        // 5. Upsert conversation
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

        // Имитация задержки авторизации банком
        await new Promise((r) => setTimeout(r, 600));

        const transactionId = `AI-${Date.now().toString().slice(-6)}`;

        const summary = (body.parameters || [])
          .map((p) => `${p.label}: ${p.value}`)
          .join(', ');

        const confirmationText = `Операция выполнена.\n\n${summary}\n\nTransaction ID: ${transactionId}`;

        // Сохраняем как сообщение ассистента
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