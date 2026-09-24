const API_BASE = import.meta.env.VITE_API_BASE;

if (!API_BASE) {
  // Подсказка разработчику: переменная не подхватилась
  console.warn(
    '[api] VITE_API_BASE is not set. Проверь .env / .env.production.'
  );
}

export interface ChatRequest {
  message: string;
  conversationId: string;
}

export interface ChatResponse {
  content: string;
  conversationId: string;
}

export interface ApiError {
  error: string;
  details?: string;
}

export async function sendChatMessage(
  payload: ChatRequest
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as ChatResponse | ApiError;

  if (!res.ok || 'error' in data) {
    const err = data as ApiError;
    throw new Error(err.details || err.error || `HTTP ${res.status}`);
  }

  return data as ChatResponse;
}

export async function fetchConversations(): Promise<
  { id: string; title: string; updated_at: number }[]
> {
  const res = await fetch(`${API_BASE}/api/conversations`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as {
    conversations: { id: string; title: string; updated_at: number }[];
  };
  return data.conversations;
}

export async function fetchMessages(conversationId: string): Promise<
  { role: 'user' | 'assistant'; message: string; timestamp: number }[]
> {
  const res = await fetch(
    `${API_BASE}/api/messages?conversationId=${encodeURIComponent(conversationId)}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as {
    messages: { role: 'user' | 'assistant'; message: string; timestamp: number }[];
  };
  return data.messages;
}