import { useEffect, useRef, useState } from 'react';
import { sendChatMessage, fetchMessages } from '../services/api';
import ConfirmationCard from './ConfirmationCard';
import DemoMode from './DemoMode';
import type { ScenarioId } from './ScenarioNav';
import type { Orchestration } from '../types/orchestration';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  scenario: ScenarioId;
  conversationId: string;
  onMessageSent?: () => void;
  onOrchestrationChange: (orchestration: Orchestration | null) => void;
  onConfirmOperation?: (
    orchestration: Orchestration
  ) => Promise<{ transactionId: string } | void>;
  onEditOperation?: () => void;
  onDemoScenario?: (scenario: ScenarioId) => void;
  pendingPrompt?: string | null;
  onPendingPromptConsumed?: () => void;
}

export default function ChatPanel({
  scenario,
  conversationId,
  onMessageSent,
  onOrchestrationChange,
  onConfirmOperation,
  onEditOperation,
  onDemoScenario,
  pendingPrompt,
  onPendingPromptConsumed,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orchestrationForCard, setOrchestrationForCard] =
    useState<Orchestration | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isSending, isLoadingHistory, orchestrationForCard]);

  // Загрузка истории при смене conversationId.
  // Используем requestId вместо cancelled-флага, чтобы избежать
  // проблемы с React.StrictMode (двойной вызов useEffect в dev-режиме).
  useEffect(() => {
    const requestId = ++requestIdRef.current;

    setMessages([]);
    setError(null);
    setOrchestrationForCard(null);
    onOrchestrationChange(null);
    setIsLoadingHistory(true);

    (async () => {
      try {
        const history = await fetchMessages(conversationId);
        if (requestId !== requestIdRef.current) return;

        if (history.length > 0) {
          setMessages(
            history.map((m) => ({ role: m.role, content: m.message }))
          );
        }
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        const msg =
          err instanceof Error ? err.message : 'Не удалось загрузить историю';
        setError(msg);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoadingHistory(false);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Отложенный стартовый запрос от родителя (Demo Mode / ScenarioNav).
  useEffect(() => {
    if (!pendingPrompt) return;
    if (isLoadingHistory || isSending) return;

    if (messages.length > 0) {
      onPendingPromptConsumed?.();
      return;
    }

    const text = pendingPrompt;
    onPendingPromptConsumed?.();
    void runExchange(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt, isLoadingHistory, isSending, messages.length]);

  async function runExchange(userText: string) {
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setIsSending(true);

    try {
      const res = await sendChatMessage({
        message: userText,
        conversationId,
        scenario,
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.message.content },
      ]);
      setOrchestrationForCard(res.orchestration);
      onOrchestrationChange(res.orchestration);
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
      setOrchestrationForCard(null);
      onOrchestrationChange(null);
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

  async function handleConfirm() {
    if (!orchestrationForCard || !onConfirmOperation) return;
    const result = await onConfirmOperation(orchestrationForCard);

    setOrchestrationForCard((prev) =>
      prev ? { ...prev, state: 'completed' } : prev
    );
    onOrchestrationChange(null);

    if (result && 'transactionId' in result) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Операция выполнена. Transaction ID: ${result.transactionId}`,
        },
      ]);
    }

    onMessageSent?.();
  }

  function handleEdit() {
    onEditOperation?.();
    const textarea = document.querySelector<HTMLTextAreaElement>(
      '.chat__input'
    );
    textarea?.focus();
  }

  const isEmpty =
    messages.length === 0 && !isSending && !isLoadingHistory;

  const showConfirmation =
    orchestrationForCard !== null &&
    orchestrationForCard.state === 'awaiting_confirmation' &&
    onConfirmOperation !== undefined;

  return (
    <div className="chat">
      <div className="chat__messages" ref={scrollRef}>
        {isEmpty && onDemoScenario && (
          <DemoMode onSelect={onDemoScenario} />
        )}

        {isEmpty && !onDemoScenario && (
          <div className="chat__empty">
            <h2 className="chat__empty-title">What can I help you with?</h2>
            <p className="chat__empty-subtitle">
              Выберите сценарий внизу или напишите свой запрос.
            </p>
          </div>
        )}

        {isLoadingHistory && (
          <div className="chat__history-loading">
            <span className="chat__dot" />
            <span className="chat__dot" />
            <span className="chat__dot" />
            <span className="chat__history-label">Loading conversation…</span>
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
              <span className="chat__typing-label">
                Generating response…
              </span>
            </div>
          </div>
        )}

        {showConfirmation && orchestrationForCard && (
          <div className="chat__confirmation">
            <ConfirmationCard
              parameters={orchestrationForCard.parameters}
              actionLabel={orchestrationForCard.intentLabel}
              onConfirm={handleConfirm}
              onEdit={handleEdit}
            />
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