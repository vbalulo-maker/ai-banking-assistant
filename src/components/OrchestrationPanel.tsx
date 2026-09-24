import { useState } from 'react';
import CustomerView from './CustomerView';
import ProductView from './ProductView';
import type { ScenarioId } from './ScenarioNav';

type ViewMode = 'customer' | 'product';

interface OrchestrationPanelProps {
  scenario: ScenarioId;
}

export default function OrchestrationPanel({ scenario }: OrchestrationPanelProps) {
  const [view, setView] = useState<ViewMode>('customer');

  return (
    <div className="orch-panel">
      <div className="orch-panel__switch">
        <button
          type="button"
          className={
            'orch-panel__switch-btn' +
            (view === 'customer' ? ' orch-panel__switch-btn--active' : '')
          }
          onClick={() => setView('customer')}
        >
          Customer view
        </button>
        <button
          type="button"
          className={
            'orch-panel__switch-btn' +
            (view === 'product' ? ' orch-panel__switch-btn--active' : '')
          }
          onClick={() => setView('product')}
        >
          Product view
        </button>
      </div>

      <div className="orch-panel__body">
        {view === 'customer' ? (
          <CustomerView scenario={scenario} />
        ) : (
          <ProductView />
        )}
      </div>
    </div>
  );
}