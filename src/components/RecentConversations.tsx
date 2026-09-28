import { useEffect, useState } from 'react';
import { fetchConversations, type ConversationSummary } from '../services/api';
import type { ScenarioId } from './ScenarioNav';

const KNOWN_SCENARIOS: ScenarioId[] = [
  'explain',
  'understand',
  'execute',
  'recommend',
  'orchestrate',
];

function detectScenario(id: string): ScenarioId | null {
  for (const s of KNOWN_SCENARIOS) {
    if (id.startsWith(`${s}-`)) return s;
  }
  return null;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days} d ago`;
}

function truncateTitle(title: string, max = 42): string {
  if (!title) return '(no title)';
  if (title.length <= max) return title;
  return title.slice(0, max).trimEnd() + '…';
}

interface RecentConversationsProps {
  activeConversationId: string;
  onSelect: (scenario: ScenarioId, conversationId: string) => void;
  refreshKey: number;
}

export default function RecentConversations({
  activeConversationId,
  onSelect,
  refreshKey,
}: RecentConversationsProps) {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchConversations();
      setItems(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Не удалось загрузить историю'
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  function handleClick(item: ConversationSummary) {
    const scenario = detectScenario(item.id);
    if (!scenario) return;
    onSelect(scenario, item.id);
  }

  return (
    <div className="recent">
      <div className="recent__header">
        <h3 className="recent__title">Recent conversations</h3>
        <button
          type="button"
          className="recent__refresh"
          onClick={() => void load()}
          aria-label="Refresh conversations"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {isLoading && items.length === 0 && (
        <div className="recent__hint">Loading…</div>
      )}

      {error && !isLoading && (
        <div className="recent__hint recent__hint--error">
          {error}
          <button
            type="button"
            className="recent__retry"
            onClick={() => void load()}
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="recent__hint">No conversations yet</div>
      )}

      {items.length > 0 && (
        <ul className="recent__list">
          {items.slice(0, 20).map((item) => {
            const scenario = detectScenario(item.id);
            const isActive = item.id === activeConversationId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={
                    'recent__item' + (isActive ? ' recent__item--active' : '')
                  }
                  onClick={() => handleClick(item)}
                  disabled={!scenario}
                  title={item.title}
                >
                  <span className="recent__item-title">
                    {truncateTitle(item.title)}
                  </span>
                  <span className="recent__item-meta">
                    {scenario ? scenario : 'unknown'} ·{' '}
                    {formatRelativeTime(item.updated_at)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}