# P3 Forge — Logic Reference v1.0

> Detailed logic for every non-obvious behaviour in the system.
> When Copilot asks "how does X work exactly?" — the answer is here.
> Read this alongside AGENTS.md and SPEC.md.

---

## 1. Prompt management — p3f_agentprompt table

All GPT-4o prompts are stored in Dataverse. No prompt text is hardcoded in any flow.

### Table: p3f_agentprompt

| Column | Type | Notes |
|---|---|---|
| p3f_agentpromptid | Autonumber | PK |
| p3f_agentname | Text 100 | Matches flow name suffix e.g. "intake-agent" |
| p3f_version | Integer | Increment on each change |
| p3f_systemprompt | Multiline Text | System instruction sent to GPT-4o |
| p3f_userprompttemplate | Multiline Text | Template with {placeholders} for runtime values |
| p3f_model | Text 50 | "gpt-4o" or "gpt-4o-mini" |
| p3f_active | Boolean | Only ONE active row per agentname at any time |
| p3f_notes | Text 500 | Why this version was created |

### How every agent flow reads its prompt

```
Step 1: GET /api/data/v9.2/p3f_agentprompts
          ?$filter=p3f_agentname eq 'intake-agent' and p3f_active eq true
          &$select=p3f_systemprompt,p3f_userprompttemplate,p3f_model

Step 2: Replace placeholders in p3f_userprompttemplate:
          {language} → detected language code
          {client_name} → p3f_client.p3f_name
          {app_name} → p3f_app.p3f_name
          {ticket_id} → p3f_ticket display ID
          {description} → p3f_ticket.p3f_rawmessage
          [agent-specific placeholders] → see AGENTS.md per agent

Step 3: Call Azure OpenAI with assembled messages array
```

### Agent names (p3f_agentname values)

```
intake-agent
requirement-agent
assessment-agent
architect-agent
pa-expert-agent
codeapp-expert-agent
dataverse-expert-agent
offer-generator
qa-agent
duplicate-detector
```

### How to update a prompt without redeploying flows

```
1. Create new p3f_agentprompt row with incremented version
2. Set p3f_active = true on new row
3. Set p3f_active = false on old row
4. Next flow execution picks up new prompt automatically
```

---

## 2. Seed data — exact records for first test

Create these records before running any test. A `seed-data.json` and corresponding
GitHub Action (`p3f-seed.yml`) should import these on first environment setup.

### p3f_client (1 row)

```json
{
  "p3f_name": "P3 Internal",
  "p3f_autonomytier": 1,
  "p3f_defaultlanguage": 2,
  "p3f_envurl": "{PP_ENV_URL}",
  "p3f_active": true,
  "p3f_onboardingcomplete": true
}
```

### p3f_project (1 row)

```json
{
  "p3f_name": "P3 Forge Platform",
  "p3f_techstack": "Power Apps Code App · Dataverse · TypeScript · Power Automate"
}
```

### p3f_app (1 row)

```json
{
  "p3f_name": "P3 Forge Manager App",
  "p3f_publishedversion": "1.0.0"
}
```

### p3f_ratecard (8 rows — global defaults, clientid = null)

```json
[
  { "p3f_label": "Bug — Small",          "p3f_tickettype": 100, "p3f_complexity": 1, "p3f_baseprice": 400,   "p3f_basehours": 3   },
  { "p3f_label": "Bug — Medium",         "p3f_tickettype": 100, "p3f_complexity": 2, "p3f_baseprice": 900,   "p3f_basehours": 8   },
  { "p3f_label": "Bug — Large",          "p3f_tickettype": 100, "p3f_complexity": 3, "p3f_baseprice": 2000,  "p3f_basehours": 20  },
  { "p3f_label": "Bug — XL",             "p3f_tickettype": 100, "p3f_complexity": 4, "p3f_baseprice": 4000,  "p3f_basehours": 40  },
  { "p3f_label": "Change Request — Small","p3f_tickettype": 200, "p3f_complexity": 1, "p3f_baseprice": 800,   "p3f_basehours": 6   },
  { "p3f_label": "Change Request — Medium","p3f_tickettype":200, "p3f_complexity": 2, "p3f_baseprice": 2400,  "p3f_basehours": 20  },
  { "p3f_label": "Change Request — Large","p3f_tickettype": 200, "p3f_complexity": 3, "p3f_baseprice": 5500,  "p3f_basehours": 45  },
  { "p3f_label": "Change Request — XL",  "p3f_tickettype": 200, "p3f_complexity": 4, "p3f_baseprice": 12000, "p3f_basehours": 100 }
]
```

### p3f_dataretentionpolicy (1 row)

```json
{
  "p3f_retentionperiodmonths": 24,
  "p3f_anonymiseonexpiry": true,
  "p3f_deleteonexpiry": false,
  "p3f_legalhold": false
}
```

### p3f_agentprompt (10 rows — initial v1 prompts)

One row per agent, all active. See AGENTS.md for full prompt text per agent.
All start as version 1. Model = "gpt-4o" for all except duplicate-detector = "gpt-4o-mini".

---

## 3. Flow completion counters — event-driven, not polling

### Specialist agents completion (p3f_specialistscomplete)

Each of the 4 specialist flows ends with:
```
PATCH /api/data/v9.2/p3f_tickets({ticketId})
Body: { "p3f_specialistscomplete": @{add(triggerBody()?['p3f_specialistscomplete'], 1)} }
```

`p3f-flow-buildplan-consolidator` trigger:
```
Dataverse: "When a row is updated"
Table: p3f_ticket
Filter: p3f_specialistscomplete eq 4 AND p3f_status eq 350
```

This fires exactly once when the 4th specialist completes. No race condition because
Dataverse updates are atomic — only one flow sees the transition from 3→4.

### Build agents completion (p3f_buildsuccess + p3f_buildfailed)

`p3f_buildplan.p3f_agentsdispatched` is set when the build orchestrator fires.
Value = count of components affected (1–4).

Each build callback increments either `p3f_buildsuccess` or `p3f_buildfailed`.

`p3f-flow-build-callback-handler` checks after each increment:
```
if (buildsuccess + buildfailed) == agentsdispatched:
  if buildfailed > 0:
    → retry failed agents (up to 2 attempts)
    → if still failing: status = ESCALATED
  else:
    → trigger p3f-flow-qa-agent
```

---

## 4. Teams reply routing — full decision tree

`p3f-flow-teams-reply-handler` receives every message sent to the P3 Forge Teams Agent.

### Step 1: Match conversation to ticket

```
Query: p3f_tickets
  ?$filter=p3f_conversationid eq '{teamsConversationId}'
  AND p3f_status ne 850    (not Closed)
  AND p3f_status ne 999    (not Cancelled)
  AND p3f_status ne 975    (not Expired)

Result A — exactly 1 ticket found: proceed to Step 2
Result B — 0 tickets found: treat as new intake → trigger p3f-flow-teams-intake
Result C — 2+ tickets found (edge case): agent asks customer to specify ticket ID
```

`p3f_ticket.p3f_conversationid` is set by `p3f-flow-teams-intake` immediately on ticket creation using the `conversationId` from the Copilot Studio webhook payload.

### Step 2: Route by status

```typescript
switch (ticket.p3f_status) {
  case 200: // CONFIRMING — Gate 0 in progress
    → p3f-flow-gate0-confirmation-handler
    break;

  case 150: // STRUCTURING — intake agent still processing
    → append message to p3f_ticketmessage, re-trigger intake agent
    break;

  case 400: // OFFER_SENT
    → p3f-flow-offer-reply-handler
    break;

  case 700: // UAT_PENDING
    → p3f-flow-uat-response-handler
    break;

  case 990: // PAUSED
    → if intent = "resume": restore previous status, notify manager, continue pipeline
    → else: append to p3f_ticketmessage, reply "Ticket paused. Reply RESUME to continue."
    break;

  default:
    → if message contains ticket ID pattern (T-\d+): status check response
    → if intent = "cancel": p3f-flow-cancel-handler
    → if intent = "pause": p3f-flow-pause-handler
    → if intent = "status": look up ticket status, reply with plain language status
    → else: append to p3f_ticketmessage (general update), notify manager
}
```

### Step 3: Handle ambiguous offer reply

```
Customer reply to offer: detect intent
  ACCEPT: "yes", "accepted", "proceed", "let's go", "ja", "sí", "oui", "ok", "deal"
  REJECT: "no", "reject", "too expensive", "nein", "non", "not interested"
  AMBIGU: "maybe", "not sure", "can we talk", "discuss", "what about", "hmm"

if AMBIGUOUS:
  → reply: "I want to make sure — are you happy to proceed with this proposal,
            or would you like to discuss it further?"
  → set p3f_offer.p3f_clarificationpending = true
  → if customer still ambiguous on next reply: Escalated → Teams alert to manager
```

---

## 5. Dataverse security roles — exact definitions

### Role: P3Manager

```
p3f_client:            Read All, Write All, Append, AppendTo
p3f_project:           Read All, Write All
p3f_app:               Read All, Write All
p3f_ratecard:          Read All, Write All
p3f_ticket:            Read All, Write All
p3f_ticketmessage:     Read All, Create (no Update, no Delete)
p3f_requirement:       Read All, Create (no Update/Delete — enforced by plugin)
p3f_offer:             Read All, Write All
p3f_architectplan:     Read All
p3f_buildplan:         Read All, Write (status + approval fields only)
p3f_qareport:          Read All
p3f_deployrecord:      Read All
p3f_rollbackrecord:    Read All, Create
p3f_trusthistory:      Read All, Create (no Update/Delete — enforced by plugin)
p3f_billingrecord:     Read All
p3f_retryqueue:        Read All
p3f_agentprompt:       Read All, Write All
p3f_dataretentionpolicy: Read All, Write All
```

### Role: AgentService (Power Automate service account)

```
All tables: Read All, Create, Write All
Exception: p3f_trusthistory — Create only (plugin blocks Update/Delete)
Exception: confirmed p3f_requirement — plugin blocks Update/Delete after p3f_status = 3
No Delete on any table
```

### Role: ClientUser (future — not built in Phase 1)

```
p3f_ticket:        Read (own only — filter: p3f_submittedby = current user)
p3f_ticketmessage: Read (own tickets only)
p3f_requirement:   Read (own tickets only)
p3f_offer:         Read (own tickets only)
All other tables:  No access
```

### Plugin: insert-only enforcement

```csharp
// Register on Pre-Update and Pre-Delete of p3f_trusthistory and p3f_requirement
public void Execute(IServiceProvider serviceProvider) {
    var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));

    if (context.MessageName == "Update" || context.MessageName == "Delete") {
        // For p3f_trusthistory: always block
        if (context.PrimaryEntityName == "p3f_trusthistory") {
            throw new InvalidPluginExecutionException("p3f_trusthistory is insert-only.");
        }
        // For p3f_requirement: block if status = 3 (Confirmed)
        if (context.PrimaryEntityName == "p3f_requirement") {
            var req = context.PreEntityImages["PreImage"] as Entity;
            if (req?.GetAttributeValue<OptionSetValue>("p3f_status")?.Value == 3) {
                throw new InvalidPluginExecutionException("Confirmed requirements are immutable.");
            }
        }
    }
}
```

---

## 6. Deploy sequence — strict and enforced

`p3f-flow-deploy-orchestrator` executes components in this exact order.
Each step must complete successfully before the next starts. Not parallel.

```
Step 1: SNAPSHOT (always first)
  → p3f-flow-snapshot-before-deploy
  → Must succeed or entire deploy aborts

Step 2: DATAVERSE
  → .github/workflows/p3f-deploy.yml: dataverse job
  → pac solution import --path solution/P3Forge_v1.zip
  → Wait for import completion (pac solution list to verify)
  → On failure: abort, no rollback needed (schema not applied)

Step 3: POWER AUTOMATE
  → .github/workflows/p3f-deploy.yml: pa-flows job (needs: dataverse)
  → pac flow import for each flow in pa_specs
  → pac flow activate for each
  → On failure: rollback DV from snapshot

Step 4: CODE APP
  → .github/workflows/p3f-deploy.yml: codeapp job (needs: pa-flows)
  → PR already merged at this point (auto-merged when checks passed)
  → pac canvas pack + pac canvas publish
  → On failure: rollback DV + PA from snapshots

Step 5: COPILOT STUDIO
  → .github/workflows/p3f-deploy.yml: copilot job (needs: codeapp)
  → pac copilot topic import + pac copilot publish
  → On failure: rollback all 4 from snapshots

Step 6: VERIFY + NOTIFY
  → Health check: ping each component
  → Create p3f_billingrecord (CR tickets only)
  → Update p3f_ticket status = DEPLOYED
  → Teams notification to customer
  → Update p3f_deployrecord with success
```

---

## 7. Business rules — all defined

| Rule | Behaviour |
|---|---|
| Billing for bugs | No billing record. Bugs are included in P3 support. Only resolved CRs generate p3f_billingrecord. |
| Max description length | 4,000 characters. Intake agent truncates at 3,800 and appends "[truncated — original message stored]". Full message stored in p3f_ticketmessage separately. |
| triageloopcount | Increments only on Gate 0 correction (customer says something is wrong). Does NOT increment on ambiguous replies or status checks. Resets to 0 on new ticket only. |
| Re-open closed ticket | P3 Manager only, from Gate 2 / ticket detail in dashboard. Status returns to CONFIRMED (250) — ticket re-enters from assessment with original confirmed requirement. New assessment may change classification. |
| Client deactivated mid-flight | In-flight tickets (status < 850): complete normally — do not interrupt active builds. New intake: Teams reply "Support for this account is currently paused. Contact your P3 representative." p3f-flow-sla-watchdog skips deactivated clients. |
| Feedback timing | p3f-flow-deploy-orchestrator schedules a Power Automate delayed action: wait 48 hours after deploy → send Teams feedback message. |
| Offer price rounding | Always round to nearest €50 for presentation. Store exact value in p3f_offer.p3f_price, display rounded value in Teams message. |
| Duplicate ticket + original closed | If original ticket is Closed and new ticket is highly similar: do NOT flag as duplicate. Treat as new ticket — previous fix may not have held. |

---

## 8. p3f_conversationid — new column on p3f_ticket

Add to DATAVERSE.md:

```
p3f_conversationid   Text 500   Copilot Studio conversation ID.
                                Set on ticket creation by teams-intake flow.
                                Used by teams-reply-handler to route replies.
                                Indexed for fast lookup.
```

---

## 9. p3f_clarificationpending — new column on p3f_offer

```
p3f_clarificationpending   Boolean   Default: false.
                                     Set to true when customer gives ambiguous offer reply.
                                     Teams-reply-handler re-routes next message to offer handler.
```

---

## 10. GitHub Action — seed data

```yaml
# .github/workflows/p3f-seed.yml
name: P3 Forge — seed data
on:
  workflow_dispatch:      # manual trigger only
    inputs:
      confirm:
        description: 'Type SEED to confirm'
        required: true

jobs:
  seed:
    runs-on: ubuntu-latest
    if: github.event.inputs.confirm == 'SEED'
    steps:
      - uses: actions/checkout@v4
      - name: Install PAC CLI
        run: npm install -g @microsoft/powerplatform-cli
      - name: Auth
        run: pac auth create --url ${{ secrets.PP_ENV_URL }} --applicationId ${{ secrets.PP_APP_ID }} --clientSecret ${{ secrets.PP_APP_SECRET }} --tenant ${{ secrets.PP_TENANT_ID }}
      - name: Import seed data
        run: pac data import --data ./seed/seed-data.zip
```

Seed data packaged as a Dataverse data export ZIP in `/seed/seed-data.zip`.
