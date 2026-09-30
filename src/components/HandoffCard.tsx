import type { Handoff, HandoffOption } from '../types/orchestration';

interface HandoffCardProps {
  handoff: Handoff;
  onOption: (optionId: HandoffOption['id']) => void;
}

const REASON_TITLES: Record<Handoff['reason'], string> = {
  intent_unknown: 'Не уверен, что понял',
  missing_data: 'Не хватает данных',
  out_of_scope: 'Не могу сделать сам',
  error: 'Что-то пошло не так',
};

export default function HandoffCard({ handoff, onOption }: HandoffCardProps) {
  const title = REASON_TITLES[handoff.reason] ?? 'Нужна помощь?';

  return (
    <div className="handoff-card">
      <div className="handoff-card__header">
        <span className="handoff-card__icon" aria-hidden="true">
          ⓘ
        </span>
        <span className="handoff-card__title">{title}</span>
      </div>

      <p className="handoff-card__message">{handoff.message}</p>

      <div className="handoff-card__actions">
        {handoff.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={
              'handoff-card__btn' +
              (option.primary
                ? ' handoff-card__btn--primary'
                : ' handoff-card__btn--ghost')
            }
            onClick={() => onOption(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}