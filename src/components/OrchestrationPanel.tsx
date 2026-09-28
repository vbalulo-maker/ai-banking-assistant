import { useState } from 'react';
import CustomerView from './CustomerView';
import ProductView from './ProductView';
import type { Orchestration } from '../types/orchestration';

type ViewMode = 'customer' | 'product';

interface OrchestrationPanelProps {
  orchestration: Orchestration | null;
}

export default function OrchestrationPanel({
  orchestration,
}: OrchestrationPanelProps) {
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
          Assistant workflow
        </button>
        <button
          type="button"
          className={
            'orch-panel__switch-btn' +
            (view === 'product' ? ' orch-panel__switch-btn--active' : '')
          }
          onClick={() => setView('product')}
        >
          How Assistant works
        </button>
      </div>

      <div className="orch-panel__body">
        {view === 'customer' ? (
          <CustomerView orchestration={orchestration} />
        ) : (
          <ProductView />
        )}
      </div>
    </div>
  );
}