import { SCENARIO_DATA } from '../data/scenarios';
import type { ScenarioId } from './ScenarioNav';
import type { StatusKind } from '../data/scenarios';

const STATUS_ICON: Record<StatusKind, string> = {
  success: '✓',
  warning: '⚠',
  progress: '→',
};

interface CustomerViewProps {
  scenario: ScenarioId;
}

export default function CustomerView({ scenario }: CustomerViewProps) {
  const data = SCENARIO_DATA[scenario];

  return (
    <div className="orch">
      <section className="orch__section">
        <h3 className="orch__section-title">Intent</h3>
        <div className="orch__intent">{data.intent}</div>
      </section>

      {data.sections.map((section) => (
        <section key={section.title} className="orch__section">
          <h3 className="orch__section-title">{section.title}</h3>
          <ul className="orch__list">
            {section.items.map((item, i) => (
              <li key={i} className="orch__item">
                {item.status && (
                  <span
                    className={`orch__icon orch__icon--${item.status}`}
                    aria-hidden="true"
                  >
                    {STATUS_ICON[item.status]}
                  </span>
                )}
                <span className="orch__label">{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="orch__section">
        <h3 className="orch__section-title">Action</h3>
        <div className={`orch__action orch__action--${data.action.status}`}>
          <span className="orch__action-icon">
            {STATUS_ICON[data.action.status]}
          </span>
          <span>{data.action.label}</span>
        </div>
      </section>
    </div>
  );
}