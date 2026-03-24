# P3 Forge — Product Specification v5.0

> Source of truth for all product behaviour, business rules, and scenarios.
> Read before implementing any feature. If this file contradicts code, fix the code.

---

## 1. Product summary

P3 Forge is P3 Group's agentic software delivery platform. Every app P3 delivers connects
at go-live. Clients describe what they want in Microsoft Teams. Agents structure the
requirement, confirm it, design the solution across all platform components, build in
parallel, test, and deploy. P3 managers approve at two gates — and as trust grows, those
gates are removed.

**End goal:** Zero human involvement for routine work on mature client relationships.
**Tagline:** Describe it. We forge it.

---

## 2. Actors

| Actor | Description |
|---|---|
| Client user | Employee of a P3 client — submits via Teams |
| P3 Manager | P3 consultant assigned to client — approves at gates |
| Intake Agent | Structures requirement in correct format (Bug Report or User Story) |
| Requirement Agent | Produces Gate 0 summary + effort estimate — confirms with customer |
| Assessment Agent | Scores and classifies ticket — routes to specialists |
| Solution Architect Agent | Component impact map + technical approach |
| Power Automate Expert Agent | Flow change specification for PA build agent |
| Code App Expert Agent | React/TypeScript implementation plan |
| Dataverse Schema Agent | Validates schema changes before build |
| PA Build Agent | PAC CLI: creates/updates flows |
| Code App Build Agent | Claude Code + GitHub Actions: edits .tsx/.ts files |
| Dataverse Build Agent | PAC CLI: applies schema via solution XML |
| Copilot Studio Build Agent | PAC CLI: updates and publishes agent topics |
| QA Agent | Verifies all components against acceptance criteria |
| Offer Generator | GPT-4o + rate card → CR scope and price |
| System | Scheduled flows: SLA watchdog, reminders, expiry, demotion |

---

## 3. Requirement format standards

### Bug → Structured Bug Report (intake agent applies automatically)

```
TITLE:               [one sentence]
STEPS TO REPRODUCE:  1. ... 2. ... 3. ...
EXPECTED BEHAVIOUR:  [what should happen]
ACTUAL BEHAVIOUR:    [what actually happens]
ENVIRONMENT:         [app, version, browser/device if known]
SEVERITY:            [blocks all | blocks some | workaround exists | cosmetic]
```

### Change Request → User Story + Acceptance Criteria

```
AS A     [role]
I WANT   [capability]
SO THAT  [business value]

ACCEPTANCE CRITERIA:
- Given [context], When [action], Then [outcome]
- Given [context], When [action], Then [outcome]
```

The intake agent detects type from conversation context and applies the correct format.
The customer never needs to know about the format — they just talk.

---

## 4. Gate 0 — requirement confirmation (mandatory, no exceptions)

After the intake agent structures the requirement, the requirement agent produces and
sends this to the customer via Teams:

```
Here is what I understood from your request:

[Plain language summary — 3-4 sentences]

Structured as: [Bug Report | User Story]
[Full structured requirement]

Effort estimate: [X–Y hours / X–Y days]
[For CRs: price range based on rate card]

Is this correct?
Reply CONFIRMED to proceed, or tell me what to change.
```

Rules:
- Pipeline does NOT advance until customer replies with confirmed intent
- Correction loop: customer corrects → intake agent re-structures → requirement agent resends
- No maximum correction loops — keep refining until customer confirms
- After confirmation: p3f_requirement record is marked confirmed and becomes IMMUTABLE
- Immediately after confirmation: lightweight notification sent to P3 manager

### Manager notification on ticket confirmation

```
[Teams adaptive card — informational only, no action needed]

📋 New ticket confirmed — T-{id}
Type: {Bug | Change Request} · Criticality: {P1–P4} · Complexity: {S/M/L/XL}
Client: {client_name} · App: {app_name}
Summary: "{2-sentence summary}"
Effort estimate: {X–Y hours}
Status: Entering specialist assessment. No action needed yet.
[View ticket →]
```

---

## 5. Autonomy tiers

| | Supervised (1) | Semi-autonomous (2) | Autonomous (3) |
|---|---|---|---|
| Default for | All new clients | After manual promotion | After manual promotion |
| Gate 0 | Always | Always | Always |
| Gate 1 | Always | Skip: Bug/S+M | Skip: all Bugs |
| Gate 2 | Always | Always | Skip: Bug/S+M |
| CR offer | Always, manager reviews plan | Always, auto-starts on accept | Auto-sent, auto-starts |
| Demotion trigger | N/A | QA fails 2x/week | UAT regression |

**Promotion:** Manual only. Manager sets tier in Config screen. No algorithm promotes.
**Demotion:** Automatic — one tier down. Logged in p3f_trusthistory. Manager can reverse.

---

## 6. Specialist agents — parallel execution

All four run simultaneously after assessment. They are independent and do not wait for
each other. The buildplan consolidator waits for all four before creating the build plan.

### Solution Architect Agent
- Reads: ticket, confirmed requirement, app tech stack
- Produces: component impact map (which flows, screens, tables, topics are affected),
  technical approach, cross-component dependencies, risk flags, effort estimate
- Stored in: p3f_architectplan

### Power Automate Expert Agent
- Reads: architect plan (flows affected)
- Produces: per-flow specification (trigger, steps, connectors, error handling)
- Blocks if: required connection references don't exist in environment

### Code App Expert Agent
- Reads: architect plan (files/components affected)
- Produces: per-file change description, new component specs, Dataverse query changes,
  Fluent UI components to use
- Follows: existing Code App patterns from copilot-instructions.md

### Dataverse Schema Agent
- Reads: architect plan (tables/columns affected)
- Produces: validated change spec OR list of blockers
- BLOCKS BUILD if: any schema blocker exists (naming conflict, broken relationship,
  security role impact, missing required columns)
- Escalates to manager if blockers found

---

## 7. Complete ticket lifecycle — all states

```
Submitted → Structuring → Confirming → [correction loop] → Confirmed
  → Assessed → SpecialistReview
    → [Bug]   → Gate1Pending | InDevelopment → QAReview → UATpending → Gate2Pending → Deployed → Closed
    → [CR]    → OfferSent → OfferAccepted → Gate1Pending → [same as Bug]
    → [Error] → Escalated | Duplicate | Expired | Cancelled
```

---

## 8. All scenarios

### 8A — Clean bug
```
Teams intake → Intake agent: Bug Report format → Requirement agent: Gate 0 summary
→ Customer confirms → Manager notification (lightweight)
→ Assessment: Bug/P3/S → Specialist agents (parallel)
→ Architect: impact map → PA Expert: no flows affected → Code App Expert: 1 file
→ Dataverse Expert: no schema change → Consolidator: build plan
→ gate1Required()? → if yes: Gate 1 → if no: auto-proceed
→ Build orchestrator → Code App Build Agent (only component affected)
→ QA Agent: criteria verified → UAT notification
→ gate2Required()? → if yes: Gate 2 → if no: auto-deploy
→ Deploy → Customer notified → Closed
```

### 8B — Change request, full pipeline
```
Teams intake → Intake agent: User Story format → Requirement agent: Gate 0 + price range
→ Customer confirms → Manager notification
→ Assessment: CR/P3/M → Specialist agents (parallel, all 4)
→ Consolidator: full build plan (flows + code + schema + topic changes)
→ Offer generator: rate card lookup → GPT-4o scope → offer to customer
→ Customer accepts → Gate 1 (always for CR in all tiers)
→ Build orchestrator → all 4 build agents in parallel
→ QA Agent: all components → UAT
→ Gate 2 → Deploy all components → Billing record → Customer notified → Closed
```

### 8C — Requirement correction loop
```
Customer submits vague requirement → Intake agent: partially structured
→ Requirement agent: Gate 0 with gaps flagged
→ Customer corrects → Intake agent re-structures → Requirement agent resends
→ [repeat until confirmed — no maximum]
→ Once confirmed: p3f_requirement immutable, pipeline starts
```

### 8D — Dataverse schema blocker
```
Specialist agents run → Dataverse Schema Agent finds naming conflict
→ Dataverse spec: valid=false, blockers=[...]
→ Buildplan consolidator: status = Escalated
→ Teams alert to manager: "Schema change blocked: {reason}. Manual resolution needed."
→ Manager resolves → updates schema spec → re-triggers buildplan consolidator
```

### 8E — P1 critical bug
```
Assessment: criticality = P1
→ Regardless of tier: immediate Teams alert to manager (red badge)
→ Gate 1 always active for P1
→ SLA due = now + 1 hour
→ SLA watchdog pings every 15 min until Gate 1 actioned
→ After Gate 1: build agents prioritised → QA → Gate 2 (always for P1) → Deploy
```

### 8F — QA failure with retry
```
QA Agent: criteria fail → status = QAFailed → qaretrycount++
→ if qaretrycount < 2: re-trigger affected build agents with failure notes
→ if qaretrycount >= 2: Escalated → Teams card to manager with full QA report
```

### 8G — UAT rejection → regression
```
Customer: UAT failed + description
→ QA Agent: is this a regression from agent's change?
  YES: reopen → re-run affected build agents → trigger demotion check
  NO (new scope): auto-create new linked CR ticket → close original
```

### 8H — Offer rejection loop
```
Customer rejects offer + comment → offerrevcount++
→ if offerrevcount < 2: re-trigger offer generator with rejection comment
→ if offerrevcount >= 2: Escalated → manager manual negotiation
```

### 8I — Low confidence classification
```
Assessment: agentconfidence < 0.75 → Escalated
→ Teams card: classification, reasoning, confidence
→ Manager: confirm or override → logged → pipeline continues
```

### 8J — Duplicate detection
```
p3f-flow-duplicate-detector: similarity > 0.90 against open tickets
→ Teams message: "Similar to T-{id} currently {status}. Same issue?"
→ Customer confirms: link + close new as Duplicate
→ Customer denies: triage continues
```

### 8K — Tier demotion
```
p3f-flow-demotion-check triggered by:
  (a) QA fails twice in one calendar week
  (b) UAT regression confirmed
→ tier > 1: decrement tier → update p3f_client
→ INSERT p3f_trusthistory (never update)
→ Teams: "Client {name} demoted from {tier} to {tier}. Reason: {reason}. [Reverse →]"
```

---

## 9. VS Code ↔ Power Platform — full automation scope

All build agents run inside GitHub Actions workflows. PAC CLI is the bridge between
the GitHub repo and the Power Platform environment.

### What lives in the GitHub repo

```
/src/                    Power Apps Code App (React/TypeScript)
/flows/                  Power Automate flow exports (ZIP files)
/solution/               Dataverse solution XML (customizations.xml)
/topics/                 Copilot Studio topic YAML files
/.github/workflows/      All GitHub Actions workflows
```

### Build agent responsibilities per component

| Component | Build agent | Tool | What it touches |
|---|---|---|---|
| Power Automate | p3f-flow-pa-build-agent | PAC CLI | /flows/*.zip → export, modify JSON, import, activate |
| Code App | p3f-flow-codeapp-build-agent | Claude Code + PAC CLI | /src/**/*.tsx, /src/**/*.ts → PR, then pac canvas publish |
| Dataverse | p3f-flow-dataverse-build-agent | PAC CLI | /solution/customizations.xml → export, modify, import |
| Copilot Studio | p3f-flow-copilotstudio-build-agent | PAC CLI | /topics/*.yaml → export, modify, import, publish |

### Deploy orchestrator sequence

```
1. Dataverse import first (schema must exist before flows reference new tables)
2. Power Automate import + activate second (flows reference schema)
3. Code App publish third (UI references flows and schema)
4. Copilot Studio publish last (agent references flows)
5. All succeed → create p3f_billingrecord → notify customer
6. Any failure → rollback component → Escalated → manager notified
```

---

## 10. SLA rules

| Criticality | Gate 1 SLA | Total target |
|---|---|---|
| P1 | 1 hour | 24 hours |
| P2 | 4 hours | 3 business days |
| P3 | 1 business day | 2 weeks |
| P4 | 2 business days | Backlog |

---


### 8L — Branch merge conflict (concurrent tickets)

```
Two tickets both in IN_DEVELOPMENT touching the same file:
  T-0042: modifies KanbanBoard.tsx → builds → checks pass → auto-merges first
  T-0043: modifies KanbanBoard.tsx → builds → checks fail (merge conflict detected)
    → status = GATE2_PENDING
    → Teams notification to manager:
      "T-0043 has a merge conflict with T-0042 (recently deployed).
       Options: [Re-run build agent on updated main] [View diff]"
    → Manager selects "Re-run build agent"
    → p3f-flow-codeapp-build-agent re-triggered with main as new base
    → new PR created → checks pass → auto-merge → deploy
```

---

## 11. Open questions (resolve before Phase 1)

| # | Question | Why it matters |
|---|---|---|
| 1 | Azure OpenAI deployment: shared vs dedicated GPT-4o? | P1 SLA of 1hr needs dedicated throughput |
| 2 | Dataverse environment: P3's M365 tenant or dedicated? | Client data isolation strategy |
| 3 | Rate card for P3 internal tickets? | Phase 1 seed data — even if price = 0 |
| 4 | BMW/Nagel Teams guest access or email fallback? | Determines intake channel at launch |
| 5 | GitHub org: one repo per client, per app, or monorepo? | Drives workflow scoping + branch naming |
| 6 | PAC CLI service principal permissions? | Needs: flow import, solution import, canvas publish, copilot publish |
| 7 | Who holds PAC CLI credentials in GitHub Secrets? | Service account — needs PP admin to provision |
