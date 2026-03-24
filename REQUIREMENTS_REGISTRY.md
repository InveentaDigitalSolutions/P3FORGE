# P3 Forge — Requirements Registry v2.0

> Every app connected to P3 Forge has a living record of everything it
> was built to do — at feature level. Simple. Maintainable.
> Agents consult this before every decision.

---

## Design decisions

| Decision | Choice | Reason |
|---|---|---|
| Source | Spec document (Word/PDF) only | Single source at onboarding. Registry grows automatically with each resolved ticket. |
| Granularity | Feature level | One sentence per feature. Easy to maintain, easy for agents to reason about. |
| Warning point | Gate 0 only | After structuring, before customer confirmation. Cleaner UX than mid-intake warning. |
| Growth | Auto-accumulated on resolution | Every closed ticket updates the registry. No manual maintenance. |

---

## Data model — p3f_apprequirement

One row per feature, per app, per version. Simple and flat.

| Column | Type | Required | Notes |
|---|---|---|---|
| p3f_apprequirementid | Autonumber | Yes | PK |
| p3f_appid | Lookup → p3f_app | Yes | FK |
| p3f_featuretitle | Text 300 | Yes | One sentence. "Worldmap shows 9 BMW plants." |
| p3f_featuredescription | Multiline Text | No | Optional 2-3 sentence expansion |
| p3f_status | OptionSet | Yes | 1=Active, 2=Superseded, 3=Overridden, 4=Deprecated |
| p3f_sourcetype | OptionSet | Yes | 1=SpecDoc, 2=ResolvedTicket |
| p3f_sourceticketid | Lookup → p3f_ticket | No | Ticket that last changed this |
| p3f_sourcedocument | Text 500 | No | Doc filename — SpecDoc rows only |
| p3f_version | Integer | Yes | Starts at 1, increments on each update |
| p3f_previousversionid | Lookup → self | No | Previous version chain |
| p3f_supersededbyticket | Lookup → p3f_ticket | No | Which ticket changed this |
| p3f_tags | Text 500 | No | JSON domain keywords e.g. ["worldmap","plants"] |
| p3f_createdon | DateTime | Yes | System-set |
| p3f_deprecatedon | DateTime | No | When deprecated |

**Rule: rows are NEVER deleted. Status changes only.**
**Rule: every change creates a new version linked via p3f_previousversionid.**

### Feature level — what this looks like in practice

Good (one clear sentence per feature):
```
"Worldmap shows all 9 BMW production plants with current quality status"
"Scoring awards −3 points for plant incidents and −1 for clean points"
"Morning Quality Briefing plays a daily audio podcast with KPI updates"
```

Too granular (reject at import):
```
"Given a user on the worldmap, when they tap a plant, then status shows"
```

Too vague (expand at import):
```
"App shows data" → ask GPT-4o to be more specific from context

```

---

## Agent 19 — Requirements Import Agent

**Flow:** `p3f-flow-requirements-import-agent`  
**Trigger:** Manual — P3 manager uploads spec doc during onboarding  
**Input:** Word (.docx) or PDF to SharePoint /P3Forge/Requirements/{client}/{app}/

### GPT-4o prompt

```
System: You extract features from a software spec document.
        Write ONE clear sentence per distinct feature.
        Be specific and concrete. Language: {language}. JSON only.

User: Document: {extracted_text}
      App: {app_name}. Client: {client_name}.

      Return:
      {
        "features": [
          {
            "title": "One sentence describing this feature",
            "description": "2-3 sentence expansion",
            "tags": ["domain", "keywords"],
            "confidence": 0.00-1.00
          }
        ]
      }
```

### After GPT-4o responds

```
For each feature (all confidence levels):
  INSERT p3f_apprequirement:
    status = Active
    sourcetype = SpecDoc
    version = 1
    sourcedocument = filename
    [if confidence < 0.80: append "[Low confidence — please review]" to description]

Teams notification to manager:
  "{N} features imported from {filename}. {M} flagged for review.
   [Review in Config → Apps → Requirements →]"
```

---

## Agent 20 — Requirements Registry Agent

**Flow:** `p3f-flow-registry-agent`  
**Trigger:** After every ticket reaches DEPLOYED — called by deploy-orchestrator  
**Purpose:** Keep the registry current after each resolved ticket

### GPT-4o prompt

```
System: You are updating a software feature registry after a resolved ticket.
        Determine what changed. JSON only.

User: Resolved ticket: {requirement_summary}
      What was built: {plan_summary}
      Current features for {app_name}:
      [{id, title}, ...]

      Return:
      {
        "new_features": [
          { "title": str, "description": str, "tags": [] }
        ],
        "updated_features": [
          { "id": str, "new_title": str, "new_description": str }
        ],
        "deprecated_features": ["id"],
        "unchanged": ["id"]
      }
```

### Apply changes

```
new_features:
  INSERT p3f_apprequirement (status=Active, sourcetype=ResolvedTicket, version=1)

updated_features:
  UPDATE old row: status=Superseded, supersededbyticket=ticketId
  INSERT new row: version=old.version+1, previousversionid=old.id, status=Active

deprecated_features:
  UPDATE row: status=Deprecated, deprecatedon=now, supersededbyticket=ticketId

Store summary in p3f_deployrecord.p3f_requirementschanged: { added, updated, deprecated }
```

---

## Registry check at Gate 0 — `p3f-flow-registry-check`

**Trigger:** Called by requirement-agent BEFORE sending Gate 0 message  
**Timing:** After intake structures the requirement, before customer sees Gate 0

### GPT-4o prompt

```
System: Compare a new requirement against existing app features. JSON only.

User: New requirement: {structured_summary}
      Existing features: [{id, title}, ...]

      Return:
      {
        "already_exists": bool,
        "matching_feature_id": str | null,
        "matching_feature_title": str | null,
        "contradicts": [
          {
            "feature_id": str,
            "feature_title": str,
            "conflict": "one sentence describing the conflict"
          }
        ],
        "is_new": bool
      }
```

Store result in `p3f_ticket.p3f_registryanalysis`.

### Gate 0 message variants

**Normal (no conflict):**
```
Here is what I understood about your request for {app_name}:

📋 {summary}
⏱ Effort estimate: {estimate}

Is this correct? Reply CONFIRMED to proceed, or tell me what to change.
```

**Already exists:**
```
Here is what I understood about your request for {app_name}:

📋 {summary}

ℹ️ This looks like an existing feature:
"{matching_feature_title}"

Is the existing feature not working correctly? Or would you like it to work differently?

Reply:
BROKEN — to report a bug
DIFFERENT — to request a change  
WRONG — if I misunderstood
```

**Contradicts existing feature:**
```
Here is what I understood about your request for {app_name}:

📋 {summary}
⏱ Effort estimate: {estimate}

⚠️ This changes an existing feature:
• "{feature_title}" — {conflict_description}

Is this intentional? Reply CONFIRMED to proceed, or tell me if I've misunderstood.
```

**After customer confirms contradiction:**
```
p3f_ticket.p3f_overridesrequirement = matching_feature_id
p3f_ticket.p3f_intentional_override = true

Registry Agent after deploy:
  → mark old feature as Overridden
  → create new version with note "Customer confirmed change"
```

---

## How existing agents use the registry

### Architect Agent

Before writing its component map, reads all Active features for the app
and includes them as context to GPT-4o:

```
"These are the existing features of {app_name}. Be aware of them
 when designing this change — especially features that may share
 components with what you are planning: {feature_list}"
```

No new deliberation loop needed — just additional context in the prompt.
The Architect is now aware of the whole app, not just the current ticket.

### QA Agent

Reads `p3f_ticket.p3f_registryanalysis`. If `contradicts` was present
and customer confirmed override (`p3f_intentional_override = true`):
  → notes "customer confirmed override of {feature}" in QA report
  → does NOT re-verify old feature criteria (intentional change)

If `is_new = true`:
  → standard QA — only new criteria verified

---

## New flows

```
p3f-flow-requirements-import-agent   Onboarding — parse spec doc → populate registry
p3f-flow-registry-agent              Post-deploy — update registry from resolved ticket
p3f-flow-registry-check              Pre-Gate-0 — check new requirement vs registry
```

---

## New Dataverse columns

### p3f_ticket
| Column | Type | Notes |
|---|---|---|
| p3f_registryanalysis | Multiline Text | JSON from registry-check |
| p3f_overridesrequirement | Lookup → p3f_apprequirement | Customer confirmed override |
| p3f_intentional_override | Boolean | True when customer explicitly confirmed |

### p3f_deployrecord
| Column | Type | Notes |
|---|---|---|
| p3f_requirementschanged | Multiline Text | JSON: {added, updated, deprecated} |

### p3f_app
| Column | Type | Notes |
|---|---|---|
| p3f_requirementsimported | Boolean | True once import agent has run |
| p3f_requirementsdocument | Text 500 | Source doc filename |

---

## Config screen — Requirements tab

```
Config → [Client] → [App] → Requirements

┌───────────────────────────────────────────────────────────┐
│ BMW Race to Quality — Feature Registry                    │
│ 18 active features · Source: BMW_R2Q_Spec_v2.pdf         │
│                                          [Import doc +]   │
├───────────────────────────────────────────────────────────┤
│ ACTIVE (18)                                               │
│  Worldmap shows all 9 BMW plants          v3  T-031       │
│  Worldmap filterable by commodity team    v2  T-012       │
│  Factory team shows blocks and scores     v1  Import      │
│  Scoring: −3 incident, −2 CP plant        v1  Import      │
│  Morning Quality Briefing podcast         v1  Import      │
│                                                           │
│ DEPRECATED (2)                                            │
│  Manual score entry (removed T-019)       v1→Deprecated   │
└───────────────────────────────────────────────────────────┘
```

---

## Onboarding checklist addition

```
□ Upload spec doc to SharePoint /P3Forge/Requirements/{client}/{app}/
□ Trigger import from Config → Apps → [App] → Import Requirements
□ Review extracted features — promote low-confidence ones if correct
□ Mark app as requirements-imported — registry is ready
□ First ticket can now be submitted
```
