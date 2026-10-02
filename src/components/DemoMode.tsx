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
    title: 'Объяснить списание',
    description: 'Понять непонятную операцию по карте',
  },
  {
    id: 'understand',
    title: 'Статус кредитки',
    description: 'Сколько заплатить, чтобы не попасть на проценты',
  },
  {
    id: 'execute',
    title: 'Перевести деньги',
    description: 'Подготовить и подтвердить перевод',
  },
  {
    id: 'recommend',
    title: 'Подобрать продукт',
    description: 'Куда разместить средства на 6 месяцев',
  },
  {
    id: 'orchestrate',
    title: 'Оплатить коммуналку',
    description: 'Проверить счёт и оплатить',
  },
];

interface DemoModeProps {
  onSelect: (scenario: ScenarioId) => void;
}

export default function DemoMode({ onSelect }: DemoModeProps) {
  return (
    <div className="demo">
      <h2 className="demo__title">Чем могу помочь?</h2>
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