import type { ScenarioId } from '../components/ScenarioNav';

export type StatusKind = 'success' | 'warning' | 'progress';

export interface LineItem {
  label: string;
  status?: StatusKind;
}

export interface Section {
  title: string;
  items: LineItem[];
}

export interface ScenarioData {
  intent: string;
  sections: Section[];
  action: {
    label: string;
    status: StatusKind;
  };
}

export const SCENARIO_DATA: Record<ScenarioId, ScenarioData> = {
  explain: {
    intent: 'Explain transaction',
    sections: [
      {
        title: 'Parameters',
        items: [
          { label: 'Period: last 7 days' },
          { label: 'Amount: 799 ₽' },
        ],
      },
      {
        title: 'Customer context',
        items: [
          { label: 'Transaction found', status: 'success' },
          { label: 'Merchant resolved', status: 'success' },
        ],
      },
      {
        title: 'Knowledge',
        items: [{ label: 'Fee rules', status: 'success' }],
      },
      {
        title: 'Tools',
        items: [
          { label: 'get_transactions', status: 'success' },
          { label: 'get_fee_rules', status: 'success' },
        ],
      },
      {
        title: 'Validation',
        items: [
          { label: 'Amount matches', status: 'success' },
          { label: 'No extra fee', status: 'success' },
        ],
      },
    ],
    action: { label: 'Generate explanation', status: 'success' },
  },

  understand: {
    intent: 'Credit card status',
    sections: [
      {
        title: 'Parameters',
        items: [{ label: 'Card: ••41' }],
      },
      {
        title: 'Customer context',
        items: [
          { label: 'Credit card status', status: 'success' },
          { label: 'Grace period: ends 18 Sep', status: 'success' },
        ],
      },
      {
        title: 'Knowledge',
        items: [{ label: 'Grace period rules', status: 'success' }],
      },
      {
        title: 'Tools',
        items: [
          { label: 'get_credit_card_status', status: 'success' },
        ],
      },
      {
        title: 'Calculation',
        items: [
          { label: 'Deterministic calculation', status: 'success' },
        ],
      },
    ],
    action: { label: 'Generate explanation', status: 'success' },
  },

  execute: {
    intent: 'Transfer',
    sections: [
      {
        title: 'Parameters',
        items: [
          { label: 'Recipient: Anna Petrova' },
          { label: 'Amount: 50 000 ₽' },
        ],
      },
      {
        title: 'Customer context',
        items: [
          { label: 'Recipient found', status: 'success' },
          { label: 'Account ••82 available', status: 'success' },
        ],
      },
      {
        title: 'Tools',
        items: [
          { label: 'get_recipient', status: 'success' },
          { label: 'get_account', status: 'success' },
          { label: 'calculate_transfer_fee', status: 'success' },
          { label: 'create_transfer', status: 'progress' },
        ],
      },
      {
        title: 'Validation',
        items: [
          { label: 'Amount limit', status: 'success' },
          { label: 'Recipient verified', status: 'success' },
        ],
      },
    ],
    action: { label: 'Confirmation required', status: 'warning' },
  },

  recommend: {
    intent: 'Product recommendation',
    sections: [
      {
        title: 'Parameters',
        items: [
          { label: 'Amount: 300 000 ₽' },
          { label: 'Term: 6 months' },
        ],
      },
      {
        title: 'Customer context',
        items: [{ label: 'Available balance', status: 'success' }],
      },
      {
        title: 'Knowledge',
        items: [{ label: 'Product conditions', status: 'success' }],
      },
      {
        title: 'Tools',
        items: [
          { label: 'get_products', status: 'success' },
          { label: 'calculate_return', status: 'success' },
        ],
      },
      {
        title: 'Decision',
        items: [{ label: 'Compare scenarios', status: 'success' }],
      },
    ],
    action: { label: 'Generate recommendation', status: 'success' },
  },

  orchestrate: {
    intent: 'Pay utility bill',
    sections: [
      {
        title: 'Document',
        items: [
          { label: 'Document identified', status: 'success' },
          { label: 'Supplier: Example Energy', status: 'success' },
          { label: 'Account ••••4832 matched', status: 'success' },
          { label: 'Amount: 7 842 ₽', status: 'success' },
          { label: 'Due date: 20 Sep', status: 'success' },
        ],
      },
      {
        title: 'Tools',
        items: [
          { label: 'parse_document', status: 'success' },
          { label: 'get_supplier', status: 'success' },
          { label: 'match_customer_account', status: 'success' },
          { label: 'validate_bill', status: 'success' },
          { label: 'create_payment', status: 'progress' },
        ],
      },
      {
        title: 'Validation',
        items: [
          { label: 'Payment prepared', status: 'success' },
          { label: 'Limits checked', status: 'success' },
        ],
      },
    ],
    action: { label: 'Confirmation required', status: 'warning' },
  },
};