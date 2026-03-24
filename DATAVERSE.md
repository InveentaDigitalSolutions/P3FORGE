# P3 Forge — Dataverse Schema v5.0

> Solution: P3Forge_v1 | Publisher prefix: p3f | All tables/columns: p3f_ prefix
> Use this file to generate: solution XML, TypeScript types, OData queries

---

## Table: p3f_client

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_clientid | Autonumber | Yes | PK. Display: C-{0000} |
| p3f_name | Text 200 | Yes | Client display name |
| p3f_autonomytier | OptionSet | Yes | 1=Supervised, 2=SemiAutonomous, 3=Autonomous. Default: 1 |
| p3f_defaultlanguage | OptionSet | Yes | 1=DE, 2=EN, 3=ES, 4=FR. Default: 2 |
| p3f_teamstenantid | Text 100 | No | Azure AD tenant ID |
| p3f_managedby | Lookup → SystemUser | Yes | P3 consultant responsible |
| p3f_pricethreshold | Currency | No | CR Gate 2 threshold. Default: 2000 EUR |
| p3f_active | Boolean | Yes | Default: true |

---

## Table: p3f_project

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_projectid | Autonumber | Yes | PK |
| p3f_clientid | Lookup → p3f_client | Yes | FK |
| p3f_name | Text 200 | Yes | |
| p3f_repouri | URL | No | GitHub HTTPS repo URL |
| p3f_techstack | Text 500 | No | |
| p3f_status | OptionSet | Yes | 1=Active, 2=Maintenance, 3=Archived |

---

## Table: p3f_app

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_appid | Autonumber | Yes | PK |
| p3f_projectid | Lookup → p3f_project | Yes | FK |
| p3f_name | Text 200 | Yes | |
| p3f_ratecardid | Lookup → p3f_ratecard | No | Override rate card |
| p3f_environmenturl | URL | No | Power Apps environment URL |
| p3f_publishedversion | Text 50 | No | Current production version |
| p3f_flownames | Multiline Text | No | JSON array of flow names in this app |
| p3f_screenfiles | Multiline Text | No | JSON array of Code App screen file paths |
| p3f_topicnames | Multiline Text | No | JSON array of Copilot Studio topic names |

---

## Table: p3f_ratecard

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_ratecardid | Autonumber | Yes | PK |
| p3f_clientid | Lookup → p3f_client | No | Null = global default |
| p3f_label | Text 200 | Yes | E.g. "Bug fix — Small" |
| p3f_tickettype | OptionSet | Yes | 100=Bug, 200=ChangeRequest |
| p3f_complexity | OptionSet | Yes | 1=S, 2=M, 3=L, 4=XL |
| p3f_baseprice | Currency | Yes | EUR anchor |
| p3f_basehours | Decimal | Yes | Hour anchor |

### Seed data (8 global default rows)
| Type | S | M | L | XL |
|---|---|---|---|---|
| Bug price | €400 / 3h | €900 / 8h | €2000 / 20h | €4000 / 40h |
| CR price | €800 / 6h | €2400 / 20h | €5500 / 45h | €12000 / 100h |

---

## Table: p3f_ticket (central entity)

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_ticketid | Autonumber | Yes | PK. Display: T-{0000} |
| p3f_clientid | Lookup → p3f_client | Yes | Every query filters by this |
| p3f_appid | Lookup → p3f_app | Yes | |
| p3f_title | Text 200 | No | Set by intake agent |
| p3f_rawmessage | Multiline Text | Yes | Customer's original words verbatim |
| p3f_status | OptionSet | Yes | Full lifecycle — see STATUS_CODES |
| p3f_tickettype | OptionSet | No | 100=Bug, 200=CR, 300=Unclassified |
| p3f_criticality | OptionSet | No | 1=P1, 2=P2, 3=P3, 4=P4 |
| p3f_complexity | OptionSet | No | 1=S, 2=M, 3=L, 4=XL |
| p3f_agentconfidence | Decimal | No | 0.00–1.00. Below 0.75 = escalate |
| p3f_autonomytier | OptionSet | No | Snapshotted at assessment. Immutable after |
| p3f_gate1required | Boolean | No | Computed at routing |
| p3f_gate2required | Boolean | No | Computed at routing |
| p3f_language | OptionSet | No | 1=DE, 2=EN, 3=ES, 4=FR |
| p3f_submittedby | Text 200 | Yes | Teams user ID or email |
| p3f_assignedmanager | Lookup → SystemUser | No | Copied from client |
| p3f_triageloopcount | Integer | No | Gate 0 correction rounds. Default: 0 |
| p3f_specialistscomplete | Integer | No | 0–4. Buildplan fires when = 4 |
| p3f_offerrevcount | Integer | No | Default: 0. Escalate at 2 |
| p3f_qaretrycount | Integer | No | Default: 0. Escalate at 2 |
| p3f_buildsuccess | Integer | No | Count of successful build agent callbacks |
| p3f_buildfailed | Integer | No | Count of failed build agent callbacks |
| p3f_sladue | DateTime | No | Set at creation from criticality |
| p3f_resolvedon | DateTime | No | Set on Deploy |
| p3f_duplicateof | Lookup → p3f_ticket | No | Self-referential |

---

## Table: p3f_ticketmessage (insert-only)

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_messageid | Autonumber | Yes | PK |
| p3f_ticketid | Lookup → p3f_ticket | Yes | FK |
| p3f_sender | OptionSet | Yes | 1=Customer, 2=IntakeAgent, 3=RequirementAgent, 4=AssessmentAgent, 5=ArchitectAgent, 6=PAExpertAgent, 7=CodeAppExpertAgent, 8=DataverseAgent, 9=OfferAgent, 10=BuildAgent, 11=QAAgent, 12=Manager, 13=System |
| p3f_content | Multiline Text | Yes | |
| p3f_language | OptionSet | No | Language of this message |
| p3f_channel | OptionSet | No | 1=Teams, 2=Email, 3=Widget, 4=Internal |
| p3f_createdon | DateTime | Yes | System-set |

---

## Table: p3f_requirement (Gate 0 output — immutable once confirmed)

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_requirementid | Autonumber | Yes | PK |
| p3f_ticketid | Lookup → p3f_ticket | Yes | FK |
| p3f_type | OptionSet | Yes | 100=BugReport, 200=UserStory |
| p3f_structuredjson | Multiline Text | Yes | Full structured requirement as JSON |
| p3f_plainlanguagesummary | Multiline Text | Yes | Requirement agent output |
| p3f_effortestimate | Text 200 | Yes | E.g. "8–12 hours" |
| p3f_priceestimate | Text 200 | No | CR only. E.g. "€900–€1,100" |
| p3f_included | Multiline Text | No | JSON array |
| p3f_notincluded | Multiline Text | No | JSON array |
| p3f_status | OptionSet | Yes | 1=Draft, 2=SentToCustomer, 3=Confirmed |
| p3f_confirmedon | DateTime | No | Set when customer confirms |
| p3f_correctioncount | Integer | No | How many corrections before confirmed |

---

## Table: p3f_architectplan

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_architectplanid | Autonumber | Yes | PK |
| p3f_ticketid | Lookup → p3f_ticket | Yes | FK |
| p3f_approach | Multiline Text | Yes | Technical approach summary |
| p3f_componentsaffected | Multiline Text | Yes | JSON: ArchitectPlan.components_affected |
| p3f_dependencies | Multiline Text | No | JSON array of cross-component deps |
| p3f_riskflags | Multiline Text | No | JSON array |
| p3f_implementationorder | Multiline Text | No | JSON array |
| p3f_estimatedhours | Decimal | Yes | |

---

## Table: p3f_buildplan (Gate 1 review content)

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_buildplanid | Autonumber | Yes | PK |
| p3f_ticketid | Lookup → p3f_ticket | Yes | FK |
| p3f_architectplanid | Lookup → p3f_architectplan | Yes | FK |
| p3f_plansummary | Multiline Text | Yes | Human-readable consolidated summary |
| p3f_paspecsjson | Multiline Text | No | PA flow specs JSON |
| p3f_codeappspecjson | Multiline Text | No | Code App spec JSON |
| p3f_dataversespecjson | Multiline Text | Yes | Dataverse spec JSON |
| p3f_dataversevalid | Boolean | Yes | Dataverse spec blocker-free |
| p3f_acceptancecriteria | Multiline Text | Yes | JSON array — passed to QA agent |
| p3f_status | OptionSet | Yes | 1=Draft, 2=PendingApproval, 3=Approved, 4=Rejected |
| p3f_approvedby | Lookup → SystemUser | No | Gate 1 approver |
| p3f_approvedon | DateTime | No | |
| p3f_prurl | URL | No | GitHub PR URL (Code App) |
| p3f_branch | Text 200 | No | Git branch: p3f/T-{id} |

---

## Table: p3f_qareport

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_qareportid | Autonumber | Yes | PK |
| p3f_ticketid | Lookup → p3f_ticket | Yes | FK |
| p3f_criteriaresultsjson | Multiline Text | Yes | JSON array: [{criterion, passed, component, reasoning}] |
| p3f_passed | Boolean | Yes | Overall result |
| p3f_failuresummary | Multiline Text | No | |
| p3f_retrycount | Integer | No | Which attempt this is |
| p3f_signedoffon | DateTime | No | |

---

## Table: p3f_offer

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_offerid | Autonumber | Yes | PK |
| p3f_ticketid | Lookup → p3f_ticket | Yes | FK |
| p3f_scopesummary | Multiline Text | Yes | |
| p3f_exclusions | Multiline Text | No | |
| p3f_price | Currency | Yes | |
| p3f_hours | Decimal | No | |
| p3f_timeline | Text 200 | No | |
| p3f_status | OptionSet | Yes | 1=Draft, 2=Sent, 3=Accepted, 4=Rejected, 5=Expired, 6=Revised |
| p3f_revision | Integer | No | 0=original |
| p3f_customercomment | Multiline Text | No | Rejection comment |
| p3f_expireson | DateTime | Yes | now + 14 days when Sent |

---

## Table: p3f_deployrecord

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_deployrecordid | Autonumber | Yes | PK |
| p3f_ticketid | Lookup → p3f_ticket | Yes | FK |
| p3f_deployedon | DateTime | Yes | |
| p3f_deployedby | Text 200 | Yes | "Autonomous" or manager name |
| p3f_componentsdeployed | Multiline Text | Yes | JSON: which of 4 components deployed |
| p3f_paflowsactivated | Multiline Text | No | JSON array of flow names |
| p3f_codeappversion | Text 50 | No | Published version |
| p3f_dataversechanges | Multiline Text | No | JSON summary |
| p3f_copilottopics | Multiline Text | No | JSON array of topics updated |

---

## Table: p3f_trusthistory (INSERT-ONLY — never update or delete)

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_trusthistoryid | Autonumber | Yes | PK |
| p3f_clientid | Lookup → p3f_client | Yes | FK |
| p3f_ticketid | Lookup → p3f_ticket | No | Triggering ticket |
| p3f_event | Text 500 | Yes | What happened |
| p3f_tierbefore | OptionSet | Yes | Previous tier |
| p3f_tierafter | OptionSet | Yes | New tier |
| p3f_changedby | Lookup → SystemUser | No | Null = automatic |
| p3f_createdon | DateTime | Yes | System-set |

---

## Table: p3f_billingrecord

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_billingrecordid | Autonumber | Yes | PK |
| p3f_ticketid | Lookup → p3f_ticket | Yes | FK |
| p3f_clientid | Lookup → p3f_client | Yes | Denormalised for reporting |
| p3f_offerid | Lookup → p3f_offer | No | Accepted offer |
| p3f_agreedprice | Currency | Yes | From offer at acceptance |
| p3f_tickettype | OptionSet | Yes | Bug or CR |
| p3f_resolvedon | DateTime | Yes | |
| p3f_invoiced | Boolean | No | Default: false |

---

## TypeScript types

```typescript
interface P3FTicket {
  p3f_ticketid: string;
  p3f_title?: string;
  p3f_rawmessage: string;
  p3f_status: number;
  p3f_tickettype?: 100 | 200 | 300;
  p3f_criticality?: 1 | 2 | 3 | 4;
  p3f_complexity?: 1 | 2 | 3 | 4;
  p3f_agentconfidence?: number;
  p3f_autonomytier?: 1 | 2 | 3;
  p3f_gate1required?: boolean;
  p3f_gate2required?: boolean;
  p3f_language?: 1 | 2 | 3 | 4;
  p3f_submittedby: string;
  p3f_triageloopcount: number;
  p3f_specialistscomplete: number;
  p3f_offerrevcount: number;
  p3f_qaretrycount: number;
  p3f_sladue?: string;
  p3f_createdon: string;
  p3f_resolvedon?: string;
  '_p3f_clientid_value': string;
  '_p3f_appid_value': string;
}

interface P3FRequirement {
  p3f_requirementid: string;
  p3f_type: 100 | 200;
  p3f_structuredjson: string;
  p3f_plainlanguagesummary: string;
  p3f_effortestimate: string;
  p3f_priceestimate?: string;
  p3f_status: 1 | 2 | 3;
  p3f_confirmedon?: string;
  p3f_correctioncount: number;
  '_p3f_ticketid_value': string;
}

interface P3FBuildPlan {
  p3f_buildplanid: string;
  p3f_plansummary: string;
  p3f_paspecsjson?: string;
  p3f_codeappspecjson?: string;
  p3f_dataversespecjson: string;
  p3f_dataversevalid: boolean;
  p3f_acceptancecriteria: string;
  p3f_status: 1 | 2 | 3 | 4;
  p3f_prurl?: string;
  p3f_branch?: string;
  '_p3f_ticketid_value': string;
}

interface P3FQAReport {
  p3f_qareportid: string;
  p3f_criteriaresultsjson: string;
  p3f_passed: boolean;
  p3f_failuresummary?: string;
  p3f_retrycount?: number;
  '_p3f_ticketid_value': string;
}
```

---

## Common OData queries

```typescript
// Gate 1 pending
GET /api/data/v9.2/p3f_tickets
  ?$filter=p3f_status eq 500 and p3f_gate1required eq true
  &$expand=p3f_clientid($select=p3f_name,p3f_autonomytier)
  &$orderby=p3f_sladue asc

// Tickets awaiting Gate 0 confirmation
GET /api/data/v9.2/p3f_tickets
  ?$filter=p3f_status eq 200
  &$select=p3f_ticketid,p3f_title,p3f_createdon,p3f_triageloopcount

// Specialist agents in progress
GET /api/data/v9.2/p3f_tickets
  ?$filter=p3f_status eq 350 and p3f_specialistscomplete lt 4
  &$select=p3f_ticketid,p3f_specialistscomplete,p3f_createdon

// Kanban — all active tickets for a client
GET /api/data/v9.2/p3f_tickets
  ?$filter=_p3f_clientid_value eq {clientId} and p3f_status ne 850
  &$select=p3f_ticketid,p3f_title,p3f_status,p3f_criticality,p3f_sladue
  &$orderby=p3f_criticality asc, p3f_sladue asc

// Confirmed requirement for a ticket
GET /api/data/v9.2/p3f_requirements
  ?$filter=_p3f_ticketid_value eq {ticketId} and p3f_status eq 3
```

---

## Table: p3f_rollbackrecord

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_rollbackrecordid | Autonumber | Yes | PK |
| p3f_ticketid | Lookup → p3f_ticket | Yes | FK |
| p3f_triggeredby | Lookup → SystemUser | No | Manager who triggered |
| p3f_triggeredon | DateTime | Yes | |
| p3f_reason | Text 500 | Yes | |
| p3f_componentsrolledback | Multiline Text | Yes | JSON: which components |
| p3f_result | OptionSet | Yes | 1=Success, 2=PartialFailure, 3=Failed |

---

## Table: p3f_retryqueue

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_retryqueueid | Autonumber | Yes | PK |
| p3f_ticketid | Lookup → p3f_ticket | Yes | FK |
| p3f_agentname | Text 200 | Yes | Which flow failed |
| p3f_payloadjson | Multiline Text | Yes | Serialised input to re-run |
| p3f_retrycount | Integer | Yes | Default: 0 |
| p3f_nextretry | DateTime | Yes | now + 30 min |
| p3f_lasterror | Multiline Text | No | Last error message |
| p3f_status | OptionSet | Yes | 1=Pending, 2=Retrying, 3=Escalated, 4=Resolved |

---

## Table: p3f_onboardinglog

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_onboardinglogid | Autonumber | Yes | PK |
| p3f_clientid | Lookup → p3f_client | Yes | FK |
| p3f_step | Text 200 | Yes | Step name |
| p3f_status | OptionSet | Yes | 1=Pending, 2=Complete, 3=Failed |
| p3f_notes | Multiline Text | No | |
| p3f_createdon | DateTime | Yes | |

---

## Table: p3f_dataretentionpolicy

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_dataretentionpolicyid | Autonumber | Yes | PK |
| p3f_clientid | Lookup → p3f_client | Yes | One per client |
| p3f_retentionperiodmonths | Integer | Yes | Default: 24 |
| p3f_anonymiseonexpiry | Boolean | Yes | Default: true |
| p3f_deleteonexpiry | Boolean | Yes | Default: false |
| p3f_legalhold | Boolean | Yes | Default: false |

---

## New columns on existing tables

### p3f_client (additions)

| Column | Type | Notes |
|---|---|---|
| p3f_uatenvurl | URL | Client UAT environment URL |
| p3f_prodenvurl | URL | Client Production environment URL |
| p3f_onboardingcomplete | Boolean | Default: false |

### p3f_ticket (additions)

| Column | Type | Notes |
|---|---|---|
| p3f_specialistscomplete | Integer | 0–4, buildplan fires at 4 |
| p3f_buildsuccess | Integer | Successful build agent callbacks |
| p3f_buildfailed | Integer | Failed build agent callbacks |
| p3f_resolutionfeedback | Integer | 1–5 customer rating |
| p3f_pausedon | DateTime | When paused |
| p3f_emergencypath | Boolean | True if hot-patch route used |

### p3f_deployrecord (additions)

| Column | Type | Notes |
|---|---|---|
| p3f_snapshot_pa | URL | SharePoint link to PA flow ZIP snapshot |
| p3f_snapshot_dv | URL | SharePoint link to DV solution XML snapshot |
| p3f_snapshot_codeapp_version | Text 50 | Previous Code App published version ID |
| p3f_snapshot_cs | URL | SharePoint link to CS topic YAML snapshot |
| p3f_targetenv | OptionSet | 1=Dev, 2=UAT, 3=Prod |

---

## Table: p3f_agentprompt

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_agentpromptid | Autonumber | Yes | PK |
| p3f_agentname | Text 100 | Yes | e.g. "intake-agent". One active row per name |
| p3f_version | Integer | Yes | Increment on each change |
| p3f_systemprompt | Multiline Text | Yes | Full system instruction |
| p3f_userprompttemplate | Multiline Text | Yes | Template with {placeholders} |
| p3f_model | Text 50 | Yes | "gpt-4o" or "gpt-4o-mini" |
| p3f_active | Boolean | Yes | Only one true per agentname |
| p3f_notes | Text 500 | No | Change reason |

---

## New columns on p3f_ticket (v5 additions)

| Column | Type | Notes |
|---|---|---|
| p3f_conversationid | Text 500 | Copilot Studio conversation ID — indexed, set on intake |

## New column on p3f_offer (v5 addition)

| Column | Type | Notes |
|---|---|---|
| p3f_clarificationpending | Boolean | True when customer gave ambiguous offer reply |

---

## Table: p3f_agentconversation (insert-only — never update or delete)

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_agentconversationid | Autonumber | Yes | PK |
| p3f_ticketid | Lookup → p3f_ticket | Yes | FK |
| p3f_fromagent | Text 100 | Yes | Sending agent name |
| p3f_toagent | Text 100 | Yes | Receiving agent name |
| p3f_messagetype | OptionSet | Yes | 1=Question, 2=Challenge, 3=Response, 4=Consensus, 5=Escalation |
| p3f_content | Multiline Text | Yes | JSON message content |
| p3f_round | Integer | Yes | Deliberation round number |
| p3f_resolved | Boolean | No | True when exchange reached consensus |
| p3f_createdon | DateTime | Yes | System-set |

---

## New columns — v7 additions

### p3f_ticket
| Column | Type | Notes |
|---|---|---|
| p3f_deliberationpending | Boolean | True when agent is waiting for another agent's response |
| p3f_waitingforagent | Text 100 | Which agent is being waited on |

### p3f_buildplan
| Column | Type | Notes |
|---|---|---|
| p3f_deliberationrounds | Integer | How many rounds of deliberation occurred |
| p3f_consensusreached | Boolean | True if all deliberations converged |
| p3f_estimationdiscrepancy | Integer | Final discrepancy % (0 = perfect consensus) |

### p3f_requirement
| Column | Type | Notes |
|---|---|---|
| p3f_clarifications | Multiline Text | JSON array of clarification addenda from agent deliberation. Original requirement remains immutable. |

---

## Table: p3f_apprequirement

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_apprequirementid | Autonumber | Yes | PK |
| p3f_appid | Lookup → p3f_app | Yes | FK |
| p3f_featuretitle | Text 300 | Yes | One sentence: "Worldmap shows 9 BMW plants" |
| p3f_featuredescription | Multiline Text | No | Optional 2–3 sentence expansion |
| p3f_status | OptionSet | Yes | 1=Active, 2=Superseded, 3=Overridden, 4=Deprecated |
| p3f_sourcetype | OptionSet | Yes | 1=SpecDoc, 2=ResolvedTicket |
| p3f_sourceticketid | Lookup → p3f_ticket | No | Ticket that created/changed this |
| p3f_sourcedocument | Text 500 | No | Doc filename — SpecDoc rows only |
| p3f_version | Integer | Yes | Starts at 1, increments on change |
| p3f_previousversionid | Lookup → self | No | Previous version chain |
| p3f_supersededbyticket | Lookup → p3f_ticket | No | Ticket that changed this |
| p3f_tags | Text 500 | No | JSON domain keywords |
| p3f_createdon | DateTime | Yes | System-set |
| p3f_deprecatedon | DateTime | No | When deprecated |

**Never delete rows. Status changes only. Every change creates a new version.**

