import { useEffect, useRef, useState } from 'react';
import { sendChatMessage } from '../services/api';
import { SCENARIO_PROMPTS } from '../data/scenarios';
import type { ScenarioId } from './ScenarioNav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  scenario: ScenarioId;
  conversationId: string;
}

export default function ChatPanel({ scenario, conversationId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const previousConversationRef = useRef<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isSending]);

  // Автоматическая отправка стартового запроса при смене сценария
  useEffect(() => {
    if (previousConversationRef.current === conversationId) return;
    previousConversationRef.current = conversationId;

    setMessages([]);
    setError(null);

    const starterPrompt = SCENARIO_PROMPTS[scenario];
    void runExchange(starterPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  async function runExchange(userText: string) {
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setIsSending(true);

    try {
      const res = await sendChatMessage({
        message: userText,
        conversationId,
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.content },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось получить ответ';
      setError(msg);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    setInput('');
    await runExchange(text);
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
        {messages.length === 0 && !isSending && (
          <div className="chat__empty">
            <h2 className="chat__empty-title">What can I help you with?</h2>
            <p className="chat__empty-subtitle">
              Выберите сценарий внизу или напишите свой запрос.
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