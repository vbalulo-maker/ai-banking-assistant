import { useState } from 'react';
import type { OrchestrationParameter } from '../types/orchestration';

type CardState =
  | 'idle'
  | 'preparing'
  | 'authorizing'
  | 'executing'
  | 'completed'
  | 'failed';

interface ConfirmationCardProps {
  parameters: OrchestrationParameter[];
  actionLabel: string;
  onConfirm: () => Promise<{ transactionId: string } | void>;
  onEdit: () => void;
}

export default function ConfirmationCard({
  parameters,
  actionLabel,
  onConfirm,
  onEdit,
}: ConfirmationCardProps) {
  const [state, setState] = useState<CardState>('idle');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function handleConfirm() {
    setErrorText(null);
    setState('preparing');
    await sleep(400);
    setState('authorizing');
    await sleep(400);
    setState('executing');

    try {
      const result = await onConfirm();
      await sleep(300);
      if (result && 'transactionId' in result) {
        setTransactionId(result.transactionId);
      }
      setState('completed');
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Execution failed');
      setState('failed');
    }
  }

  const isBusy =
    state === 'preparing' || state === 'authorizing' || state === 'executing';

  return (
    <div className="confirm-card">
      <div className="confirm-card__header">
        <span className="confirm-card__label">{actionLabel}</span>
        {state === 'completed' && (
          <span className="confirm-card__badge confirm-card__badge--success">
            Completed
          </span>
        )}
        {state === 'failed' && (
          <span className="confirm-card__badge confirm-card__badge--error">
            Failed
          </span>
        )}
      </div>

      <div className="confirm-card__body">
        {parameters.map((p) => (
          <div key={p.name} className="confirm-card__row">
            <span className="confirm-card__row-label">{p.label}</span>
            <span className="confirm-card__row-value">{p.value}</span>
          </div>
        ))}
      </div>

      {state === 'idle' && (
        <div className="confirm-card__actions">
          <button
            type="button"
            className="confirm-card__btn confirm-card__btn--primary"
            onClick={handleConfirm}
          >
            Confirm {actionLabel.toLowerCase()}
          </button>
          <button
            type="button"
            className="confirm-card__btn confirm-card__btn--ghost"
            onClick={onEdit}
          >
            Edit
          </button>
        </div>
      )}

      {isBusy && (
        <div className="confirm-card__progress">
          <ProgressStep label="Preparing" active={state === 'preparing'} done={stateAfter(state, 'preparing')} />
          <ProgressStep label="Authorizing" active={state === 'authorizing'} done={stateAfter(state, 'authorizing')} />
          <ProgressStep label="Executing" active={state === 'executing'} done={stateAfter(state, 'executing')} />
        </div>
      )}

      {state === 'completed' && (
        <div className="confirm-card__success">
          <div className="confirm-card__success-icon">✓</div>
          <div className="confirm-card__success-text">
            Operation completed
            {transactionId && (
              <div className="confirm-card__transaction-id">
                Transaction ID: {transactionId}
              </div>
            )}
          </div>
        </div>
      )}

      {state === 'failed' && (
        <div className="confirm-card__error">
          {errorText || 'Operation failed. Try again or contact support.'}
        </div>
      )}

      <div className="confirm-card__footer">
        Production execution would use the bank's existing authentication
        and authorization mechanisms.
      </div>
    </div>
  );
}

function ProgressStep({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  const cls =
    'confirm-card__progress-step' +
    (active ? ' confirm-card__progress-step--active' : '') +
    (done ? ' confirm-card__progress-step--done' : '');
  return (
    <div className={cls}>
      <span className="confirm-card__progress-icon">
        {done ? '✓' : active ? '→' : '·'}
      </span>
      <span>{label}</span>
    </div>
  );
}

function stateAfter(current: CardState, step: CardState): boolean {
  const order: CardState[] = [
    'idle',
    'preparing',
    'authorizing',
    'executing',
    'completed',
  ];
  return order.indexOf(current) > order.indexOf(step);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}