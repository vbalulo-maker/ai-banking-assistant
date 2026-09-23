export type ScenarioId =
  | 'explain'
  | 'understand'
  | 'execute'
  | 'recommend'
  | 'orchestrate';

interface Scenario {
  id: ScenarioId;
  index: string;
  label: string;
}

const SCENARIOS: Scenario[] = [
  { id: 'explain', index: '01', label: 'Explain' },
  { id: 'understand', index: '02', label: 'Understand' },
  { id: 'execute', index: '03', label: 'Execute' },
  { id: 'recommend', index: '04', label: 'Recommend' },
  { id: 'orchestrate', index: '05', label: 'Orchestrate' },
];

interface ScenarioNavProps {
  active: ScenarioId;
  onChange: (id: ScenarioId) => void;
}

export default function ScenarioNav({ active, onChange }: ScenarioNavProps) {
  return (
    <nav className="scenario-nav">
      {SCENARIOS.map((scenario) => {
        const isActive = scenario.id === active;
        return (
          <button
            key={scenario.id}
            type="button"
            className={
              'scenario-nav__item' +
              (isActive ? ' scenario-nav__item--active' : '')
            }
            onClick={() => onChange(scenario.id)}
          >
            <span className="scenario-nav__index">{scenario.index}</span>
            <span>{scenario.label}</span>
          </button>
        );
      })}
    </nav>
  );
}