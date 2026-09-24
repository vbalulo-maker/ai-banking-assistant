import { useEffect, useRef, useState } from 'react';
import { sendChatMessage } from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CONVERSATION_KEY = 'ai-banking:conversationId';

function getOrCreateConversationId(): string {
  const existing = localStorage.getItem(CONVERSATION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(CONVERSATION_KEY, created);
  return created;
}

export default function ChatPanel() {
  const [conversationId] = useState<string>(getOrCreateConversationId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isSending]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    setError(null);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setIsSending(true);

    try {
      const res = await sendChatMessage({
        message: text,
        conversationId,
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.content },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Не удалось получить ответ';
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Не удалось получить ответ от ассистента. Попробуйте ещё раз.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="chat">
      <div className="chat__messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat__empty">
            <h2 className="chat__empty-title">What can I help you with?</h2>
            <p className="chat__empty-subtitle">
              Например: «Переведи Анне 50 000 ₽» или «Почему вчера списали 799 ₽?»
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={
              'chat__message' +
              (msg.role === 'user'
                ? ' chat__message--user'
                : ' chat__message--assistant')
            }
          >
            <div className="chat__message-role">
              {msg.role === 'user' ? 'Вы' : 'Assistant'}
            </div>
            <div className="chat__message-content">{msg.content}</div>
          </div>
        ))}

        {isSending && (
          <div className="chat__message chat__message--assistant">
            <div className="chat__message-role">Assistant</div>
            <div className="chat__message-content chat__message-content--typing">
              <span className="chat__dot" />
              <span className="chat__dot" />
              <span className="chat__dot" />
            </div>
          </div>
        )}

        {error && <div className="chat__error">{error}</div>}
      </div>

      <form className="chat__input-form" onSubmit={handleSubmit}>
        <textarea
          className="chat__input"
          placeholder="Например: «Переведи Анне 50 000 ₽»"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isSending}
        />
        <button
          type="submit"
          className="chat__send"
          disabled={!input.trim() || isSending}
        >
          Send
        </button>
      </form>
    </div>
  );
}