import { useState } from 'react';
import Header from './components/Header';
import ChatPanel from './components/ChatPanel';
import OrchestrationPanel from './components/OrchestrationPanel';
import ScenarioNav, { type ScenarioId } from './components/ScenarioNav';

export default function App() {
  const [scenario, setScenario] = useState<ScenarioId>('explain');

  return (
    <div className="app">
      <Header />

      <div className="app__body">
        <ChatPanel />
        <aside className="app__aside">
          <OrchestrationPanel scenario={scenario} />
        </aside>
      </div>

      <div>
        <ScenarioNav active={scenario} onChange={setScenario} />
        <div className="app__footer-note">
          Synthetic data · Mock banking APIs · Concept only
        </div>
      </div>
    </div>
  );
}