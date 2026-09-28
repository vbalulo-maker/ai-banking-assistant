import {
  DEMO_METRICS,
  PRIMARY_OUTCOME,
  GUARDRAILS,
  ARCHITECTURE_STEPS,
} from '../data/productMetrics';

export default function ProductView() {
  return (
    <div className="product">
      <section className="product__intro">
        <h2 className="product__intro-title">How Assistant works</h2>
        <p className="product__intro-text">
          AI Assistant — это не ещё один чат. Это слой оркестрации между
          клиентом и банковскими сервисами. Задача ассистента — понять
          намерение клиента, подобрать нужные capabilities, провести
          валидацию и передать управление банковским системам, сохранив
          авторизацию и risk controls за банком.
        </p>
      </section>

      <section className="product__section">
        <h3 className="product__section-title">Conceptual architecture</h3>
        <ol className="arch">
          {ARCHITECTURE_STEPS.map((step, i) => (
            <li key={step.label} className="arch__step">
              <div className="arch__node">
                <span className="arch__label">{step.label}</span>
                {step.sub && (
                  <ul className="arch__sub">
                    {step.sub.map((s) => (
                      <li key={s} className="arch__sub-item">
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {i < ARCHITECTURE_STEPS.length - 1 && (
                <span className="arch__arrow" aria-hidden="true">
                  ↓
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="product__section">
        <h3 className="product__section-title">
          Illustrative demo metrics
        </h3>
        <p className="product__section-note">
          Демонстрационные значения. В продакшене — из системы observability.
        </p>
        <div className="metrics">
          {DEMO_METRICS.map((m) => (
            <div key={m.label} className="metrics__card">
              <div className="metrics__value">{m.value}</div>
              <div className="metrics__label">{m.label}</div>
              {m.hint && <div className="metrics__hint">{m.hint}</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="product__section">
        <h3 className="product__section-title">KPI logic</h3>

        <div className="kpi">
          <div className="kpi__primary">
            <div className="kpi__primary-label">Primary outcome</div>
            <div className="kpi__primary-value">
              {PRIMARY_OUTCOME.label}
            </div>
            <p className="kpi__primary-desc">
              {PRIMARY_OUTCOME.description}
            </p>
          </div>

          <div className="kpi__guardrails">
            <div className="kpi__guardrails-title">
              {GUARDRAILS.title}
            </div>
            {GUARDRAILS.subtitle && (
              <p className="kpi__guardrails-subtitle">
                {GUARDRAILS.subtitle}
              </p>
            )}
            <ul className="kpi__guardrails-list">
              {GUARDRAILS.items.map((item) => (
                <li key={item} className="kpi__guardrails-item">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="product__antipattern">
          Anti-pattern: оптимизировать продукт по количеству сообщений или DAU
          ассистента. Это метрики vanity. Ассистент должен увеличивать долю
          успешно решённых задач, а не вовлечённость в чат.
        </p>
      </section>
    </div>
  );
}