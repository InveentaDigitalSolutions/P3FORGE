# P3 Forge — Copilot Instructions v5.0
# Read this before generating ANY code, flow, query, schema, or configuration.
# This is the authoritative reference. If code conflicts with this file, fix the code.
# For detailed flow logic, prompt management, seed data, and business rules: see LOGIC.md
# For Copilot Studio topic-by-topic build guide: see COPILOT_STUDIO.md
# For agent interaction rules, dependencies, timeouts, circuit breaker: see AGENT_RULES.md
# For agent-to-agent communication protocol and deliberation loops: see AGENT_COMMS.md
# For the living requirements registry — data model, agents, deliberation loops: see REQUIREMENTS_REGISTRY.md

---

## What this product is

**P3 Forge** is P3 Group's agentic software delivery platform. Every app P3 delivers
connects at go-live. Clients submit tickets via Microsoft Teams in any language. Agents
structure requirements, confirm understanding, design using 4 specialist agents in
parallel, build all platform components simultaneously, test, and deploy. P3 managers
appear at two gates that shrink as trust grows. Full autopilot is the end goal.

**Tagline:** Describe it. We forge it.

---

## Tech stack

| Layer | Technology |
|---|---|
| Manager UI | Power Apps Code App — React 18 + TypeScript + Fluent UI v9 |
| Data | Microsoft Dataverse — solution `P3Forge_v1`, prefix `p3f` |
| Agent orchestration | Power Automate cloud flows + Azure OpenAI GPT-4o |
| AI fallback | GPT-4o-mini (non-critical agents when GPT-4o unavailable) |
| Teams intake | Copilot Studio Teams Agent — hosted on P3 tenant |
| Specialist agents | 4× Power Automate + GPT-4o, always parallel |
| Code build agent | GitHub Actions + Claude Code |
| PA / DV / CS build agents | GitHub Actions + PAC CLI |
| Auth | MSAL.js v3 + Azure AD — clients access via P3 tenant guest access |
| Dataverse API | Web API v9.2 |
| Notifications | Power Automate → Teams adaptive cards |
| Deployment | PAC CLI: pac solution, pac flow, pac canvas, pac copilot |
| Secrets | Azure Key Vault — never hardcode credentials |

---

## Environment strategy

### Current (Phase 1 — now)

**One shared P3 environment for everything.**

```
P3 Forge Environment (single)
  └── All clients share this environment
  └── Data isolation: every table has p3f_clientid — always filter by it
  └── All build agents target this environment
  └── Customers access via this environment (guest access to P3 tenant)
  └── PAC CLI var: PP_ENV_URL (single GitHub Secret)
```

### Future (when deployed to client) — architecture ready but not built yet

```
Client Dev Environment    ← build agents
Client Test Environment   ← integration testing
Client Prod Environment   ← live production
```

**Design rule:** Never hardcode environment assumptions. Always read the target URL
from `p3f_client.p3f_envurl` (currently all clients point to the same P3 env URL).
This makes future multi-env rollout a config change, not a code rewrite.

```typescript
// Always resolve env URL this way — never hardcode
const envUrl = client.p3f_envurl ?? process.env.PP_ENV_URL;
```

---

## Client access model — current

Clients access P3 Forge through the **P3 Microsoft tenant**:

1. P3 manager creates `p3f_client` record in Dataverse
2. P3 manager grants client users **Azure AD B2B guest access** to P3 tenant
3. P3 manager adds client users to the **P3 Forge Teams channel**
4. Client users can now message the **P3 Forge Teams Agent** directly
5. Client users can access the **Power Apps Code App** (customer view — future Phase 2)

No automated onboarding flow needed at this stage. P3 manager does this manually
in Azure AD and Teams. Document checklist lives in Config screen of the Code App.

**`p3f_client` onboarding status:** tracked via `p3f_onboardingcomplete` boolean.
Manager checks off steps manually in Config → Client → Onboarding checklist.

---

## Dataverse — P3Forge_v1

**All tables:** `p3f_` prefix. **All columns:** `p3f_` prefix.
**Critical:** every query on every table MUST filter by `p3f_clientid`. No exceptions.

### Complete table list

```
p3f_client              Root entity — one row per P3 client
p3f_project             One client → many projects
p3f_app                 One project → one or more delivered apps
p3f_ratecard            Price anchors by client + type + complexity
p3f_ticket              Central entity — every ticket lives here
p3f_ticketmessage       Full conversation + agent action log (insert-only)
p3f_requirement         Structured requirement — Gate 0 output (immutable once confirmed)
p3f_offer               CR offer — scope, price, revisions, acceptance
p3f_architectplan       Solution Architect Agent output
p3f_buildplan           Consolidated specialist output — reviewed at Gate 1
p3f_qareport            QA Agent output — per-component pass/fail
p3f_deployrecord        Deploy history — what, when, which components, snapshot refs
p3f_rollbackrecord      Rollback history
p3f_trusthistory        Immutable tier change audit log (insert-only, never update/delete)
p3f_billingrecord       CR resolution billing record
p3f_retryqueue          OpenAI / build failure retry tracking
p3f_dataretentionpolicy Per-client GDPR retention config
p3f_agentprompt         All GPT-4o prompts — read by every agent at runtime
p3f_agentconversation   Agent-to-agent deliberation messages (insert-only, auditable)
p3f_apprequirement      Living requirements registry — versioned, per app
p3f_agentcircuitbreaker Circuit breaker state per agent
```

### STATUS_CODES (p3f_status on p3f_ticket)

```typescript
export const STATUS = {
  SUBMITTED:          100,
  STRUCTURING:        150,  // intake agent formatting
  CONFIRMING:         200,  // Gate 0 — awaiting customer confirmation
  CONFIRMED:          250,  // customer confirmed — pipeline starts
  ASSESSED:           300,
  SPECIALIST_REVIEW:  350,  // 4 agents running in parallel
  OFFER_SENT:         400,  // CR path only
  OFFER_ACCEPTED:     450,  // CR path only
  GATE1_PENDING:      500,
  IN_DEVELOPMENT:     550,  // build agents running
  QA_REVIEW:          600,
  QA_FAILED:          650,
  UAT_PENDING:        700,  // customer testing
  GATE2_PENDING:      750,
  DEPLOYED:           800,
  CLOSED:             850,
  ESCALATED:          900,
  DUPLICATE:          950,
  EXPIRED:            975,
  CANCELLED:          999,
  PAUSED:             990,
  ROLLBACK_PENDING:   985,
} as const;
```

### Autonomy tier routing

```typescript
// Gate 0: ALWAYS active — no exceptions ever
function gate1Required(tier: 1|2|3, type: number, complexity: number): boolean {
  if (tier === 1) return true;
  if (tier === 2) return !(type === 100 && complexity <= 2); // skip Bug/S+M
  if (tier === 3) return type === 200;                       // CR only
  return true;
}
function gate2Required(tier: 1|2|3, type: number, complexity: number): boolean {
  if (tier === 1) return true;
  if (tier === 2) return true;
  if (tier === 3) return !(type === 100 && complexity <= 2); // skip Bug/S+M
  return true;
}
```

---

## Branch strategy and PR merge policy

### Branch naming

```
main                     Production — always deployable
p3f/T-{ticketId}         Agent build branch per ticket
p3f/hotfix-{ticketId}    Emergency patch branch
```

### Concurrent tickets — branch isolation

Multiple tickets can build simultaneously on separate branches. No locking needed.

```
main
├── p3f/T-0042    ← ticket 42 building (modifies KanbanBoard.tsx)
├── p3f/T-0043    ← ticket 43 building (modifies Gate1Review.tsx)
└── p3f/T-0044    ← ticket 44 building (also modifies KanbanBoard.tsx — conflict!)
```

If two tickets touch the same file:
- Both build agents produce their PRs independently
- First PR to pass all checks → auto-merges
- Second PR → GitHub detects merge conflict → status = GATE2_PENDING
- Manager sees conflict in Gate 2 panel → resolves manually or re-triggers build agent
  with updated main branch as base

### PR merge — fully automatic

```yaml
# After all GitHub Actions checks pass:
- name: Auto-merge PR
  run: gh pr merge p3f/T-${{ inputs.ticket_id }} --squash --delete-branch
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_PAT }}
```

Branch protection on `main`:
- Require status checks: `build`, `test`, `pac-validate`
- Allow merge: service account only (via PAC GitHub PAT)
- No human review required — checks ARE the review

Gate 2 approval in the dashboard triggers the deploy workflow, not the merge.
Merge happens automatically when checks pass. Deploy happens when manager approves
(or automatically for Autonomous tier tickets that don't require Gate 2).

---

## Complete flow list — v4

```
--- INTAKE & GATE 0 ---
p3f-flow-teams-intake               Teams Agent → create ticket → trigger structuring
p3f-flow-intake-agent               Apply Bug Report or User Story format
p3f-flow-requirement-agent          Gate 0 summary + effort estimate → customer confirmation
p3f-flow-teams-reply-handler        Match reply → confirm/correct/cancel/pause/status
p3f-flow-gate0-confirmed            Confirmed → notify manager → trigger assessment

--- ASSESSMENT & SPECIALISTS ---
p3f-flow-assessment-agent           Score + classify + route
p3f-flow-specialist-orchestrator    Trigger 4 specialists in parallel
p3f-flow-architect-agent            Component impact map + approach
p3f-flow-pa-expert-agent            Power Automate flow change spec
p3f-flow-codeapp-expert-agent       React/TS implementation plan
p3f-flow-dataverse-expert-agent     Schema validation + change spec
p3f-flow-buildplan-consolidator     Merge 4 outputs → build plan → Gate 1

--- GATE 1 & OFFER ---
p3f-flow-gate1-check                Tier routing → notify manager or auto-proceed
p3f-flow-offer-generator            Rate card + GPT-4o → offer → customer
p3f-flow-offer-reply-handler        Accept/reject → proceed or revise

--- BUILD (parallel per component) ---
p3f-flow-build-orchestrator         Trigger build agents for affected components only
p3f-flow-pa-build-agent             PAC CLI: export → modify → import → activate
p3f-flow-codeapp-build-agent        Claude Code → branch → PR → auto-merge on checks pass
p3f-flow-dataverse-build-agent      PAC CLI: solution export → modify XML → import
p3f-flow-copilotstudio-build-agent  PAC CLI: topic export → modify YAML → import → publish
p3f-flow-build-callback-handler     Receive results → update ticket → QA or retry queue

--- QA, GATE 2 & DEPLOY ---
p3f-flow-test-agent                 Phase B parallel — write unit/integration/UAT test specs
p3f-flow-security-review-agent      Phase B (runs last) — assess security risk across all changes
p3f-flow-estimation-validator       Phase C — reconcile architect vs specialist effort estimates
p3f-flow-qa-agent                   Verify all components against acceptance criteria
p3f-flow-release-notes-agent        After deploy — generate structured release notes in client language
p3f-flow-gate2-check                Tier routing → notify manager or auto-deploy
p3f-flow-snapshot-before-deploy     Export current state of all components before deploy
p3f-flow-deploy-orchestrator        Deploy all components → billing record → notify customer
p3f-flow-uat-reminder               Scheduled daily — day 5 reminder, day 10 escalation

--- ROLLBACK ---
p3f-flow-rollback-orchestrator      One-click rollback — all components from snapshot

--- RESILIENCE ---
p3f-flow-openai-retry-queue         Retry GPT-4o failures every 30 min, escalate at 2 hrs
p3f-flow-build-retry-queue          Retry build agent failures
p3f-flow-dead-letter-handler        Catch all unhandled flow failures → escalate + log

--- SCHEDULED ---
p3f-flow-sla-watchdog               Every 15 min — P1 re-ping + SLA breach detection
p3f-flow-offer-expiry               Daily — expire at day 14, close at day 30
p3f-flow-gdpr-retention             Daily 02:00 UTC — anonymise/delete per retention policy
p3f-flow-duplicate-detector         Parallel with triage — semantic similarity check
p3f-flow-cancel-handler             Handle customer cancel request — check if safe or in-flight
p3f-flow-pause-handler              Set ticket PAUSED, skip SLA watchdog
p3f-flow-resume-handler             Restore previous status, continue pipeline
p3f-flow-circuit-breaker-check      Called by every agent flow at start — check if agent is tripped
p3f-flow-circuit-breaker-reset      Manager or auto-timer resets a tripped circuit
p3f-flow-agent-message-dispatcher   Routes agent-to-agent messages via p3f_agentconversation
p3f-flow-estimation-deliberation    3-way estimation negotiation (validator + architect + dev)
p3f-flow-developer-clarification    Code App Expert pre-planning questions to requirements + architect
p3f-flow-pa-dv-alignment            PA Expert + DV Schema mutual column validation
p3f-flow-security-challenge         Security Review Agent challenge delivery
p3f-flow-qa-failure-feedback        QA Agent sends specific failure context to Code App Expert
p3f-flow-registry-check             Semantic similarity + contradiction check at intake (every ticket)
p3f-flow-requirements-import-agent  Parse spec doc → populate p3f_apprequirement at onboarding
p3f-flow-registry-agent             Update registry after every resolved ticket
p3f-flow-regression-ticket-creator  Auto-create linked P1 bug when QA finds a regression
p3f-flow-demotion-check             Post QA failure or UAT regression
p3f-flow-get-ticket-status          Return current status + last agent action for status check topic
p3f-flow-uat-response-handler       Parse customer UAT pass/fail → trigger gate2-check
```

---

## PAC CLI patterns — single environment (current)

### Auth

```yaml
- name: Authenticate Power Platform
  run: |
    pac auth create \
      --url ${{ secrets.PP_ENV_URL }} \
      --applicationId ${{ secrets.PP_APP_ID }} \
      --clientSecret ${{ secrets.PP_APP_SECRET }} \
      --tenant ${{ secrets.PP_TENANT_ID }}
```

### Power Automate flow

```bash
pac flow export --name "p3f-flow-{name}" --output ./flows/
# Claude Code modifies flow JSON
pac flow import --path ./flows/{name}.zip
pac flow activate --name "p3f-flow-{name}"
```

### Dataverse solution

```bash
pac solution export --name P3Forge_v1 --path ./solution/ --managed false
# Claude Code modifies customizations.xml
pac solution import --path ./solution/P3Forge_v1.zip --activate-plugins
```

### Code App

```bash
# Build agent opens PR → checks pass → auto-merge
# Deploy orchestrator then publishes:
pac canvas pack --sources ./src --msapp ./build/P3ForgeManager.msapp
pac canvas publish --environment ${{ secrets.PP_ENV_URL }} --name P3ForgeManager
```

### Copilot Studio

```bash
pac copilot topic export --bot-name "P3 Forge Agent" --output ./topics/
# Claude Code modifies YAML
pac copilot topic import --bot-name "P3 Forge Agent" --input ./topics/
pac copilot publish --bot-name "P3 Forge Agent"
```

---

## GitHub Actions workflow files

```
.github/workflows/p3f-build-pa.yml           PA build + auto-activate
.github/workflows/p3f-build-codeapp.yml      Code App: Claude Code → PR → auto-merge
.github/workflows/p3f-build-dataverse.yml    DV schema build + import
.github/workflows/p3f-build-copilot.yml      CS topic build + publish
.github/workflows/p3f-deploy.yml             Deploy all components (Gate 2 triggered)
.github/workflows/p3f-rollback.yml           Rollback all from snapshot
.github/workflows/p3f-snapshot.yml           Pre-deploy snapshot
.github/workflows/p3f-validate.yml           PAC CLI validate before any deploy
```

---

## GitHub Secrets

```
PP_ENV_URL          Single P3 Forge Power Platform environment URL
PP_APP_ID           Service principal app ID
PP_APP_SECRET       Service principal secret
PP_TENANT_ID        Azure AD tenant ID
ANTHROPIC_API_KEY   Claude Code API key
GITHUB_PAT          PR auto-merge + branch operations
```

---

## Rollback system

```
Before every deploy → p3f-flow-snapshot-before-deploy:
  pac solution export → store ZIP URL in p3f_deployrecord.p3f_snapshot_dv
  pac flow export → store ZIP URL in p3f_deployrecord.p3f_snapshot_pa
  Store Code App version ID → p3f_deployrecord.p3f_snapshot_codeapp_version
  pac copilot topic export → store YAML URL in p3f_deployrecord.p3f_snapshot_cs

Rollback trigger: manager clicks "Rollback" in dashboard
p3f-flow-rollback-orchestrator:
  → Restore all 4 components from snapshot (parallel)
  → Insert p3f_rollbackrecord
  → Teams notification: manager + customer
  → Status → ESCALATED
```

---

## Azure OpenAI resilience

```
Attempt 1: GPT-4o call
Attempt 2: GPT-4o retry (10s delay)
Fallback (non-critical agents only): GPT-4o-mini
If all fail:
  → Insert p3f_retryqueue (next_retry = now + 30min)
  → Status = ESCALATED (auto-resolves on retry success)
  → Teams: "T-{id} paused — AI unavailable. Auto-retry in 30 min."

p3f-flow-openai-retry-queue (every 30 min):
  → Re-run failed agent
  → retry_count >= 4 → permanent escalation → Teams alert
```

---

## GDPR / data retention

```
p3f_dataretentionpolicy (one per client):
  p3f_retentionperiodmonths   Default: 24
  p3f_anonymiseonexpiry       Default: true
  p3f_deleteonexpiry          Default: false
  p3f_legalhold               Default: false

p3f-flow-gdpr-retention (daily 02:00 UTC):
  → Tickets past retention period: anonymise PII or delete
  → Skip if legalhold = true
  → Log every action to p3f_ticketmessage
```

---

## Cancel / pause

```
Customer says "cancel" or "pause" in Teams →
p3f-flow-teams-reply-handler detects intent

CANCEL:
  < IN_DEVELOPMENT: immediate → CANCELLED → notify both
  >= IN_DEVELOPMENT: alert manager → Force Cancel or Continue

PAUSE:
  → status = PAUSED
  → SLA watchdog skips paused tickets
  → customer says "resume" → pipeline continues from current status
```

---

## Code App structure

```
src/
├── index.tsx
├── App.tsx                           # Role router: P3Manager | redirect
├── api/
│   ├── dataverse.ts                  # All queries always filter by clientid
│   ├── powerautomate.ts
│   └── types.ts
├── hooks/
│   ├── useTickets.ts
│   ├── useGateNotifications.ts
│   ├── useClientTier.ts
│   └── useSpecialistOutputs.ts
├── screens/
│   ├── KanbanBoard.tsx               # All tickets, all clients, filter by client
│   ├── EscalationQueue.tsx           # P1 + low confidence + stuck + retry queue
│   ├── Gate1Review.tsx               # 4 specialist outputs + approve/reject
│   ├── Gate2Review.tsx               # QA report + UAT status + deploy + rollback
│   ├── ClientList.tsx                # Clients + tier + onboarding checklist
│   ├── Analytics.tsx                 # Revenue, SLA, volume, feedback ratings
│   ├── Config.tsx                    # Clients, apps, rate cards, retention policy
│   └── RollbackPanel.tsx             # One-click rollback UI
├── components/
│   ├── TicketCard.tsx
│   ├── SLACountdown.tsx
│   ├── ConversationThread.tsx
│   ├── RequirementCard.tsx           # Confirmed Gate 0 requirement display
│   ├── SpecialistOutputPanel.tsx     # Tabbed: Architect | PA | Code App | DV
│   ├── BuildPlanCard.tsx
│   ├── QAReportCard.tsx
│   ├── TierBadge.tsx
│   ├── OfferCard.tsx
│   ├── ConflictAlert.tsx             # Shows when PR has merge conflict
│   ├── EnvironmentBadge.tsx          # Current env (single now, multi future)
│   └── RetryQueuePanel.tsx
└── utils/
    ├── routing.ts                    # gate1Required, gate2Required
    ├── sla.ts
    ├── language.ts
    └── environment.ts                # Resolve env URL from p3f_client record
```

---

## Requirement format standards

### Bug → Structured Bug Report

```
TITLE:               [one sentence]
STEPS TO REPRODUCE:  1. ... 2. ... 3. ...
EXPECTED BEHAVIOUR:  [what should happen]
ACTUAL BEHAVIOUR:    [what actually happens]
ENVIRONMENT:         [app, version, browser/device if known]
SEVERITY:            [blocks all | blocks some | workaround exists | cosmetic]
```

### Change Request → User Story

```
AS A     [role]
I WANT   [capability]
SO THAT  [business value]

ACCEPTANCE CRITERIA:
- Given [context], When [action], Then [outcome]
```

---

## GPT-4o system prompt pattern (all agents)

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a P3 Forge {agent_role}. Always respond in {language}. Client: {client_name}. App: {app_name}. Ticket: {ticket_id}. Respond ONLY in valid JSON. Never invent facts."
    },
    { "role": "user", "content": "{prompt}" }
  ],
  "response_format": { "type": "json_object" }
}
```

---

## NEVER do

- Query Dataverse without filtering by p3f_clientid
- Hardcode PP_ENV_URL in code — always read from p3f_client.p3f_envurl or env var
- Use personal connections in Power Automate — service account only
- Call Azure OpenAI directly from Code App — always via Power Automate
- Update or delete p3f_trusthistory or confirmed p3f_requirement records
- Run pa/codeapp/dataverse/test/security experts before architect-agent completes
- Run specialist agents without first checking p3f_architectplan is written and non-empty
- Call any agent when its circuit breaker is active (p3f_agentcircuitbreaker.active = true)
- Let Code App Expert write its plan without first posting clarification questions to Requirements + Architect
- Let Estimation Validator produce a final estimate without consulting all three agents
- Allow agents to edit p3f_requirement — clarifications are addenda in p3f_requirement.p3f_clarifications
- Update p3f_agentconversation rows — insert-only, every message is immutable
- Delete p3f_apprequirement rows — requirements are never deleted, only status changes
- Skip the registry-check flow for any ticket — it runs for EVERY ticket before Gate 0
- Delete p3f_apprequirement rows — status changes only, full version history preserved
- Run the registry-check after Gate 0 — it must run BEFORE the Gate 0 message is composed
- Let the Architect Agent write its impact map without first reading p3f_apprequirement
- Deploy without taking a pre-deploy snapshot first
- Skip Gate 0 customer confirmation for any ticket type
- Merge p3f/ branches manually — auto-merge only via GitHub Actions checks
- Store per-client environment URLs in GitHub Secrets — they live in Dataverse
- Hardcode any GPT-4o prompt text in flows — always read from p3f_agentprompt table
- Deploy without running p3f-flow-snapshot-before-deploy first
