import type {
  Orchestration,
  OrchestrationItem,
  OrchestrationKnowledge,
  OrchestrationParameter,
  StatusKind,
} from './types';

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

// ---------- Types для запроса ----------

interface ChatRequestBody {
  message: string;
  conversationId: string;
  scenario: 'explain' | 'understand' | 'execute' | 'recommend' | 'orchestrate';
}

// ---------- Вспомогательные фабрики ----------

function item(
  id: string,
  label: string,
  status: StatusKind = 'success',
  durationMs?: number
): OrchestrationItem {
  return durationMs !== undefined
    ? { id, label, status, durationMs }
    : { id, label, status };
}

function param(name: string, label: string, value: string): OrchestrationParameter {
  return { name, label, value };
}

function knowledge(
  id: string,
  label: string,
  source: string,
  status: StatusKind = 'success'
): OrchestrationKnowledge {
  return { id, label, source, status };
}

// ---------- Mock: определения сценариев ----------

interface ScenarioBlueprint {
  intent: string;
  intentLabel: string;
  parameters: OrchestrationParameter[];
  context: OrchestrationItem[];
  knowledge: OrchestrationKnowledge[];
  tools: OrchestrationItem[];
  validation: OrchestrationItem[];
  action: { id: string; label: string; status: StatusKind };
  state: 'completed' | 'awaiting_confirmation';
}

function buildOrchestration(
  scenario: ChatRequestBody['scenario'],
  userMessage: string
): { orchestration: Orchestration; systemContext: string } {
  const startedAt = Date.now();

  let blueprint: ScenarioBlueprint;

  switch (scenario) {
    case 'explain': {
      blueprint = {
        intent: 'explain_transaction',
        intentLabel: 'Explain transaction',
        parameters: [
          param('period', 'Period', 'last 7 days'),
          param('amount', 'Amount', '799 ₽'),
        ],
        context: [item('tx', 'Transaction found')],
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
      };
      break;
    }

    case 'understand': {
      blueprint = {
        intent: 'credit_card_status',
        intentLabel: 'Credit card status',
        parameters: [param('card', 'Card', '••41')],
        context: [
          item('cc_status', 'Credit card status'),
          item('cc_grace', 'Grace period: ends 18 Sep'),
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
      };
      break;
    }

    case 'execute': {
      blueprint = {
        intent: 'transfer',
        intentLabel: 'Transfer',
        parameters: [
          param('recipient', 'Recipient', 'Anna Petrova'),
          param('amount', 'Amount', '50 000 ₽'),
        ],
        context: [
          item('recipient', 'Recipient found'),
          item('account', 'Account ••82 available'),
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
      };
      break;
    }

    case 'recommend': {
      blueprint = {
        intent: 'product_recommendation',
        intentLabel: 'Product recommendation',
        parameters: [
          param('amount', 'Amount', '300 000 ₽'),
          param('term', 'Term', '6 months'),
        ],
        context: [item('balance', 'Available balance')],
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
      };
      break;
    }

    case 'orchestrate': {
      blueprint = {
        intent: 'pay_utility_bill',
        intentLabel: 'Pay utility bill',
        parameters: [
          param('supplier', 'Supplier', 'Example Energy'),
          param('amount', 'Amount', '7 842 ₽'),
          param('due_date', 'Due date', '20 Sep'),
        ],
        context: [
          item('doc', 'Document identified'),
          item('supplier', 'Supplier identified'),
          item('account', 'Account ••••4832 matched'),
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
      };
      break;
    }
  }

  const durationMs = Date.now() - startedAt + 1200;

  const orchestration: Orchestration = {
    intent: blueprint.intent,
    intentLabel: blueprint.intentLabel,
    parameters: blueprint.parameters,
    context: blueprint.context,
    knowledge: blueprint.knowledge,
    tools: blueprint.tools,
    validation: blueprint.validation,
    action: blueprint.action,
    state: blueprint.state,
    durationMs,
  };

  const systemContext = buildSystemContext(orchestration, userMessage);

  return { orchestration, systemContext };
}

function buildSystemContext(o: Orchestration, userMessage: string): string {
  const lines: string[] = [];
  lines.push('Контекст, собранный оркестратором AI Assistant:');
  lines.push(`- Intent: ${o.intentLabel}`);
  if (o.parameters.length) {
    lines.push('- Parameters:');
    o.parameters.forEach((p) => lines.push(`  • ${p.label}: ${p.value}`));
  }
  if (o.context.length) {
    lines.push('- Customer context:');
    o.context.forEach((c) => lines.push(`  • ${c.label}`));
  }
  if (o.knowledge.length) {
    lines.push('- Knowledge used:');
    o.knowledge.forEach((k) => lines.push(`  • ${k.label} (${k.source})`));
  }
  if (o.tools.length) {
    lines.push('- Tools called:');
    o.tools.forEach((t) => lines.push(`  • ${t.label}`));
  }
  if (o.validation.length) {
    lines.push('- Validation:');
    o.validation.forEach((v) => lines.push(`  • ${v.label}`));
  }
  lines.push('');
  lines.push('Запрос клиента:');
  lines.push(userMessage);
  lines.push('');
  lines.push(
    'Сформулируй краткий, дружелюбный ответ клиенту на русском языке, опираясь только на этот контекст. Если данных недостаточно — честно скажи об этом и предложи следующий шаг.'
  );
  return lines.join('\n');
}

// ---------- LLM вызов ----------

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
      messages: [
        {
          role: 'system',
          content:
            'Ты — AI-ассистент digital banking. Отвечай кратко, по делу, на русском языке.',
        },
        { role: 'user', content: systemContext },
      ],
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

        // 2. Build orchestration
        const { orchestration, systemContext } = buildOrchestration(
          scenario,
          message
        );

        // 3. Call LLM for final answer
        const answerText = await callDeepSeek(systemContext, env);

        // 4. Save assistant message (только текст)
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

        // 6. Ответ
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