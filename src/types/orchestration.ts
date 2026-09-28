export type StatusKind = 'success' | 'warning' | 'progress' | 'error' | 'skipped';

export type OrchestrationState =
  | 'completed'
  | 'awaiting_confirmation'
  | 'failed'
  | 'fallback';

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
  error?: OrchestrationError;
}

export interface ChatRequest {
  message: string;
  conversationId: string;
  scenario: 'explain' | 'understand' | 'execute' | 'recommend' | 'orchestrate';
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

export interface ExecuteRequest {
  conversationId: string;
  actionId: string;
  parameters: OrchestrationParameter[];
  action?: string;
}

export interface ExecuteResponse {
  status: 'completed' | 'failed';
  transactionId: string;
  message: string;
}