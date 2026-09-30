import { useState } from 'react';
import type { Clarification, ClarificationInput } from '../types/orchestration';

interface ClarificationCardProps {
  clarification: Clarification;
  onSubmit: (values: Record<string, string>) => void;
  isSubmitting?: boolean;
}

export default function ClarificationCard({
  clarification,
  onSubmit,
  isSubmitting = false,
}: ClarificationCardProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    clarification.inputs.forEach((input) => {
      initial[input.name] = '';
    });
    return initial;
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function handleChange(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleBlur(name: string) {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    const allValid = clarification.inputs.every((input) => {
      if (!input.required) return true;
      return values[input.name]?.trim().length > 0;
    });

    if (!allValid) {
      const allTouched: Record<string, boolean> = {};
      clarification.inputs.forEach((input) => {
        allTouched[input.name] = true;
      });
      setTouched(allTouched);
      return;
    }

    onSubmit(values);
  }

  return (
    <form className="clarification-card" onSubmit={handleSubmit}>
      <div className="clarification-card__header">
        <span className="clarification-card__icon" aria-hidden="true">
          ?
        </span>
        <span className="clarification-card__title">Уточнение</span>
      </div>

      <p className="clarification-card__prompt">{clarification.prompt}</p>

      <div className="clarification-card__fields">
        {clarification.inputs.map((input) => (
          <FieldRow
            key={input.name}
            input={input}
            value={values[input.name] ?? ''}
            onChange={(v) => handleChange(input.name, v)}
            onBlur={() => handleBlur(input.name)}
            showError={
              Boolean(touched[input.name]) &&
              Boolean(input.required) &&
              !values[input.name]?.trim()
            }
          />
        ))}
      </div>

      <button
        type="submit"
        className="clarification-card__submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Отправка…' : 'Продолжить'}
      </button>
    </form>
  );
}

function FieldRow({
  input,
  value,
  onChange,
  onBlur,
  showError,
}: {
  input: ClarificationInput;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  showError: boolean;
}) {
  const inputType = input.kind === 'phone' ? 'tel' : 'text';

  return (
    <label className="clarification-card__field">
      <span className="clarification-card__field-label">{input.label}</span>
      <input
        type={inputType}
        className={
          'clarification-card__input' +
          (showError ? ' clarification-card__input--error' : '')
        }
        placeholder={input.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={input.kind === 'phone' ? 'tel' : 'off'}
        autoFocus={input.kind === 'phone'}
      />
      {showError && (
        <span className="clarification-card__error">
          Пожалуйста, заполните это поле
        </span>
      )}
    </label>
  );
}