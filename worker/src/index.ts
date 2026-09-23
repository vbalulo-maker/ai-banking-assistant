export interface Env {
  DB: D1Database;
  LLM_API_KEY: string;
  LLM_MODEL: string;
}

const ALLOWED_ORIGINS = [
  'https://vbalulo-maker.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // --- Health ---
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({ status: 'ok' }, origin);
    }

    // --- Chat ---
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const body = (await request.json()) as {
          message: string;
          conversationId: string;
        };
        const { message, conversationId } = body;

        if (!message || !conversationId) {
          return json({ error: 'message and conversationId are required' }, origin, 400);
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

        // 2. Call DeepSeek
        const llmResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
              { role: 'user', content: message },
            ],
          }),
        });

        if (!llmResponse.ok) {
          const errText = await llmResponse.text();
          return json(
            { error: 'LLM request failed', details: errText },
            origin,
            502
          );
        }

        const llmData = (await llmResponse.json()) as {
          choices: { message: { content: string } }[];
        };
        const assistantText = llmData.choices?.[0]?.message?.content ?? '';

        // 3. Save assistant message
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
            assistantText
          )
          .run();

        // 4. Upsert conversation
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

        return json({ content: assistantText, conversationId }, origin);
      } catch (err) {
        return json(
          { error: 'internal error', details: String(err) },
          origin,
          500
        );
      }
    }

    // --- Conversations list ---
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

    // --- Messages of a conversation ---
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