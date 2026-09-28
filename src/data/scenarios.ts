import type { ScenarioId } from '../components/ScenarioNav';

export const SCENARIO_PROMPTS: Record<ScenarioId, string> = {
  explain: 'Почему с меня вчера списали 799 ₽?',
  understand:
    'Сколько мне нужно заплатить по кредитке в этом месяце, чтобы не платить проценты?',
  execute: 'Переведи Анне 50 000 ₽',
  recommend: 'У меня есть 300 000 ₽. Куда лучше разместить их на 6 месяцев?',
  orchestrate: 'Мне пришёл счёт за коммуналку. Проверь его и оплати.',
};

export const SCENARIO_LABELS: Record<ScenarioId, string> = {
  explain: 'Explain a transaction',
  understand: 'Understand credit card',
  execute: 'Transfer money',
  recommend: 'Compare products',
  orchestrate: 'Pay a utility bill',
};