# AI Assistant — Concept Prototype

> **A new interaction layer between the customer and banking services.**

Production-like full-stack prototype of an AI Assistant for digital banking. Built for demonstration of the product concept: how an AI assistant orchestrates access to banking capabilities while keeping authorization, business rules, risk controls and execution under the bank's control.

**This is a concept prototype. All customer data is synthetic. Banking backend is mocked.**

---

## Table of contents

- [Concept](#concept)
- [What it demonstrates](#what-it-demonstrates)
- [Architecture](#architecture)
- [The five scenarios](#the-five-scenarios)
- [Safety principles](#safety-principles)
- [Product view: how the assistant works](#product-view-how-the-assistant-works)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [Deployment](#deployment)
- [Environment variables](#environment-variables)
- [What is real and what is mocked](#what-is-real-and-what-is-mocked)
- [Roadmap](#roadmap)
- [Known limitations](#known-limitations)

---

## Concept

AI Assistant is **not another chatbot**. It is an intelligent interface to banking capabilities.

The main hypothesis of this prototype:

> The assistant should not become the bank. It should orchestrate access to banking capabilities while keeping authorization, business rules, risk controls and execution under the bank's control.

The prototype demonstrates the full pipeline from natural language to a completed banking action:

```
Natural language
      ↓
Intent
      ↓
Customer Context
      ↓
Knowledge / RAG
      ↓
Banking Tools
      ↓
Validation
      ↓
Confirmation
      ↓
Banking Action
      ↓
Result
```

Two architectural principles:

1. **AI is real. Banking backend is simulated.**
   - The LLM (DeepSeek) is a real API.
   - Intent, orchestration and tool calling are real.
   - Banking data and execution are synthetic and mocked.

2. **AI never authorizes financial operations.**
   - The assistant prepares operations (transfer, payment).
   - The customer confirms.
   - In production, the bank's existing authentication and authorization mechanisms would execute.

---

## What it demonstrates

- **Real LLM integration** — DeepSeek API via structured prompts.
- **Orchestration state machine** — every response carries a full orchestration object: intent, parameters, context, knowledge, tools, validation, action, state.
- **Tool layer** — a mock banking API with structured outputs (`get_credit_card_status`, `get_recipient`, `calculate_transfer_fee`, `parse_document`, etc.).
- **Customer context** — synthetic profile with accounts, cards, transactions, deposits.
- **Confirmation flow** — for transfers and payments, the assistant stops at `awaiting_confirmation` and shows a ConfirmationCard.
- **Chat history** — persistent conversations in Cloudflare D1.
- **Two views** — Customer view (chat + orchestration panel) and Product view (architecture, metrics, KPI).
- **Demo mode** — five pre-built scenarios, one click away.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                          Customer                              │
└───────────────────────────────┬────────────────────────────────┘
                                │ natural language
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                        AI Orchestrator                         │
│                                                                │
│  ┌──────┐  ┌──────┐  ┌─────────────────┐  ┌──────────────┐     │
│  │ LLM  │  │ RAG  │  │ Customer Context│  │ Banking Tools│     │
│  └──────┘  └──────┘  └─────────────────┘  └──────────────┘     │
│                                                                │
│  Guardrails: LLM has no direct access to banking systems.      │
└───────────────────────────────┬────────────────────────────────┘
                                │ structured orchestration
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                          Validation                            │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                         Confirmation                           │
│               (customer confirms the operation)                │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                    Bank's auth & authorization                 │
│               (in production; mocked in prototype)             │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                         Banking APIs                           │
└────────────────────────────────────────────────────────────────┘
```

### Frontend ↔ Backend

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  GitHub Pages (frontend)    │ fetch  │  Cloudflare Worker (backend) │
│                             │───────▶│                              │
│  React + Vite + TypeScript  │        │  - /api/chat                 │
│  - ChatPanel                │        │  - /api/execute              │
│  - OrchestrationPanel       │        │  - /api/conversations        │
│  - ConfirmationCard         │        │  - /api/messages             │
│  - DemoMode                 │        │                              │
└─────────────────────────────┘        │  ┌──────────────────┐        │
                                       │  │ DeepSeek API     │        │
                                       │  └──────────────────┘        │
                                       │  ┌──────────────────┐        │
                                       │  │ Cloudflare D1    │        │
                                       │  └──────────────────┘        │
                                       └──────────────────────────────┘
```

### Layers

- **UI** — React components (`src/components`).
- **API client** — typed fetch wrappers (`src/services/api.ts`).
- **Orchestrator** — scenario blueprints + system context for LLM (`worker/src/index.ts`).
- **Tools** — mock banking tools (`worker/src/tools/index.ts`).
- **Data** — synthetic customer and products (`worker/src/data`).
- **Storage** — Cloudflare D1 for conversations and messages.

---

## The five scenarios

The prototype demonstrates five scenarios of growing complexity.

### 01. Explain — Understand a transaction

**Customer job:** understand an unclear banking operation.

> «Почему с меня вчера списали 799 ₽?»

What happens:
1. Assistant resolves intent (`explain_transaction`).
2. Calls `get_transactions` and `get_fee_rules`.
3. Finds the transaction.
4. Uses knowledge (`fees.md`) to confirm no extra fee was charged.
5. Explains the result.

Demonstrates: **LLM + customer data + RAG**.

### 02. Understand — Credit card status

**Customer job:** know how much to pay to avoid interest.

> «Сколько мне нужно заплатить по кредитке в этом месяце, чтобы не платить проценты?»

What happens:
1. Assistant calls `get_credit_card_status`.
2. Uses knowledge (`credit_cards.md`) for grace period rules.
3. Returns concrete numbers: outstanding, minimum payment, grace end date.

Demonstrates: **deterministic calculation + RAG**.

### 03. Execute — Transfer money

**Customer job:** send money to another person.

> «Переведи Анне 50 000 ₽»

What happens:
1. Assistant extracts intent, recipient, amount.
2. Calls `get_recipient`, `get_account`, `calculate_transfer_fee`.
3. Validates amount limit and recipient.
4. Returns `state: awaiting_confirmation`.
5. Shows a ConfirmationCard.
6. After customer confirmation — mock execution returns a transaction ID.

Demonstrates: **state machine + confirmation gate**.

### 04. Recommend — Compare products

**Customer job:** choose where to place funds.

> «У меня есть 300 000 ₽. Куда лучше разместить их на 6 месяцев?»

What happens:
1. Assistant calls `get_products` and `calculate_deposit_return`.
2. Uses knowledge (`deposits.md`) for product conditions.
3. Shows three illustrative products with trade-offs (rate, liquidity, restrictions).
4. Does **not** label any option as "best".

Demonstrates: **trade-offs, no prescriptive answer**.

### 05. Orchestrate — Pay a utility bill

**Customer job:** solve a multi-step task, not call a single banking function.

> «Мне пришёл счёт за коммуналку. Проверь его и оплати.»

What happens:
1. Assistant parses the bill (`parse_document`).
2. Identifies supplier (`get_supplier`).
3. Matches the account (`match_customer_account`).
4. Validates (`validate_bill`).
5. Returns `state: awaiting_confirmation`.
6. Shows a ConfirmationCard.
7. After confirmation — mock execution returns a transaction ID.

Demonstrates: **multi-step agentic orchestration**.

---

## Safety principles

**The AI Assistant never authorizes a financial operation on its own.**

For transfers and payments, the flow is always:

```
Customer intent
      ↓
AI understands request
      ↓
Banking tools prepare the operation
      ↓
Validation
      ↓
Confirmation (customer clicks Confirm)
      ↓
Production: existing bank authentication / authorization
      ↓
Execution
```

In the prototype, authentication is simulated. The ConfirmationCard explicitly states:

> Production execution would use the bank's existing authentication and authorization mechanisms.

Additional guardrails:

- The LLM has **no direct access** to banking systems.
- The LLM only produces natural language responses. All banking data comes from orchestrated tool calls.
- All customer data and banking operations are synthetic.
- No real payment APIs are connected.

---

## Product view: how the assistant works

The **How Assistant works** tab in the UI provides the product perspective.

### Conceptual architecture

See [Architecture](#architecture).

### Illustrative demo metrics

| Metric | Value | Meaning |
|---|---|---|
| Task completion | 92% | Share of tasks completed without human escalation |
| Grounded answers | 96% | Answers backed by knowledge / customer data |
| Tool success | 98% | Successful banking tool calls |
| Average latency | 1.8s | Time from request to first token |
| Cost / successful task | $0.04 | Average cost per completed task |

### KPI logic

**Primary outcome:** Successful Task Completion Rate.

**Guardrails** (metrics that must not degrade):
- AI quality — grounded answers, no hallucinations
- Customer effort — number of steps a customer takes
- Latency — p50 and p95 response time
- Cost per successful task
- Safety — zero unauthorized financial operations
- Human handoff — share of escalations

**Anti-pattern:** optimizing the product for message count or assistant DAU. Those are vanity metrics. The assistant should increase the share of successfully resolved tasks, not chat engagement.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Backend | Cloudflare Workers |
| Storage | Cloudflare D1 (SQLite) |
| LLM | DeepSeek API (`deepseek-chat`) |
| Hosting | GitHub Pages (frontend), Cloudflare Workers (backend) |
| CI/CD | GitHub Actions |

---

## Project structure

```
ai-banking-assistant/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml          # GitHub Pages deployment
├── src/                              # Frontend
│   ├── components/
│   │   ├── ChatPanel.tsx
│   │   ├── ConfirmationCard.tsx
│   │   ├── CustomerView.tsx
│   │   ├── DemoMode.tsx
│   │   ├── Header.tsx
│   │   ├── OrchestrationPanel.tsx
│   │   ├── ProductView.tsx
│   │   ├── RecentConversations.tsx
│   │   ├── ScenarioNav.tsx
│   │   └── Sidebar.tsx
│   ├── data/
│   │   └── scenarios.ts              # SCENARIO_PROMPTS, SCENARIO_LABELS
│   ├── services/
│   │   └── api.ts                    # fetch wrappers
│   ├── types/
│   │   └── orchestration.ts          # shared types
│   ├── app.tsx
│   ├── main.tsx
│   └── styles.css
├── worker/                           # Backend
│   ├── migrations/
│   │   └── 0001_init.sql             # D1 schema
│   ├── src/
│   │   ├── data/
│   │   │   ├── customer.json         # synthetic customer
│   │   │   └── products.json         # synthetic deposit products
│   │   ├── tools/
│   │   │   └── index.ts              # mock banking tools
│   │   ├── index.ts                  # main worker + orchestrator
│   │   └── types.ts                  # shared types (duplicated)
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── BACKLOG.md
└── README.md
```

---

## Local development

### Prerequisites

- Node.js 20+
- npm 10+
- Git Bash (recommended for Windows users)
- Cloudflare account (for D1 and Worker deployment)

### Setup

```bash
git clone https://github.com/vbalulo-maker/ai-banking-assistant.git
cd ai-banking-assistant
npm install
```

### Frontend dev server

```bash
npm run dev
```

Open `http://localhost:5173`.

### Backend dev server (optional)

The frontend points to the deployed Cloudflare Worker by default. For local backend development:

```bash
cd worker
npm install
npm run dev
```

Wrangler will start a local Worker on `http://127.0.0.1:8787`.

To make the frontend talk to the local Worker, create `.env.local` in the project root:

```
VITE_API_BASE=http://127.0.0.1:8787
```

Restart the frontend dev server. This file is git-ignored.

### Worker secrets

Create `worker/.dev.vars` (git-ignored):

```
LLM_API_KEY=sk-...
```

---

## Deployment

### Frontend (GitHub Pages)

Deployed automatically via GitHub Actions on push to `main`. See `.github/workflows/deploy-pages.yml`.

Required secret in the repository: none (uses `VITE_API_BASE` from `.env.production`).

### Backend (Cloudflare Worker)

Currently deployed manually:

```bash
cd worker
npx wrangler deploy
```

Required setup (one-time):

1. Create D1 database:
   ```bash
   wrangler d1 create ai_banking
   ```
   Copy `database_id` into `worker/wrangler.toml`.

2. Apply migrations:
   ```bash
   wrangler d1 execute ai_banking --remote --file=migrations/0001_init.sql
   ```

3. Add secret:
   ```bash
   wrangler secret put LLM_API_KEY
   ```

### Auto-deployment of Worker (planned)

A GitHub Actions workflow for automatic Worker deployment is planned. See `[INFRA-020]` in `BACKLOG.md`.

---

## Environment variables

### Frontend (`.env.production`, `.env`, `.env.local`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE` | Base URL of the Cloudflare Worker | `https://ai-banking-api.example.workers.dev` |

### Backend (`worker/wrangler.toml` + secrets)

| Variable | Where | Description |
|---|---|---|
| `LLM_MODEL` | `wrangler.toml` `[vars]` | Model identifier, e.g. `deepseek-chat` |
| `LLM_API_KEY` | Cloudflare secret / `.dev.vars` | API key for the LLM provider |
| `DB` | D1 binding | D1 database binding, name `DB` |

**Never commit secrets.** `.env.local` and `.dev.vars` are git-ignored.

---

## What is real and what is mocked

| Component | Status |
|---|---|
| LLM (DeepSeek) | **Real API** |
| Intent / orchestration state machine | **Real** |
| Tool calling | **Real** (structured functions) |
| RAG pipeline | **Planned** (currently — hardcoded knowledge labels) |
| Customer data | **Synthetic** |
| Banking tools (`get_recipient`, `create_transfer`, etc.) | **Mock** |
| Execution of transfers / payments | **Mock** |
| Bank authentication | **Simulated** |
| Payment APIs | **Not connected** |

---

## Roadmap

Completed:

- [x] Two-panel layout (Chat + Orchestration)
- [x] Real LLM integration (DeepSeek)
- [x] Orchestration state contract
- [x] Mock banking tools with synthetic data
- [x] ConfirmationCard with state machine
- [x] Sidebar with persistent conversations (D1)
- [x] Demo mode with five scenarios
- [x] Product view (architecture, metrics, KPI)

Planned:

- [ ] **5.2** LLM-based intent detection (structured output) instead of scenario mapping
- [ ] **5.3** Tool interface abstraction (replace mock with real banking APIs)
- [ ] **5.4** RAG pipeline with embeddings (`knowledge/*.md` indexed in D1)
- [ ] **INFRA-020** Auto-deploy Worker via GitHub Actions
- [ ] **UI-055** Progress checklist in chat based on orchestration state
- [ ] **UI-084** ConfirmationCard: explicit action labels
- [ ] **REFACTOR-001** Split `styles.css` into modules

See `BACKLOG.md` for the full list.

---

## Known limitations

- **Synthetic customer data only.** No real banking data is used.
- **No real payment execution.** The `/api/execute` endpoint returns a mock transaction ID.
- **Bank authentication is simulated.** In production, the bank's existing authentication and authorization mechanisms would handle this.
- **RAG is not yet implemented.** Knowledge labels are hardcoded in the orchestration blueprint.
- **Intent detection is scenario-based.** The frontend sends an explicit `scenario` field; the LLM does not yet detect intent from the message alone.
- **Single demo customer.** No registration or authentication.
- **Cloudflare D1 free tier limits** may apply to long-running demos.

---

## Notes

This prototype is intended for demonstration purposes only. It is not production-ready and must not be used with real banking data or real financial operations.

**Synthetic data · Mock banking APIs · Concept only.**