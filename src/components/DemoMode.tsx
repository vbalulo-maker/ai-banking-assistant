import { SCENARIO_PROMPTS } from '../data/scenarios';
import type { ScenarioId } from './ScenarioNav';

interface DemoScenario {
  id: ScenarioId;
  title: string;
  description: string;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'explain',
    title: 'Explain a transaction',
    description: 'Понять непонятное списание по карте',
  },
  {
    id: 'understand',
    title: 'Understand credit card',
    description: 'Сколько платить, чтобы не попасть на проценты',
  },
  {
    id: 'execute',
    title: 'Transfer money',
    description: 'Подготовить и подтвердить перевод',
  },
  {
    id: 'recommend',
    title: 'Compare products',
    description: 'Куда разместить средства на 6 месяцев',
  },
  {
    id: 'orchestrate',
    title: 'Pay a utility bill',
    description: 'Проверить счёт и оплатить коммуналку',
  },
];

interface DemoModeProps {
  onSelect: (scenario: ScenarioId) => void;
}

export default function DemoMode({ onSelect }: DemoModeProps) {
  return (
    <div className="demo">
      <h2 className="demo__title">What can I help you with?</h2>
      <p className="demo__subtitle">
        Выберите сценарий или напишите свой запрос.
      </p>

      <div className="demo__grid">
        {DEMO_SCENARIOS.map((scenario, i) => (
          <button
            key={scenario.id}
            type="button"
            className="demo__card"
            onClick={() => onSelect(scenario.id)}
          >
            <span className="demo__card-index">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="demo__card-title">{scenario.title}</span>
            <span className="demo__card-description">
              {scenario.description}
            </span>
            <span className="demo__card-prompt">
              «{SCENARIO_PROMPTS[scenario.id]}»
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}