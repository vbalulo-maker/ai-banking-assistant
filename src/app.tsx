import { useState } from 'react';
import Header from './components/Header';
import ChatPanel from './components/ChatPanel';
import OrchestrationPanel from './components/OrchestrationPanel';
import ScenarioNav, { type ScenarioId } from './components/ScenarioNav';

const CONVERSATION_KEY = 'ai-banking:conversationId';

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
    // Убедимся, что для каждого сценария есть ID
    const initial: Partial<Record<ScenarioId, string>> = { ...stored };
    (Object.keys({
      explain: 1,
      understand: 1,
      execute: 1,
      recommend: 1,
      orchestrate: 1,
    }) as ScenarioId[]).forEach((s) => {
      if (!initial[s]) initial[s] = createConversationId(s);
    });
    writeStoredConversationIds(initial);
    return initial;
  });

  function handleScenarioChange(next: ScenarioId) {
    if (next === scenario) {
      // Тот же сценарий: явно создаём новый диалог
      const newId = createConversationId(next);
      const updated = { ...conversationIds, [next]: newId };
      setConversationIds(updated);
      writeStoredConversationIds(updated);
    }
    setScenario(next);
  }

  const currentConversationId =
    conversationIds[scenario] ?? createConversationId(scenario);

  return (
    <div className="app">
      <Header />

      <div className="app__body">
        <ChatPanel
          scenario={scenario}
          conversationId={currentConversationId}
        />
        <aside className="app__aside">
          <OrchestrationPanel scenario={scenario} />
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