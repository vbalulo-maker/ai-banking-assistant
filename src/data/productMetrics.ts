// Illustrative demo metrics. Не реальные значения.
// В проде эти метрики должны приходить из системы observability.

export interface Metric {
  label: string;
  value: string;
  hint?: string;
}

export interface KpiGroup {
  title: string;
  subtitle?: string;
  items: string[];
}

export const DEMO_METRICS: Metric[] = [
  {
    label: 'Task completion',
    value: '92%',
    hint: 'Доля задач, доведённых до конца без эскалации',
  },
  {
    label: 'Grounded answers',
    value: '96%',
    hint: 'Ответов с опорой на knowledge / customer data',
  },
  {
    label: 'Tool success',
    value: '98%',
    hint: 'Успешных вызовов banking tools',
  },
  {
    label: 'Average latency',
    value: '1.8s',
    hint: 'От запроса до первого токена ответа',
  },
  {
    label: 'Cost / successful task',
    value: '$0.04',
    hint: 'Средняя стоимость одной завершённой задачи',
  },
];

export const PRIMARY_OUTCOME = {
  label: 'Successful Task Completion Rate',
  description:
    'Единственная главная метрика. Всё остальное — либо её усиливает, либо ограничивает.',
};

export const GUARDRAILS: KpiGroup = {
  title: 'Guardrails',
  subtitle:
    'Метрики, которые нельзя ухудшать ради роста primary outcome.',
  items: [
    'AI quality — grounded answers, отсутствие галлюцинаций',
    'Customer effort — сколько шагов делает клиент',
    'Latency — p50 и p95 времени ответа',
    'Cost per successful task',
    'Safety — 0 неавторизованных финансовых операций',
    'Human handoff — доля эскалаций на оператора',
  ],
};

export const ARCHITECTURE_STEPS: { label: string; sub?: string[] }[] = [
  { label: 'Customer' },
  { label: 'Intent' },
  {
    label: 'AI Orchestrator',
    sub: [
      'LLM',
      'RAG',
      'Customer Context',
      'Banking Tools',
      'External Tools',
      'Guardrails',
    ],
  },
  { label: 'Validation' },
  { label: 'Confirmation' },
  { label: 'Banking APIs' },
];