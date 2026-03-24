# P3 Forge — Agent Rules & Interaction Specification v1.0

> Defines how agents interact, what they depend on, what locks them,
> and what happens when things go wrong. Read alongside AGENTS.md.
> Every rule here is enforced in code — not just documentation.

---

## Complete agent roster — 18 agents

### AI Agents (call GPT-4o, make decisions) — 14

| # | Agent | Flow | When it runs |
|---|---|---|---|
| 1 | Intake Agent | p3f-flow-intake-agent | After Teams intake, before Gate 0 |
| 2 | Requirement Agent | p3f-flow-requirement-agent | Gate 0 — confirmation to customer |
| 3 | Assessment Agent | p3f-flow-assessment-agent | After Gate 0 confirmed |
| 4 | Architect Agent | p3f-flow-architect-agent | Phase A — alone, before specialists |
| 5 | PA Expert Agent | p3f-flow-pa-expert-agent | Phase B — parallel with 6+7 |
| 6 | Code App Expert Agent | p3f-flow-codeapp-expert-agent | Phase B — parallel with 5+7 |
| 7 | Dataverse Schema Agent | p3f-flow-dataverse-expert-agent | Phase B — parallel with 5+6 |
| 8 | Test Agent | p3f-flow-test-agent | Phase B — parallel with 5+6+7 (NEW) |
| 9 | Security Review Agent | p3f-flow-security-review-agent | Phase B — parallel with 5+6+7 (NEW) |
| 10 | Estimation Validator | p3f-flow-estimation-validator | Phase C — after Phase B completes (NEW) |
| 11 | Offer Generator | p3f-flow-offer-generator | CR path — after assessment |
| 12 | QA Agent | p3f-flow-qa-agent | After all build agents complete |
| 13 | Release Notes Agent | p3f-flow-release-notes-agent | After deploy succeeds (NEW) |
| 14 | Duplicate Detector | p3f-flow-duplicate-detector | Parallel with triage |
| 19 | Requirements Registry Agent | p3f-flow-registry-agent | After every deploy |
| 20 | Requirements Import Agent | p3f-flow-requirements-import-agent | Onboarding only |

### Build Agents (PAC CLI / Claude Code, no GPT-4o) — 4

| # | Agent | Flow | When it runs |
|---|---|---|---|
| 15 | PA Build Agent | p3f-flow-pa-build-agent | After Gate 1 approved |
| 16 | Code App Build Agent | p3f-flow-codeapp-build-agent | After Gate 1 approved |
| 17 | Dataverse Build Agent | p3f-flow-dataverse-build-agent | After Gate 1 approved |
| 18 | Copilot Studio Build Agent | p3f-flow-copilotstudio-build-agent | After Gate 1 approved |

---

## Execution phases — CORRECTED

The specialist agents are NOT all parallel. Architect runs first alone.

```
PHASE A — Sequential (1 agent)
  ↓ architect-agent
    Reads: confirmed requirement, app tech stack, existing component inventory
    Writes: p3f_architectplan (components_affected, approach, risk_flags)
    Must complete before Phase B starts

PHASE B — Parallel (5 agents simultaneously)
  ├── pa-expert-agent          reads p3f_architectplan.components_affected.power_automate_flows
  ├── codeapp-expert-agent     reads p3f_architectplan.components_affected.code_app_files
  ├── dataverse-expert-agent   reads p3f_architectplan.components_affected.dataverse_*
  ├── test-agent               reads p3f_architectplan + confirmed requirement
  └── security-review-agent    reads p3f_architectplan + all specialist scopes

  All 5 write to their respective output records.
  p3f_ticket.p3f_specialistscomplete increments from 0→5 as each completes.
  buildplan-consolidator triggers when p3f_specialistscomplete = 5.

PHASE C — Sequential (1 agent)
  ↓ estimation-validator
    Reads: architect estimate + all 5 Phase B estimates
    Reconciles: flags discrepancies > 30%
    Writes: final_hours, discrepancy_flag to p3f_buildplan

PHASE D — Sequential (1 agent)
  ↓ buildplan-consolidator
    Reads: all outputs from Phases A, B, C
    Cross-checks: no conflicts between specialist outputs
    Writes: consolidated p3f_buildplan
    Triggers: Gate 1 check
```

**Update to p3f_ticket:** `p3f_specialistscomplete` now counts 0→5 (was 0→4).

---

## Agent dependency map

Each agent lists what MUST EXIST before it can run.
If any dependency is missing → agent fails immediately → escalate.

### intake-agent
```
Requires:
  ✓ p3f_client record (matched by p3f_teamstenantid)
  ✓ p3f_app records for that client (≥ 1 active app)
  ✓ p3f_agentprompt where agentname = 'intake-agent' and active = true
  ✓ Azure OpenAI endpoint reachable (health check)

Outputs:
  → p3f_requirement (status: Draft)
  → p3f_ticket.p3f_tickettype (hint)
```

### requirement-agent
```
Requires:
  ✓ p3f_requirement (status: Draft) — intake-agent must have run
  ✓ p3f_ratecard rows for this client or global defaults (for effort estimate)
  ✓ p3f_agentprompt where agentname = 'requirement-agent' and active = true

Outputs:
  → p3f_requirement updated with plain_language_summary, effort_estimate
  → p3f_ticket.p3f_status = CONFIRMING (200)
```

### assessment-agent
```
Requires:
  ✓ p3f_requirement.p3f_status = Confirmed (3) — Gate 0 must be confirmed
  ✓ p3f_agentprompt where agentname = 'assessment-agent' and active = true

Outputs:
  → p3f_ticket: type, criticality, complexity, confidence
  → p3f_ticket.p3f_assessmentlocked = true (set BEFORE Phase A starts)
  → Draft p3f_buildplan (acceptance_criteria only)
```

### architect-agent (Phase A — runs alone)
```
Requires:
  ✓ p3f_ticket.p3f_assessmentlocked = true
  ✓ p3f_app.p3f_flownames (JSON — existing flows in solution)
  ✓ p3f_app.p3f_screenfiles (JSON — existing Code App files)
  ✓ p3f_app.p3f_topicnames (JSON — existing CS topics)
  ✓ p3f_agentprompt where agentname = 'architect-agent' and active = true

Outputs:
  → p3f_architectplan (components_affected, approach, risk_flags, estimated_hours)
  → Triggers Phase B only after this record is written and verified non-empty
```

### pa-expert-agent / codeapp-expert-agent / dataverse-expert-agent (Phase B)
```
Each requires:
  ✓ p3f_architectplan for this ticket EXISTS and is non-empty
  ✓ Their domain is in components_affected (if not: immediately skip with "no changes needed")
  ✓ p3f_agentprompt for their agentname and active = true

pa-expert outputs:    pa_specs JSON in p3f_buildplan
codeapp-expert outputs: codeapp_spec JSON in p3f_buildplan
dataverse-expert outputs: dataverse_spec JSON + p3f_dataversevalid boolean
```

### test-agent (Phase B — parallel with experts) — NEW
```
Requires:
  ✓ p3f_architectplan for this ticket (to know what's changing)
  ✓ p3f_buildplan.p3f_acceptancecriteria (from assessment-agent)
  ✓ p3f_agentprompt where agentname = 'test-agent' and active = true

Outputs:
  → p3f_buildplan.p3f_testspecsjson (JSON array of test specifications)
  → /tests/T-{id}/ folder in GitHub repo (via code build agent later)
  
GPT-4o prompt returns:
{
  "unit_tests": [{ "component": string, "test_description": string, "test_code_hint": string }],
  "integration_tests": [{ "scenario": string, "given": string, "when": string, "then": string }],
  "uat_test_steps": [{ "step": number, "action": string, "expected_result": string }]
}

uat_test_steps become the UAT instructions sent to the customer.
unit_tests and integration_tests are passed to the code build agent to implement.
```

### security-review-agent (Phase B — parallel with experts) — NEW
```
Requires:
  ✓ p3f_architectplan for this ticket
  ✓ All Phase B specialist outputs (reads after they write — polls or triggered last)

Wait condition: runs AFTER pa/codeapp/dataverse experts complete (not truly parallel with them).
Reads their outputs to assess the combined security impact.

GPT-4o prompt returns:
{
  "risk_level": "HIGH" | "MEDIUM" | "LOW" | "NONE",
  "risks": [{ "category": string, "description": string, "recommendation": string }],
  "blocks_build": boolean,  // true if HIGH risk — Gate 1 always required
  "affected_security_surfaces": string[]
}

Risk categories to check:
  - Authentication or authorisation changes
  - Dataverse security role modifications
  - Cross-client data access patterns
  - API key or secret handling
  - p3f_trusthistory or p3f_requirement write attempts
  - Any DELETE operations on critical tables
  - External HTTP calls from flows to unknown endpoints

Output stored in p3f_buildplan.p3f_securityreviewjson
If risk_level = HIGH: gate1Required = true (overrides tier logic)
```

### estimation-validator (Phase C — after Phase B) — NEW
```
Requires:
  ✓ p3f_architectplan.p3f_estimatedhours
  ✓ All Phase B specialist outputs (pa_specs, codeapp_spec, dataverse_spec)
  ✓ p3f_agentprompt where agentname = 'estimation-validator' and active = true

GPT-4o prompt returns:
{
  "architect_estimate_hours": number,
  "specialist_combined_hours": number,
  "discrepancy_percent": number,
  "discrepancy_flag": boolean,  // true if > 30% discrepancy
  "recommended_hours": number,
  "recommended_complexity": "S" | "M" | "L" | "XL" | null,  // suggest re-assess if wrong
  "reasoning": string
}

If discrepancy_flag = true AND recommended_complexity != current complexity:
  → Trigger re-assessment with discrepancy context BEFORE offer is generated
  → This prevents underpriced offers going to customers

Recommended_hours replaces architect estimate in the final build plan.
```

### buildplan-consolidator (Phase D)
```
Requires:
  ✓ p3f_specialistscomplete = 5 (architect + 3 experts + test + security)
    Note: security-review runs last in Phase B, so it can count as the 5th
  ✓ p3f_dataversevalid = true (if false: escalate immediately, do not consolidate)
  ✓ No conflict between pa_specs and dataverse_spec (cross-check)
  ✓ estimation-validator complete

Cross-check logic:
  For each column/table referenced in pa_specs:
    → Must exist in dataverse_spec.validated_changes OR current schema
    → If not found: CONFLICT → escalate
  For each file referenced in codeapp_spec:
    → Must exist in p3f_architectplan.components_affected.code_app_files
    → If extra files added by codeapp-expert: add to architect plan (allowed)

Outputs:
  → Complete p3f_buildplan (status: PendingApproval)
  → Triggers gate1-check
```

### offer-generator
```
Requires:
  ✓ p3f_ticket.p3f_tickettype = ChangeRequest (200)
  ✓ p3f_ratecard for client + type + complexity
  ✓ estimation-validator recommended_hours (use this, not architect estimate)
  ✓ p3f_agentprompt where agentname = 'offer-generator' and active = true

IMPORTANT: Offer is generated BEFORE specialist agents run (after assessment only).
The offer price is based on the COMPLEXITY score, not the specialist estimates.
The estimation-validator may flag a discrepancy AFTER the offer is sent.
If discrepancy_flag = true and complexity should change:
  → Withdraw the sent offer
  → Re-assess → new offer generated at corrected price
  → Customer notified: "We've updated our proposal based on a more detailed review."
```

### build agents (all 4)
```
Each requires:
  ✓ p3f_buildplan.p3f_status = Approved (3)
  ✓ Their domain has actual changes (empty spec → skip, not fail)
  ✓ PAC CLI authenticated (checked at workflow start)
  ✓ No other ticket currently holds a build lock on this component (branch isolation)

Skip condition (not a failure):
  if component has no changes in build plan:
    → log "skipped — no changes for this component"
    → p3f_buildsuccess++ immediately
    → do not trigger GitHub Actions workflow
```

### qa-agent
```
Requires:
  ✓ ALL dispatched build agents have called back (buildsuccess + buildfailed = agentsdispatched)
  ✓ p3f_buildplan.p3f_testspecsjson (from test-agent — uat_test_steps for customer)
  ✓ No build agents failed (if buildfailed > 0: retry failed agents first)
  ✓ p3f_agentprompt where agentname = 'qa-agent' and active = true

QA agent now uses:
  - Acceptance criteria from assessment-agent
  - Test specifications from test-agent
  - Actual PR diff / PAC CLI output from build agents
```

### release-notes-agent — NEW
```
Requires:
  ✓ p3f_ticket.p3f_status = DEPLOYED
  ✓ p3f_requirement (confirmed — what the customer asked for)
  ✓ p3f_buildplan (what was implemented)
  ✓ p3f_deployrecord (what was deployed, when)
  ✓ p3f_agentprompt where agentname = 'release-notes-agent' and active = true

GPT-4o prompt returns:
{
  "title": string,
  "summary": string,          // 2-3 sentences, non-technical
  "what_changed": string[],   // bullet list in customer language
  "how_to_use": string[],     // if CR: how to use the new feature
  "known_limitations": string[] | null
}

Stored in p3f_deployrecord.p3f_releasenotesjson
Sent to customer as structured Teams message
Optionally exported as PDF via Power Automate (future)
```

---

## Agent output immutability — locking rules

```
Lock trigger                    What becomes immutable
─────────────────────────────────────────────────────────────────
Gate 0 customer confirms      → p3f_requirement (plugin blocks Update/Delete)
assessment-agent completes    → p3f_ticket: type, criticality, complexity, confidence
                                p3f_ticket.p3f_assessmentlocked = true
Phase A (architect) completes → p3f_architectplan (insert-only after Phase B starts)
Gate 1 approved               → p3f_buildplan (plugin blocks Update on approved records)
Build agents complete         → p3f_buildplan.p3f_prurl, p3f_branch (immutable)
Deploy completes              → p3f_deployrecord (insert-only, never update)
```

---

## Conflict resolution rules

### Specialist agents vs each other

```
Conflict type 1: PA Expert references a DV column not in DV Expert's validated_changes
  Detection: buildplan-consolidator cross-check
  Resolution: escalate → manager review → options:
    A. Re-run DV Expert with PA Expert context (adds the missing column)
    B. Re-run PA Expert with corrected DV constraints (changes flow logic)

Conflict type 2: Estimation Validator finds > 30% discrepancy
  Resolution: automatic re-assessment (assessment-agent re-runs with discrepancy context)
  If complexity changes: re-run all specialists with new complexity
  If offer already sent: withdraw + resend revised offer

Conflict type 3: Security Review Agent blocks a change that PA Expert designed
  Resolution: security risk is always respected — PA Expert's spec is revised
  Security Review Agent writes specific_blockers list
  PA Expert re-runs with security constraints as additional context

Winner hierarchy (highest priority wins):
  1. Security Review Agent (security beats all)
  2. Dataverse Schema Agent (schema validity beats flow design)
  3. Architect Agent (overall approach beats component details)
  4. PA Expert / Code App Expert / Test Agent (equal priority — resolve via manager)
```

---

## Max retries per agent

```typescript
const MAX_RETRIES: Record<string, number> = {
  'intake-agent':             3,   // max 3 Gate 0 correction loops
  'requirement-agent':        0,   // Gate 0 correction loop handles it
  'assessment-agent':         2,
  'architect-agent':          2,
  'pa-expert-agent':          2,
  'codeapp-expert-agent':     2,
  'dataverse-expert-agent':   2,
  'test-agent':               2,
  'security-review-agent':    1,   // security decisions not auto-retried
  'estimation-validator':     1,
  'offer-generator':          2,
  'qa-agent':                 2,   // after 2 QA fails → escalate
  'release-notes-agent':      3,   // non-critical, retry freely
  'duplicate-detector':       1,
};
```

---

## Agent timeouts (Power Automate HTTP action timeout)

```typescript
const TIMEOUT_SECONDS: Record<string, number> = {
  'intake-agent':             30,
  'requirement-agent':        45,
  'assessment-agent':         30,
  'architect-agent':          90,  // most complex analysis
  'pa-expert-agent':          90,
  'codeapp-expert-agent':     90,
  'dataverse-expert-agent':   60,
  'test-agent':               90,
  'security-review-agent':    60,
  'estimation-validator':     30,
  'offer-generator':          60,
  'qa-agent':                120,  // checks all 4 components
  'release-notes-agent':      45,
  'duplicate-detector':       20,
};

// On timeout → treated as failure → enters retry queue
// Timeout is set on the Power Automate HTTP action "Timeout" field
// Format: PT{N}S (ISO 8601 duration) e.g. PT90S
```

---

## Circuit breaker

### New table: p3f_agentcircuitbreaker

| Column | Type | Notes |
|---|---|---|
| p3f_agentcircuitbreakerid | Autonumber | PK |
| p3f_agentname | Text 100 | Which agent is tripped |
| p3f_trippedat | DateTime | When circuit was tripped |
| p3f_reason | Text 500 | Why it tripped |
| p3f_resetat | DateTime | Auto-reset time (trippedAt + 2 hours) |
| p3f_manualreset | Boolean | If manager manually reset |
| p3f_active | Boolean | True = circuit open (agent blocked) |

### Circuit breaker logic (checked in p3f-flow-sla-watchdog)

```
Every 15 minutes:
  For each unique agentname in p3f_retryqueue:
    Count rows where createdon > now - 1 hour AND status IN [Pending, Retrying]

  If count >= 5:
    → Check p3f_agentcircuitbreaker: is there already an active record for this agent?
    → If not: INSERT new circuit breaker record (active = true, resetAt = now + 2hr)
    → Teams alert to manager: "⚠️ Agent {name} circuit breaker tripped.
       5+ failures in the last hour. All new tickets requiring this agent are held.
       [View failures] [Reset circuit]"

Every 15 minutes (auto-reset check):
  Query p3f_agentcircuitbreaker where active = true AND resetAt <= now
  → Set active = false
  → Re-queue any ESCALATED tickets that were held due to this circuit

When any agent flow starts:
  Query p3f_agentcircuitbreaker where agentname = '{this-agent}' AND active = true
  → If found: immediately status = ESCALATED, do not call GPT-4o
  → Log: "Agent {name} circuit breaker is open. Ticket held until circuit resets."
```

---

## Build agent skip logic

```
Build orchestrator dispatches only agents where:
  components_affected.{domain}.length > 0

Before dispatching each agent, sets p3f_buildplan.p3f_agentsdispatched += 1

If domain is empty (no changes):
  → Do NOT trigger that agent's GitHub Actions workflow
  → Directly call build-callback-handler:
    { ticket_id, status: "skipped", component: "{domain}" }
  → p3f_buildsuccess++ (skipped = success)

This ensures build-callback-handler always receives exactly p3f_agentsdispatched callbacks.
```

---

## Gate 1 override conditions

Gate 1 is ALWAYS active (regardless of tier) when ANY of:

```typescript
function gate1AlwaysRequired(ticket: P3FTicket, buildPlan: P3FBuildPlan): boolean {
  return (
    ticket.p3f_criticality === 1 ||                          // P1
    ticket.p3f_tickettype === 200 ||                         // any CR
    JSON.parse(buildPlan.p3f_securityreviewjson).risk_level === 'HIGH' ||
    JSON.parse(buildPlan.p3f_dataversespecjson).valid === false ||
    ticket.p3f_agentconfidence < 0.75 ||                     // low confidence
    ticket.p3f_emergencypath === true                         // hot-patch
  );
}
```

---

## New flows added in v6

```
p3f-flow-test-agent               Phase B — write test specs + uat steps
p3f-flow-security-review-agent    Phase B (runs last) — security risk assessment
p3f-flow-estimation-validator     Phase C — reconcile effort estimates
p3f-flow-release-notes-agent      After deploy — generate release notes
p3f-flow-circuit-breaker-check    Called by every agent flow at start
p3f-flow-circuit-breaker-reset    Triggered by manager or auto-timer
```

---

## New Dataverse columns needed

### p3f_ticket
```
p3f_assessmentlocked    Boolean   Set true when Phase A starts. Prevents re-assessment.
```

### p3f_buildplan
```
p3f_testspecsjson       Multiline Text   Test Agent output (unit, integration, UAT steps)
p3f_securityreviewjson  Multiline Text   Security Review Agent output
p3f_finalhoursestimate  Decimal          Estimation Validator recommended hours
p3f_discrepancyflag     Boolean          True if > 30% estimate discrepancy found
p3f_revision            Integer          Default 0. Increments if Gate 1 rejected + re-planned
```

### p3f_deployrecord
```
p3f_releasenotesjson    Multiline Text   Release Notes Agent output
```

### p3f_app
```
p3f_tablenamelist       Multiline Text   JSON array of existing DV table names (for architect)
```
