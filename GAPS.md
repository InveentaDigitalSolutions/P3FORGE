# P3 Forge — Gap Mitigations v5.0

> Every identified gap and its resolution. Reference this when Copilot asks
> "how does X work" for these cross-cutting concerns.

---

## GAP 1 — Environment strategy

**Problem:** No defined environment tier. Build agents had no target.

**Resolution:** 3 environments per client.

| Environment | Owner | Purpose | PAC CLI target |
|---|---|---|---|
| Dev | P3 shared (all clients) | All build agents write here | `PP_DEV_ENV_URL` (GitHub Secret) |
| UAT | Per client | Customer testing after Gate 1 build | `p3f_uatenvurl` on p3f_client |
| Prod | Per client | Live production after Gate 2 | `p3f_prodenvurl` on p3f_client |

**Flow:** Build agents → Dev → QA passes → UAT deploy → customer tests → Gate 2 → Prod deploy.

Every GitHub Actions workflow accepts `target_env_url` as an input parameter.
Dev URL is in GitHub Secrets. UAT and Prod URLs are read from Dataverse at runtime.

---

## GAP 2 — Concurrent ticket conflict

**Problem:** Two tickets editing the same flow/file/table simultaneously would overwrite each other.

**Resolution:** Component lock queue system.

**Table:** `p3f_componentlock` — one row per locked component per active ticket.

**Flows added:**
- `p3f-flow-componentlock-check` — before build starts
- `p3f-flow-componentlock-acquire` — reserve all components in build plan
- `p3f-flow-componentlock-release` — on deploy complete, cancel, or pause
- `p3f-flow-ticket-queue-manager` — polls every 30 min for lock release

**Behaviour:**
- If no conflict: acquire locks → build starts
- If conflict: ticket stays at `GATE1_PENDING`, manager notified, auto-checks every 30 min
- Lock is released automatically on: Deployed, Cancelled, Rolled Back, Paused (after current step)

---

## GAP 3 — Rollback plan

**Problem:** No recovery mechanism if a production deploy breaks the app.

**Resolution:** One-click rollback in manager dashboard. Human triggers, agents execute.

**Pre-deploy snapshot** (`p3f-flow-snapshot-before-deploy`):
Before every Prod deploy, exports and stores:
- PA flows as ZIP → `p3f_deployrecord.p3f_snapshot_pa`
- DV solution as XML → `p3f_deployrecord.p3f_snapshot_dv`
- Code App published version ID → `p3f_deployrecord.p3f_snapshot_codeapp_version`
- CS topics as YAML → `p3f_deployrecord.p3f_snapshot_cs`

**Rollback trigger:**
- Manager clicks "Rollback" on any deployed ticket in Gate 2 / Rollback panel
- OR `p3f-flow-dead-letter-handler` detects post-deploy health check failure

**Rollback execution** (`p3f-flow-rollback-orchestrator`):
1. Read snapshots from `p3f_deployrecord` for the ticket
2. Trigger in parallel: restore all 4 components to snapshot state
3. Release component locks
4. Insert `p3f_rollbackrecord`
5. Notify manager + customer in Teams
6. Status → `ESCALATED` (requires human decision on what to do next)

---

## GAP 4 — Azure OpenAI fallback

**Problem:** If GPT-4o is unavailable, tickets silently stall.

**Resolution:** Retry queue + model fallback for non-critical agents.

**Every agent flow:**
1. Attempt 1: GPT-4o
2. Attempt 2: GPT-4o retry (10s delay)
3. Fallback for non-critical agents (intake, requirement, duplicate-detector): GPT-4o-mini
4. Critical agents (all 4 specialists, QA agent): no fallback — insert into retry queue

**`p3f_retryqueue` table:** ticket_id, agent_name, serialised payload, retry_count, next_retry

**`p3f-flow-openai-retry-queue`** (scheduled every 30 min):
- Re-triggers failed agent with stored payload
- retry_count >= 4 (≥ 2 hours): permanent escalation to manager, removed from queue

**Status during retry:** `ESCALATED` with message "Auto-retrying. No action needed yet."
Status auto-reverts when retry succeeds.

---

## GAP 5 — Client onboarding

**Problem:** No defined process for connecting a new client. Manual portal work every time.

**Resolution:** Automated onboarding flow triggered by `p3f_client` record creation.

**`p3f-flow-client-onboarding` steps:**
1. Validate required fields (name, tier, managedby, UAT URL, Prod URL)
2. Verify UAT + Prod env URLs are reachable via PAC CLI
3. Create rate card for client (clone from global defaults if none specified)
4. Register Teams Agent for client tenant (if teamstenantid present)
5. Send welcome message to client's assigned P3 manager
6. Insert onboarding log → Teams summary card to P3 manager

**`p3f_onboardinglog` table:** step, status, timestamp, notes — tracks every onboarding action.

---

## GAP 6 — PR review and merge policy

**Problem:** Agent opens a PR — unclear who merges it and when.

**Resolution:** Tier-based auto-merge tied to approval events.

| Tier | Ticket type | Merge trigger |
|---|---|---|
| Supervised (1) | Any | Gate 2 approval click in manager dashboard |
| Semi-autonomous (2) | Any | Gate 2 approval click |
| Autonomous (3) | Bug/S or Bug/M | QA agent sign-off (no Gate 2 — auto-merge) |
| Autonomous (3) | CR or Bug/L+ | Gate 2 approval click |

**Implementation:** `p3f-flow-deploy-prod` calls `gh pr merge p3f/T-{id} --squash` as first step.
For Autonomous Bug/S+M: `p3f-flow-qa-agent` calls merge directly on QA pass.

Branch protection rule on `main`: PRs require status checks to pass.
Only the P3 service account (via GitHub PAT) can merge `p3f/` branches.

---

## GAP 7 — UAT environment

**Problem:** Customers were testing on production. Never acceptable.

**Resolution:** Dedicated per-client UAT environment. Deploy orchestrator deploys to UAT first.

**Deploy sequence:**
```
Gate 1 approved → build agents (Dev) → QA agent (Dev) → UAT deploy → customer tests → Gate 2 → Prod deploy
```

**UAT deploy** (`p3f-flow-uat-deploy`):
- Identical to Prod deploy but targets `p3f_uatenvurl`
- No snapshot taken (UAT is not critical)
- Customer notified with UAT environment link: "Please test at {uat_app_url}"

**Two new status codes:**
- `UAT_DEPLOY_PENDING (570)` — UAT deploy in progress
- `UAT_PENDING (700)` — customer testing in UAT (unchanged, now clearly UAT not Prod)

---

## GAP 8 — GDPR / data retention

**Problem:** No data retention policy. Agent logs contain client business data.

**Resolution:** Configurable per-client retention policy with automated enforcement.

**`p3f_dataretentionpolicy` table (one per client):**

| Column | Default | Notes |
|---|---|---|
| p3f_retentionperiodmonths | 24 | 2 years — safe for EU/GDPR |
| p3f_anonymiseonexpiry | true | Replaces PII with [anonymised] |
| p3f_deleteonexpiry | false | Hard delete option |
| p3f_legalhold | false | If true: skip all retention processing |

**`p3f-flow-gdpr-retention`** (daily at 02:00 UTC):
- Checks resolved tickets past retention period
- Anonymises: submittedby, rawmessage, all ticketmessage content, requirement structuredjson
- Or deletes: full ticket + all child records
- Skips if legalhold = true
- Logs every action to ticketmessage (sender: System)

**Default for new clients:** 24 months anonymise. Manager can change in Config screen.

---

## GAP 9 — Cancel / pause capability

**Problem:** No way for customer to stop a ticket in-flight.

**Resolution:** Teams Agent handles cancel and pause via intent detection.

**Cancel:**
- Status < `IN_DEVELOPMENT (550)`: immediate cancel, locks released, both notified
- Status >= `IN_DEVELOPMENT`: cannot auto-cancel. Manager alerted. Options: Force Cancel (triggers rollback) | Continue

**Pause:**
- Status = `PAUSED (990)`
- SLA watchdog skips paused tickets
- Customer resumes by saying "resume" in Teams
- If paused during build: current build step completes, then pauses before next step

**New Teams Agent topic:** Cancel/Pause — detects intent keywords in any language.

---

## GAP 10 — No customer status portal

**Problem:** Customers had no self-service view of their tickets beyond the Teams conversation.

**Resolution:** Teams Agent status check topic (already in spec). For richer view:

**Phase 2 addition:** Embedded `<StatusWidget />` component inside each delivered app
(alongside the existing `<SupportWidget />`). Shows:
- My open tickets with current status badge
- Timeline of agent actions
- UAT test link when ready
- Estimated completion from effort estimate

This reuses existing `p3f_ticket` and `p3f_ticketmessage` data — no new tables needed.

---

## GAP 11 — No feedback mechanism

**Problem:** No signal on whether resolutions were actually good.

**Resolution:** Post-resolution feedback request.

After status = `CLOSED` (48 hours after Deploy):
`p3f-flow-deploy-orchestrator` schedules a follow-up Teams message:
"How did we do on ticket T-{id}? Reply with a rating: 1 (poor) – 5 (excellent)"

Rating stored on `p3f_ticket.p3f_resolutionfeedback` (Integer, 1–5).
Visible in Analytics screen. Feeds into client relationship data.

---

## GAP 12 — No hot-patch process

**Problem:** Sometimes a critical fix needs to bypass the full pipeline.

**Resolution:** Manager-only emergency path in the dashboard.

Emergency path (Supervised and Semi-autonomous only — Autonomous clients trust the full pipeline):
1. Manager clicks "Emergency patch" on any ticket
2. System skips: specialist agents, offer generator, build orchestrator
3. Goes directly: Manager writes patch notes → Code App Build Agent only → QA Agent → Gate 2 → Deploy
4. Full audit entry in `p3f_ticketmessage`: "Emergency path used — specialist agents bypassed"
5. `p3f_trusthistory`: no tier impact (emergency path is acknowledged exception)

---

## GAP 13 — Dead-letter queue

**Problem:** Failed Power Automate flows can fail silently.

**Resolution:** `p3f-flow-dead-letter-handler` catches all unhandled failures.

All flows configure a "Run After" failure path pointing to `p3f-flow-dead-letter-handler`.
It receives: flow name, ticket ID, error message, timestamp.
Actions:
1. Insert to `p3f_retryqueue` if retryable
2. Update ticket status = ESCALATED if not retryable
3. Teams alert to manager with full error detail
4. Log to `p3f_ticketmessage` (sender: System)

---

## Summary — all gaps and resolution status

| # | Gap | Resolution | Where |
|---|---|---|---|
| 1 | Environment strategy | 3 tiers: Dev/UAT/Prod per client | copilot-instructions.md |
| 2 | Concurrent conflicts | Component lock queue | GAPS.md + DATAVERSE.md |
| 3 | Rollback plan | One-click, agent-executed, snapshot-based | GAPS.md + AGENTS.md |
| 4 | OpenAI fallback | Retry queue + model fallback | copilot-instructions.md |
| 5 | Client onboarding | Automated flow on record creation | GAPS.md + AGENTS.md |
| 6 | PR merge policy | Tier-based auto-merge rules | copilot-instructions.md |
| 7 | UAT environment | Per-client UAT, deploy before Prod | copilot-instructions.md |
| 8 | GDPR retention | Configurable per-client, automated | copilot-instructions.md |
| 9 | Cancel / pause | Teams intent detection + lock release | SPEC.md + AGENTS.md |
| 10 | Customer status view | Teams Agent + embedded widget (Phase 2) | GAPS.md |
| 11 | Resolution feedback | 48hr follow-up, 1–5 rating stored | GAPS.md |
| 12 | Hot-patch process | Manager-only emergency path | GAPS.md |
| 13 | Dead-letter queue | Failure handler on all flows | GAPS.md + copilot-instructions.md |
