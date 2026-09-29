// ВАЖНО: этот файл дублируется в src/types/orchestration.ts (фронт).
// При изменении типов — обновить оба файла.

export type StatusKind =
  | 'success'
  | 'warning'
  | 'progress'
  | 'error'
  | 'skipped';

export type OrchestrationState =
  | 'completed'
  | 'awaiting_confirmation'
  | 'failed'
  | 'fallback';

export type Intent =
  | 'explain_transaction'
  | 'credit_card_status'
  | 'transfer'
  | 'product_recommendation'
  | 'pay_utility_bill'
  | 'unknown';

export interface IntentParameters {
  // transfer
  recipient?: string;
  amount?: number;

  // explain_transaction
  period?: string;
  merchant?: string;

  // product_recommendation
  term?: number;

  // общее
  [key: string]: string | number | undefined;
}

export interface IntentDetectionResult {
  intent: Intent;
  parameters: IntentParameters;
  confidence: number;
  reasoning: string;
}

export interface OrchestrationItem {
  id: string;
  label: string;
  status: StatusKind;
  durationMs?: number;
}

export interface OrchestrationParameter {
  name: string;
  label: string;
  value: string;
}

export interface OrchestrationKnowledge extends OrchestrationItem {
  source: string;
}

export interface OrchestrationAction {
  id: string;
  label: string;
  status: StatusKind;
}

export interface OrchestrationError {
  code: string;
  message: string;
}

export interface Orchestration {
  intent: string;
  intentLabel: string;
  parameters: OrchestrationParameter[];
  context: OrchestrationItem[];
  knowledge: OrchestrationKnowledge[];
  tools: OrchestrationItem[];
  validation: OrchestrationItem[];
  action: OrchestrationAction;
  state: OrchestrationState;
  durationMs: number;
  confidence?: number;
  error?: OrchestrationError;
}

export interface ChatRequest {
  message: string;
  conversationId: string;
  scenario?:
    | 'explain'
    | 'understand'
    | 'execute'
    | 'recommend'
    | 'orchestrate';
}

export interface ChatResponse {
  conversationId: string;
  message: {
    role: 'assistant';
    content: string;
  };
  orchestration: Orchestration;
}

export interface ApiError {
  error: string;
  details?: string;
}

export interface KnowledgeChunkRow {
  id: string;
  source: string;
  chunk_index: number;
  content: string;
  embedding: string;
  created_at: number;
}

export interface RetrievedChunk {
  source: string;
  content: string;
  score: number;
}