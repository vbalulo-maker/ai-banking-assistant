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

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchConversations()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function handleClick(item: ConversationSummary) {
    const scenario = detectScenario(item.id);
    if (!scenario) return;
    onSelect(scenario, item.id);
  }

  return (
    <div className="recent">
      <h3 className="recent__title">Recent conversations</h3>

      {isLoading && <div className="recent__hint">Loading…</div>}
      {error && <div className="recent__hint recent__hint--error">{error}</div>}

      {!isLoading && !error && items.length === 0 && (
        <div className="recent__hint">No conversations yet</div>
      )}

      <ul className="recent__list">
        {items.slice(0, 8).map((item) => {
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
              >
                <span className="recent__item-title">
                  {item.title || '(no title)'}
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
    </div>
  );
}