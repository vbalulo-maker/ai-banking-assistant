import type { Orchestration, StatusKind } from '../types/orchestration';

const STATUS_ICON: Record<StatusKind, string> = {
  success: '✓',
  warning: '⚠',
  progress: '→',
  error: '✗',
  skipped: '—',
};

interface CustomerViewProps {
  orchestration: Orchestration | null;
}

export default function CustomerView({ orchestration }: CustomerViewProps) {
  if (!orchestration) {
    return (
      <div className="orch">
        <section className="orch__section">
          <p className="orch__placeholder">
            Orchestration появится после первого сообщения ассистенту.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="orch">
      <section className="orch__section">
        <h3 className="orch__section-title">Intent</h3>
        <div className="orch__intent">{orchestration.intentLabel}</div>
      </section>

      {orchestration.parameters.length > 0 && (
        <section className="orch__section">
          <h3 className="orch__section-title">Parameters</h3>
          <ul className="orch__list">
            {orchestration.parameters.map((p) => (
              <li key={p.name} className="orch__item">
                <span className="orch__label">
                  {p.label}: {p.value}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {orchestration.context.length > 0 && (
        <section className="orch__section">
          <h3 className="orch__section-title">Customer context</h3>
          <ul className="orch__list">
            {orchestration.context.map((item) => (
              <li key={item.id} className="orch__item">
                <span
                  className={`orch__icon orch__icon--${item.status}`}
                  aria-hidden="true"
                >
                  {STATUS_ICON[item.status]}
                </span>
                <span className="orch__label">{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {orchestration.knowledge.length > 0 && (
        <section className="orch__section">
          <h3 className="orch__section-title">Knowledge</h3>
          <ul className="orch__list">
            {orchestration.knowledge.map((item) => (
              <li key={item.id} className="orch__item">
                <span
                  className={`orch__icon orch__icon--${item.status}`}
                  aria-hidden="true"
                >
                  {STATUS_ICON[item.status]}
                </span>
                <span className="orch__label">
                  {item.label}
                  <span className="orch__source"> · {item.source}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {orchestration.tools.length > 0 && (
        <section className="orch__section">
          <h3 className="orch__section-title">Tools</h3>
          <ul className="orch__list">
            {orchestration.tools.map((item) => (
              <li key={item.id} className="orch__item">
                <span
                  className={`orch__icon orch__icon--${item.status}`}
                  aria-hidden="true"
                >
                  {STATUS_ICON[item.status]}
                </span>
                <span className="orch__label">{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {orchestration.validation.length > 0 && (
        <section className="orch__section">
          <h3 className="orch__section-title">Validation</h3>
          <ul className="orch__list">
            {orchestration.validation.map((item) => (
              <li key={item.id} className="orch__item">
                <span
                  className={`orch__icon orch__icon--${item.status}`}
                  aria-hidden="true"
                >
                  {STATUS_ICON[item.status]}
                </span>
                <span className="orch__label">{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="orch__section">
        <h3 className="orch__section-title">Action</h3>
        <div className={`orch__action orch__action--${orchestration.action.status}`}>
          <span className="orch__action-icon">
            {STATUS_ICON[orchestration.action.status]}
          </span>
          <span>{orchestration.action.label}</span>
        </div>
      </section>
    </div>
  );
}