# P3 Forge
**Agentic software delivery platform — P3 Group.**
**Version:** 4.0 — Architecture complete. Ready to build.

Clients describe what they want in Microsoft Teams. Agents structure, confirm, design,
build, test, and deploy. P3 managers appear at two gates that shrink over time.

**Tagline:** Describe it. We forge it.

---

## Read these before writing any code

| File | Purpose |
|---|---|
| `.github/copilot-instructions.md` | Tech stack, env strategy, table/column/flow names, PAC CLI patterns, branch policy, GDPR, security rules. Auto-read by Copilot. |
| `SPEC.md` | All scenarios, business rules, Gate 0–2 logic, cancel/pause, rollback rules |
| `AGENTS.md` | All agents: GPT-4o prompts, input/output contracts, parallel patterns |
| `DATAVERSE.md` | All 17 tables, TypeScript types, OData queries |
| `LOGIC.md` | Flow trigger logic, prompt management, seed data, security roles, business rules, deploy sequence |
| `REQUIREMENTS_REGISTRY.md` | Living requirements registry: data model, 2 new agents, 3 deliberation loops, regression detection |
| `AGENT_COMMS.md` | Agent-to-agent communication protocol, deliberation loops, message format, all 6 deliberation pairs |
| `AGENT_RULES.md` | All 18 agents, execution phases, dependency map, conflict resolution, timeouts, circuit breaker |
| `COPILOT_STUDIO.md` | Teams Agent build guide: all 7 topics, message templates, proactive messages, conversation variables |
| `GAPS.md` | Every identified gap + its resolution — reference for cross-cutting concerns |

---

## Architecture decisions — v4

| Decision | Choice | Notes |
|---|---|---|
| Environments | 1 shared P3 env now | Architecture ready for Dev/Test/Prod per client |
| Client access | Azure AD B2B guest → P3 tenant | Manual setup by P3 manager |
| Concurrent conflicts | Branch isolation | Both build; conflict surfaces at Gate 2 |
| PR merge | Auto-merge on checks pass | No human reviewer needed |
| Rollback | One-click, agent-executed | Snapshot taken before every deploy |
| GDPR | Configurable per client | Default: 24 months, anonymise |
| OpenAI fallback | Retry queue + GPT-4o-mini | Auto-retry 30min, escalate at 2hr |
| Cancel/pause | Teams intent detection | Graceful at all stages |

---

## Environment — now vs future

```
NOW:  One P3 shared environment
      └── All clients, all tickets, all agents → same env
      └── Isolation via p3f_clientid on every table

FUTURE (when deployed per client):
      Client Dev  ← build agents
      Client Test ← integration tests
      Client Prod ← live
      
      Code change: update p3f_client.p3f_envurl per environment
      No code rewrite needed — env URL always read from Dataverse
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Manager UI | Power Apps Code App — React 18 + TypeScript + Fluent UI v9 |
| Data | Dataverse — `P3Forge_v1`, prefix `p3f` |
| Agents | Power Automate + Azure OpenAI GPT-4o |
| Teams intake | Copilot Studio — P3 tenant |
| Build agents | GitHub Actions + Claude Code + PAC CLI |
| Auth | MSAL.js v3 + Azure AD B2B |

---

## Build phases

```
Phase 1   Dataverse solution — all 17 tables, seed rate card data
Phase 2   Teams Agent intake + Gate 0 end-to-end
Phase 3   Assessment + 4 specialist agents + buildplan consolidator
Phase 4   CR offer path
Phase 5   GitHub Actions: 4 build workflows + PAC CLI + auto-merge
Phase 6   QA agent + Gate 2 + snapshot + deploy + rollback
Phase 7   OpenAI retry queue + dead-letter handler
Phase 8   Code App: all screens + conflict alert + rollback panel
Phase 9   Scheduled flows: SLA watchdog, GDPR, offer expiry, demotion
Phase 10  First real ticket — P3 internal, Supervised tier
```

---

## GitHub Secrets

```
PP_ENV_URL         P3 Forge Power Platform environment URL
PP_APP_ID          Service principal (PAC CLI)
PP_APP_SECRET      Service principal secret
PP_TENANT_ID       Azure AD tenant ID
ANTHROPIC_API_KEY  Claude Code
GITHUB_PAT         PR auto-merge
```

---

## Naming conventions

| Thing | Convention |
|---|---|
| Dataverse tables | `p3f_tablename` |
| Dataverse columns | `p3f_columnname` |
| Power Automate flows | `p3f-flow-flowname` |
| GitHub Actions | `p3f-workflowname.yml` |
| Agent branches | `p3f/T-{ticketId}` |
| Commits | `type(T-NNNN): description` |
| Solution | `P3Forge_v1` |
| Publisher prefix | `p3f` |
