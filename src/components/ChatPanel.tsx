import { useEffect, useRef, useState } from 'react';
import { sendChatMessage, fetchMessages } from '../services/api';
import { SCENARIO_PROMPTS } from '../data/scenarios';
import type { ScenarioId } from './ScenarioNav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  scenario: ScenarioId;
  conversationId: string;
  onMessageSent?: () => void;
}

export default function ChatPanel({
  scenario,
  conversationId,
  onMessageSent,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const loadedConversationRef = useRef<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isSending, isLoadingHistory]);

  // Загрузка истории при смене conversationId
  useEffect(() => {
    if (loadedConversationRef.current === conversationId) return;
    loadedConversationRef.current = conversationId;

    setMessages([]);
    setError(null);
    setIsLoadingHistory(true);

    let cancelled = false;

    (async () => {
      try {
        const history = await fetchMessages(conversationId);
        if (cancelled) return;

        if (history.length > 0) {
          setMessages(
            history.map((m) => ({ role: m.role, content: m.message }))
          );
        } else {
          // Пустая история — отправляем стартовый запрос сценария
          await runExchange(SCENARIO_PROMPTS[scenario]);
        }
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : 'Не удалось загрузить историю';
        setError(msg);
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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
      onMessageSent?.();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Не удалось получить ответ';
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
    if (!text || isSending || isLoadingHistory) return;

    setInput('');
    await runExchange(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as React.FormEvent);
    }
  }

  const isEmpty =
    messages.length === 0 && !isSending && !isLoadingHistory;

  return (
    <div className="chat">
      <div className="chat__messages" ref={scrollRef}>
        {isEmpty && (
          <div className="chat__empty">
            <h2 className="chat__empty-title">What can I help you with?</h2>
            <p className="chat__empty-subtitle">
              Выберите сценарий внизу или напишите свой запрос.
            </p>
          </div>
        )}

        {isLoadingHistory && (
          <div className="chat__history-loading">
            Loading conversation…
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
          disabled={isSending || isLoadingHistory}
        />
        <button
          type="submit"
          className="chat__send"
          disabled={!input.trim() || isSending || isLoadingHistory}
        >
          Send
        </button>
      </form>
    </div>
  );
}