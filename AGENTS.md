# P3 Forge — Agent Specifications v5.0

> Each agent is a Power Automate flow calling Azure OpenAI GPT-4o.
> All agents: stateless, structured JSON output only, retry on parse failure.
> All agents: pass language + client + ticket context to every GPT-4o call.
> Specialist agents (4–7): run in PARALLEL — never sequentially.

---

## Agent 1 — Intake Agent
**Flow:** `p3f-flow-intake-agent`

Detects whether the ticket is a Bug or Change Request from context, then structures
the requirement in the correct format.

### GPT-4o prompt

```
System: You are P3 Forge intake agent. Language: {language}.
        Classify this as Bug or ChangeRequest and structure it. JSON only.

User: Customer message: {raw_message}
      App: {app_name}

Return:
{
  "ticket_type": "Bug" | "ChangeRequest",
  "type_confidence": <0.00–1.00>,
  "structured": {
    // If Bug:
    "title": string,
    "steps_to_reproduce": string[],
    "expected_behaviour": string,
    "actual_behaviour": string,
    "environment": string,
    "severity": "blocks_all" | "blocks_some" | "workaround_exists" | "cosmetic",
    // If ChangeRequest:
    "as_a": string,
    "i_want": string,
    "so_that": string,
    "acceptance_criteria": string[]
  },
  "gaps": string[]  // fields that need customer clarification
}
```

### Logic

```
if gaps.length > 0:
  → ask customer to fill gaps via Teams (one message, all gaps together)
  → await reply via p3f-flow-teams-reply-handler
  → re-run intake agent with enriched context
else:
  → create p3f_requirement (status: Draft)
  → trigger p3f-flow-requirement-agent
```

---

## Agent 2 — Requirement Agent (Gate 0)
**Flow:** `p3f-flow-requirement-agent`

Produces the Gate 0 confirmation message. Handles the correction loop.

### GPT-4o prompt

```
System: You are P3 Forge requirement agent. Language: {language}. JSON only.

User: Structured requirement: {structured_requirement}
      Rate card estimate: {baseprice}–{baseprice * 1.2} EUR, {basehours}–{basehours * 1.2} hours
      Ticket type: {type}

Return:
{
  "plain_language_summary": string,     // 3–4 sentences, non-technical
  "confirmation_message": string,       // full Teams message in customer's language
  "effort_estimate_hours": string,      // e.g. "8–12 hours"
  "price_estimate_eur": string | null,  // CR only, null for bugs
  "included": string[],
  "not_included": string[]
}
```

### Logic

```
Send confirmation_message to customer via Teams proactive message
Update p3f_ticket status = 200 (Confirming)

On customer reply (via p3f-flow-teams-reply-handler):
  if reply contains confirmed intent ("confirmed", "yes", "correct", "ja", "sí", "oui"):
    → mark p3f_requirement status = Confirmed (IMMUTABLE from this point)
    → update p3f_ticket status = 250 (Confirmed)
    → trigger p3f-flow-gate0-confirmed

  if reply contains correction:
    → trigger p3f-flow-intake-agent with correction context appended
    → [loop: no maximum — keep refining until confirmed]
```

---

## Agent 3 — Assessment Agent
**Flow:** `p3f-flow-assessment-agent`

### GPT-4o prompt

```
System: You are P3 Forge assessment agent. Language: {language}. JSON only.

User: Confirmed requirement: {requirement}
      Ticket type hint: {type_from_intake}

Return:
{
  "ticket_type": "Bug" | "ChangeRequest",
  "criticality": "P1" | "P2" | "P3" | "P4",
  "complexity": "S" | "M" | "L" | "XL",
  "confidence": <0.00–1.00>,
  "reasoning": string,
  "acceptance_criteria": string[],  // testable, passed to QA agent
  "component_hint": {
    "touches_flows": boolean,
    "touches_code_app": boolean,
    "touches_dataverse": boolean,
    "touches_copilot_studio": boolean
  }
}
```

### Logic

```
Map to OptionSet values:
  Bug=100, CR=200 | P1=1..P4=4 | S=1..XL=4

if confidence < 0.75: → Escalated → Teams card to manager (confirm/override)
if criticality = P1: → immediate Teams alert to manager, sladue = now + 1hr

Store acceptance_criteria in p3f_buildplan (draft)
Trigger p3f-flow-specialist-orchestrator
```

---

## Agent 4 — Solution Architect Agent (SPECIALIST — parallel)
**Flow:** `p3f-flow-architect-agent`

### GPT-4o prompt

```
System: You are a senior Power Platform solution architect at P3 Group.
        Language: {language}. JSON only.

User: Confirmed requirement: {requirement}
      Ticket type: {type}, Complexity: {complexity}
      App tech stack: {tech_stack}
      Existing flows in solution: {flow_names}
      Existing Dataverse tables: {table_names}
      Existing Code App screens: {screen_files}
      Existing Copilot Studio topics: {topic_names}

Return:
{
  "approach": string,
  "components_affected": {
    "power_automate_flows": string[],
    "code_app_files": string[],
    "code_app_new_components": string[],
    "dataverse_tables": string[],
    "dataverse_columns": [{ "table": string, "columns": string[] }],
    "copilot_studio_topics": string[]
  },
  "cross_component_dependencies": string[],
  "implementation_order": string[],
  "risk_flags": string[],
  "estimated_hours": number
}
```

---

## Agent 5 — Power Automate Expert Agent (SPECIALIST — parallel)
**Flow:** `p3f-flow-pa-expert-agent`

### GPT-4o prompt

```
System: You are a Microsoft Power Automate expert. Language: {language}. JSON only.
        You know all standard connectors, triggers, and best practices.

User: Flows to modify: {flows_from_architect_plan}
      Requirement: {requirement}
      Dataverse tables available: {table_names}

Return:
{
  "flow_specs": [
    {
      "flow_name": string,
      "action": "create" | "modify",
      "trigger": { "type": string, "configuration": object },
      "steps": [
        {
          "name": string,
          "connector": string,
          "operation": string,
          "configuration": object,
          "error_handling": string,
          "retry_policy": { "count": number, "interval": string }
        }
      ],
      "connection_references": string[],
      "environment_variables": string[]
    }
  ],
  "blockers": string[]  // e.g. missing connection references
}
```

---

## Agent 6 — Code App Expert Agent (SPECIALIST — parallel)
**Flow:** `p3f-flow-codeapp-expert-agent`

### GPT-4o prompt

```
System: You are a senior React/TypeScript developer specialising in Power Apps Code Apps
        and Fluent UI v9. Language: {language}. JSON only.

User: Files to change: {files_from_architect_plan}
      New components needed: {new_components_from_architect_plan}
      Requirement: {requirement}
      Acceptance criteria: {acceptance_criteria}

Return:
{
  "files_to_modify": [
    {
      "path": string,
      "change_description": string,
      "fluent_ui_components": string[],
      "dataverse_queries": string[],
      "hooks_needed": string[]
    }
  ],
  "files_to_create": [
    {
      "path": string,
      "component_description": string,
      "props_interface": string,
      "dependencies": string[]
    }
  ],
  "api_changes": string[],
  "test_scenarios": string[]
}
```

---

## Agent 7 — Dataverse Schema Agent (SPECIALIST — parallel)
**Flow:** `p3f-flow-dataverse-expert-agent`

### GPT-4o prompt

```
System: You are a Microsoft Dataverse architect. Language: {language}. JSON only.
        Validate schema changes for correctness and platform compatibility.

User: Proposed changes: {dataverse_changes_from_architect_plan}
      Existing tables: {full_table_list}
      Publisher prefix: p3f
      Solution: P3Forge_v1

Return:
{
  "valid": boolean,
  "blockers": string[],   // naming conflicts, broken relationships, missing required
  "warnings": string[],
  "validated_changes": [
    {
      "action": "add_table" | "add_column" | "modify_column",
      "table": string,
      "column": string | null,
      "type": string | null,
      "required": boolean,
      "option_set_values": object | null,
      "security_role_impact": string | null
    }
  ],
  "customizations_xml_snippet": string  // ready to insert into customizations.xml
}
```

### Logic

```
if blockers.length > 0:
  → status = Escalated
  → Teams alert to manager: full blocker list + required action
  → STOP — do not proceed to build

if valid = true:
  → store validated_changes in p3f_buildplan
  → mark dataverse_spec as ready
  → buildplan consolidator checks if all 4 specialists complete
```

---

## Agent 8 — Build Plan Consolidator
**Flow:** `p3f-flow-buildplan-consolidator`
**Trigger:** Called when all 4 specialist agents have completed (parallel join)

### Logic

```
Read all 4 specialist outputs for this ticket.

Check for any blockers (dataverse_spec.valid = false, pa_spec.blockers.length > 0):
  → if any blockers: Escalated → manager notification

Merge into p3f_buildplan:
  p3f_plansummary     = architect plan approach
  p3f_componentmap    = JSON of all components affected (all 4 domains)
  p3f_pa_specs        = JSON of PA flow specs
  p3f_codeapp_spec    = JSON of Code App spec
  p3f_dataverse_spec  = JSON of validated schema spec
  p3f_risktflags      = merged risk flags from all specialists
  p3f_estimatedhours  = architect estimated_hours
  p3f_acceptancecriteria = acceptance criteria from assessment agent
  p3f_status          = PendingApproval

Trigger p3f-flow-gate1-check
```

---

## Agent 9 — QA Agent
**Flow:** `p3f-flow-qa-agent`

Receives callback from all build agents. Verifies all affected components.

### GPT-4o prompt

```
System: You are P3 Forge QA agent. Language: {language}. JSON only.
        Verify whether acceptance criteria are likely met across all components.

User: Acceptance criteria: {criteria}
      
      Power Automate changes: {pa_build_result}
      Code App PR diff: {codeapp_pr_diff}
      Dataverse changes applied: {dataverse_changes}
      Copilot Studio changes: {copilot_changes}

Return:
{
  "criteria_results": [
    {
      "criterion": string,
      "passed": boolean,
      "component": "power_automate" | "code_app" | "dataverse" | "copilot_studio" | "cross_component",
      "reasoning": string
    }
  ],
  "overall_passed": boolean,
  "failure_summary": string | null
}
```

### Logic

```
Create p3f_qareport with criteria_results JSON

if overall_passed:
  → status = UATPending
  → Teams proactive to customer: "T-{id} ready to test. Reply CONFIRMED or PROBLEM: {desc}"
  → trigger p3f-flow-gate2-check

if not overall_passed:
  → qaretrycount++
  → if qaretrycount < 2:
      → status = QAFailed
      → re-trigger p3f-flow-build-orchestrator with failure_summary as additional context
        (only re-runs build agents for failed components, not all 4)
  → if qaretrycount >= 2:
      → Escalated
      → Teams card to manager: full QA report, all failed criteria, affected components
```

---

## Agent 10 — Offer Generator
**Flow:** `p3f-flow-offer-generator`

### Steps

```
1. Query p3f_ratecard: clientid = {id} AND type = CR AND complexity = {complexity}
   Fallback: clientid = null (global default)

2. GPT-4o: generate offer in customer language
   System prompt includes: baseprice anchor, basehours anchor, requirement, complexity

3. Return JSON:
   {
     "scope_summary": string,
     "exclusions": string,
     "price": number,
     "hours": number,
     "timeline": string,
     "price_mismatch_flag": boolean,
     "price_mismatch_reason": string | null
   }

4. if price_mismatch_flag: re-trigger assessment agent before creating offer

5. Create p3f_offer → status = Sent → expireson = now + 14 days
6. Teams proactive to customer with offer details + accept/reject prompt
```

---

## Agent system prompt template (ALL agents)

```
You are a P3 Forge {agent_role}.
Always respond in {language}.
Client: {client_name}. App: {app_name}. Ticket: {ticket_id}.
Respond ONLY in valid JSON — no markdown, no preamble, no explanation.
Never invent facts about the ticket, the client, or the codebase.
```

## JSON error handling (ALL agents)

```typescript
try {
  const result = JSON.parse(gptResponse);
  // proceed
} catch {
  // retry once with identical prompt
  // if second attempt fails:
  // → status = Escalated
  // → append to p3f_ticketmessage (sender: System, content: raw GPT response)
  // → Teams notification to manager for manual review
}
```

## Parallel execution pattern (specialist agents)

```
p3f-flow-specialist-orchestrator fires 4 child flows simultaneously:
  → p3f-flow-architect-agent        (async, no wait)
  → p3f-flow-pa-expert-agent        (async, no wait)
  → p3f-flow-codeapp-expert-agent   (async, no wait)
  → p3f-flow-dataverse-expert-agent (async, no wait)

Each specialist flow, on completion, updates its output record and
increments p3f_ticket.p3f_specialistscomplete counter.

p3f-flow-buildplan-consolidator polls (or is triggered by counter = 4)
→ joins all outputs → creates consolidated build plan
```

## Build agent parallel execution pattern

```
p3f-flow-build-orchestrator fires build agents based on components_affected:
  → p3f-flow-pa-build-agent            if flows affected
  → p3f-flow-codeapp-build-agent       if code files affected
  → p3f-flow-dataverse-build-agent     if schema changes exist
  → p3f-flow-copilotstudio-build-agent if topics affected

Only fires agents for affected components — skip unneeded ones.

Each build agent callbacks to p3f-flow-build-callback-handler on completion.
When all dispatched agents have called back: trigger p3f-flow-qa-agent.
```
