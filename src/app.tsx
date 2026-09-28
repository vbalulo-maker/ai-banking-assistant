import { useCallback, useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import OrchestrationPanel from './components/OrchestrationPanel';
import ScenarioNav, { type ScenarioId } from './components/ScenarioNav';
import type { Orchestration } from './types/orchestration';

const CONVERSATION_KEY = 'ai-banking:conversationId';
const SIDEBAR_KEY = 'ai-banking:sidebarOpen';

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

function readStoredSidebarOpen(): boolean {
  try {
    const raw = localStorage.getItem(SIDEBAR_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

function writeStoredSidebarOpen(open: boolean) {
  try {
    localStorage.setItem(SIDEBAR_KEY, String(open));
  } catch {
    // ignore
  }
}

function createConversationId(scenario: ScenarioId): string {
  return `${scenario}-${crypto.randomUUID()}`;
}

export default function App() {
  const [scenario, setScenario] = useState<ScenarioId>('explain');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(
    readStoredSidebarOpen
  );
  const [orchestration, setOrchestration] = useState<Orchestration | null>(
    null
  );

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
      const newId = createConversationId(next);
      const updated = { ...conversationIds, [next]: newId };
      setConversationIds(updated);
      writeStoredConversationIds(updated);
    }
    setScenario(next);
  }

  const handleSelectConversation = useCallback(
    (nextScenario: ScenarioId, conversationId: string) => {
      const updated = { ...conversationIds, [nextScenario]: conversationId };
      setConversationIds(updated);
      writeStoredConversationIds(updated);
      setScenario(nextScenario);
    },
    [conversationIds]
  );

  function handleMessageSent() {
    setRefreshKey((k) => k + 1);
  }

  function handleToggleSidebar() {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    writeStoredSidebarOpen(next);
  }

  return (
    <div className={`app${sidebarOpen ? ' app--sidebar-open' : ''}`}>
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
      />

      <div className="app__body">
        <Sidebar
          open={sidebarOpen}
          activeConversationId={currentConversationId}
          onSelect={handleSelectConversation}
          refreshKey={refreshKey}
        />
        <ChatPanel
          scenario={scenario}
          conversationId={currentConversationId}
          onMessageSent={handleMessageSent}
          onOrchestrationChange={setOrchestration}
        />
        <aside className="app__aside">
          <OrchestrationPanel orchestration={orchestration} />
        </aside>
      </div>

      <footer className="app__footer">
        <ScenarioNav active={scenario} onChange={handleScenarioChange} />
        <div className="app__footer-note">
          Synthetic data · Mock banking APIs · Concept only
        </div>
      </footer>
    </div>
  );
}