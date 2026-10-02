import { useEffect, useRef, useState } from 'react';
import { sendChatMessage, fetchMessages, requestHumanHandoff } from '../services/api';
import ConfirmationCard from './ConfirmationCard';
import ClarificationCard from './ClarificationCard';
import DemoMode from './DemoMode';
import HandoffCard from './HandoffCard';
import type { ScenarioId } from './ScenarioNav';
import type {
  Orchestration,
  HandoffOption,
} from '../types/orchestration';

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
  const [isClarifying, setIsClarifying] = useState(false);
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
  }, [messages, isSending, isLoadingHistory, orchestrationForCard, isClarifying]);

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

  useEffect(() => {
    if (!pendingPrompt) return;
    if (isLoadingHistory || isSending) return;

    if (messages.length > 0) {
      onPendingPromptConsumed?.();
      return;
    }

    const text = pendingPrompt;
    onPendingPromptConsumed?.();
    void runExchange(text, { withScenarioHint: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt, isLoadingHistory, isSending, messages.length]);

  async function runExchange(
    userText: string,
    options?: { withScenarioHint?: boolean }
  ) {
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setIsSending(true);

    try {
      const res = await sendChatMessage({
        message: userText,
        conversationId,
        scenario: options?.withScenarioHint ? scenario : undefined,
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

    async function handleHandoffOption(optionId: HandoffOption['id']) {
    if (optionId === 'retry') {
      setOrchestrationForCard(null);
      onOrchestrationChange(null);
      const textarea = document.querySelector<HTMLTextAreaElement>(
        '.chat__input'
      );
      textarea?.focus();
      return;
    }

    if (optionId === 'human') {
      if (!orchestrationForCard?.handoff) return;

      setOrchestrationForCard(null);
      onOrchestrationChange(null);
      setIsClarifying(true);

      // Показываем сообщение-заглушку "Подключаем..."
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Подключаю специалиста…',
        },
      ]);

      try {
        const res = await requestHumanHandoff({
          conversationId,
          reason: orchestrationForCard.handoff.reason,
          message: orchestrationForCard.handoff.message,
        });

        // Убираем "Подключаю..." и добавляем сообщение оператора
        setMessages((prev) => {
          const withoutLast = prev.slice(0, -1);
          return [
            ...withoutLast,
            {
              role: 'assistant',
              content: `${res.message}\n\nОжидаемое время: ${res.eta}.`,
            },
          ];
        });

        onMessageSent?.();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Не удалось подключить специалиста';
        setMessages((prev) => {
          const withoutLast = prev.slice(0, -1);
          return [
            ...withoutLast,
            {
              role: 'assistant',
              content: `Не удалось подключить специалиста: ${msg}. Попробуйте позже или напишите вопрос в чате — я постараюсь помочь.`,
            },
          ];
        });
      } finally {
        setIsClarifying(false);
      }

      return;
    }

    if (optionId === 'app') {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Откройте приложение банка → раздел «Мои продукты» → выберите нужный продукт. Если что-то пойдёт не так — я рядом и помогу.',
        },
      ]);
      setOrchestrationForCard(null);
      onOrchestrationChange(null);
      onMessageSent?.();
      return;
    }
  }

  async function handleClarificationSubmit(
    values: Record<string, string>
  ) {
    if (!orchestrationForCard?.clarification) return;

    setIsClarifying(true);
    setError(null);

    const clarification = orchestrationForCard.clarification;

    // Собираем расширенный запрос: исходный + уточнения
    const additions: string[] = [];
    clarification.inputs.forEach((input) => {
      const value = values[input.name]?.trim();
      if (!value) return;
      if (input.kind === 'phone') {
        additions.push(`телефон ${value}`);
      } else if (input.kind === 'amount') {
        additions.push(`сумма ${value}`);
      } else {
        additions.push(`${input.label.toLowerCase()}: ${value}`);
      }
    });

    const extendedQuery = additions.length
      ? `${clarification.originalQuery}, ${additions.join(', ')}`
      : clarification.originalQuery;

    // Показываем пользователю, что он ввёл, как обычное сообщение
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: extendedQuery },
    ]);

    // Скрываем карточку уточнения
    setOrchestrationForCard(null);
    onOrchestrationChange(null);

    try {
      const res = await sendChatMessage({
        message: extendedQuery,
        conversationId,
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
            'Не удалось продолжить операцию. Попробуйте ещё раз.',
        },
      ]);
    } finally {
      setIsClarifying(false);
    }
  }

  const isEmpty =
    messages.length === 0 && !isSending && !isLoadingHistory;

  const showConfirmation =
    orchestrationForCard !== null &&
    orchestrationForCard.state === 'awaiting_confirmation' &&
    onConfirmOperation !== undefined;

  const showHandoff =
    orchestrationForCard !== null &&
    orchestrationForCard.state === 'fallback' &&
    orchestrationForCard.handoff !== undefined;

  const showClarification =
    orchestrationForCard !== null &&
    orchestrationForCard.state === 'needs_input' &&
    orchestrationForCard.clarification !== undefined;

  return (
    <div className="chat">
      <div className="chat__messages" ref={scrollRef}>
        {isEmpty && onDemoScenario && (
          <DemoMode onSelect={onDemoScenario} />
        )}

        {isEmpty && !onDemoScenario && (
          <div className="chat__empty">
            <h2 className="chat__empty-title">Чем могу помочь?</h2>
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
              {msg.role === 'user' ? 'Вы' : 'ИИ-ассистент'}
            </div>
            <div className="chat__message-content">{msg.content}</div>
          </div>
        ))}

        {isSending && !isClarifying && (
          <div className="chat__message chat__message--assistant">
            <div className="chat__message-role">ИИ-ассистент</div>
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

        {showClarification && orchestrationForCard?.clarification && (
          <div className="chat__clarification">
            <ClarificationCard
              clarification={orchestrationForCard.clarification}
              onSubmit={handleClarificationSubmit}
              isSubmitting={isClarifying}
            />
          </div>
        )}

        {showConfirmation && orchestrationForCard && (
          <div className="chat__confirmation">
            <ConfirmationCard
              parameters={orchestrationForCard.parameters}
              intent={orchestrationForCard.intent}
              onConfirm={handleConfirm}
              onEdit={handleEdit}
            />
          </div>
        )}

        {showHandoff && orchestrationForCard?.handoff && (
          <div className="chat__handoff">
            <HandoffCard
              handoff={orchestrationForCard.handoff}
              onOption={handleHandoffOption}
            />
          </div>
        )}

        {error && <div className="chat__error">{error}</div>}
      </div>

      <form className="chat__input-form" onSubmit={handleSubmit}>
        <textarea
          className="chat__input"
          placeholder="Напишите, что вам нужно сделать"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isSending || isLoadingHistory || isClarifying}
        />
        <button
          type="submit"
          className="chat__send"
          disabled={!input.trim() || isSending || isLoadingHistory || isClarifying}
        >
          Отправить
        </button>
      </form>
    </div>
  );
}