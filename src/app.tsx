import { useCallback, useState } from 'react';
import Header from './components/Header';
import ChatPanel from './components/ChatPanel';
import OrchestrationPanel from './components/OrchestrationPanel';
import ScenarioNav, { type ScenarioId } from './components/ScenarioNav';

const CONVERSATION_KEY = 'ai-banking:conversationId';

const ALL_SCENARIOS: ScenarioId[] = [
  'explain',
  'understand',
  'execute',
  'recommend',
  'orchestrate',
];

function readStoredConversationIds(): Partial<Record<ScenarioId, string>> {
  try {
    const raw = localStorage.getItem(CONVERSATION_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<ScenarioId, string>>) : {};
  } catch {
    return {};
  }
}

function writeStoredConversationIds(
  ids: Partial<Record<ScenarioId, string>>
) {
  try {
    localStorage.setItem(CONVERSATION_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function createConversationId(scenario: ScenarioId): string {
  return `${scenario}-${crypto.randomUUID()}`;
}

export default function App() {
  const [scenario, setScenario] = useState<ScenarioId>('explain');

  const [conversationIds, setConversationIds] = useState<
    Partial<Record<ScenarioId, string>>
  >(() => {
    const stored = readStoredConversationIds();
    const initial: Partial<Record<ScenarioId, string>> = { ...stored };
    ALL_SCENARIOS.forEach((s) => {
      if (!initial[s]) initial[s] = createConversationId(s);
    });
    writeStoredConversationIds(initial);
    return initial;
  });

  const [refreshKey, setRefreshKey] = useState(0);

  const currentConversationId =
    conversationIds[scenario] ?? createConversationId(scenario);

  function handleScenarioChange(next: ScenarioId) {
    if (next === scenario) {
      // Клик по активному сценарию = новый диалог
      const newId = createConversationId(next);
      const updated = { ...conversationIds, [next]: newId };
      setConversationIds(updated);
      writeStoredConversationIds(updated);
    }
    setScenario(next);
  }

  const handleSelectConversation = useCallback(
    (nextScenario: ScenarioId, conversationId: string) => {
      const updated = {
        ...conversationIds,
        [nextScenario]: conversationId,
      };
      setConversationIds(updated);
      writeStoredConversationIds(updated);
      setScenario(nextScenario);
    },
    [conversationIds]
  );

  // Триггер обновления списка после отправки сообщения
  function handleMessageSent() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="app">
      <Header />

      <div className="app__body">
        <ChatPanel
          scenario={scenario}
          conversationId={currentConversationId}
          onMessageSent={handleMessageSent}
        />
        <aside className="app__aside">
          <OrchestrationPanel
            scenario={scenario}
            activeConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            refreshKey={refreshKey}
          />
        </aside>
      </div>

      <div>
        <ScenarioNav active={scenario} onChange={handleScenarioChange} />
        <div className="app__footer-note">
          Synthetic data · Mock banking APIs · Concept only
        </div>
      </div>
    </div>
  );
}