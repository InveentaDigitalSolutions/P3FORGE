# P3 Forge — Copilot Studio Agent Specification v1.0

> Build guide for the P3 Forge Teams Agent.
> Every topic: trigger phrases, variables, conditions, message templates, HTTP actions.
> Agent name in Copilot Studio: "P3 Forge"
> Teams channel: P3 Forge (published to P3 tenant Teams)

---

## Agent settings

| Setting | Value |
|---|---|
| Agent name | P3 Forge |
| Display name in Teams | P3 Forge |
| Language | Auto-detect (multilingual enabled) |
| Authentication | Azure AD — SSO with Teams identity |
| Fallback topic | Escalate to P3 manager |
| Error message | "Something went wrong on my end. I've notified the P3 team." |

---

## How user identification works

The agent identifies context from the **Azure AD identity of the Teams user**:

```
User opens Teams → messages P3 Forge agent
↓
Agent reads: System.User.Id (Azure AD object ID from Teams SSO)
↓
Flow p3f-flow-resolve-user-context:
  Query p3f_client where p3f_teamstenantid = user's tenant ID
  Query p3f_app where clientid = above (active apps only)
↓
Agent has: client name, client ID, list of active apps
↓
If no match found: agent replies "I don't recognise your account yet.
  Please contact your P3 representative to get connected."
```

This means:
- The user **never types their company name** — it's resolved from their identity
- The agent **only shows apps that belong to their client** — no cross-client leakage
- A P3 internal user (Santi testing) resolves to "P3 Internal" automatically

### New flow required: p3f-flow-resolve-user-context

```
Input:  teamsUserId (string), teamsTenantId (string)
Output: clientId, clientName, clientLanguage, apps: [{appId, appName}]

Steps:
1. Query p3f_client:
   $filter=p3f_teamstenantid eq '{teamsTenantId}' and p3f_active eq true
   → if 0 results: return { found: false }
   → if 1 result: proceed

2. Query p3f_app:
   $filter=_p3f_projectid_value/p3f_clientid eq '{clientId}'
   → returns list of active apps with appId and appName

3. Return:
   {
     found: true,
     clientId: string,
     clientName: string,
     defaultLanguage: string,
     apps: [{ appId: string, appName: string }]
   }
```

**For Santi testing (P3 Internal):** Set `p3f_client.p3f_teamstenantid` to your
Azure AD tenant ID. Your account resolves to P3 Internal automatically.

---

## Conversation variables (set at start of every conversation)

| Variable | Type | Set by | Used by |
|---|---|---|---|
| `var_clientId` | String | resolve-user-context | All topics |
| `var_clientName` | String | resolve-user-context | All message templates |
| `var_clientLanguage` | String | resolve-user-context | Language detection fallback |
| `var_apps` | Table | resolve-user-context | App choice card in Topic 1 |
| `var_language` | String | Language detection | All agent messages |
| `var_ticketId` | String | Topic 1 on ticket creation | Topics 2–5 |
| `var_appId` | String | Topic 1 app selection | intake flow payload |
| `var_appName` | String | Topic 1 app selection | Confirmation message |
| `var_urgency` | String | Topic 1 urgency check | intake flow payload |
| `var_activeTicketId` | String | Reply handler lookup | Topics 2–5 |

---

## Topic 1 — New ticket (DEFAULT TOPIC)

**Triggers:** Any message that doesn't match Topics 2–5.
This is the fallback — catches all unrecognised input.

### Step-by-step build in Copilot Studio

**Node 1: Identify user context**
```
Action: Call p3f-flow-resolve-user-context
Input:  System.User.Id, System.User.TenantId
Output: Set var_clientId, var_clientName, var_clientLanguage, var_apps

Condition: if var_clientId is empty
  → Message: "I don't recognise your account yet. Please contact your
              P3 representative to get connected to P3 Forge."
  → End conversation
```

**Node 2: Detect language**
```
Action: Set var_language
Logic:  Use Copilot Studio built-in language detection on the opening message
        Fallback: var_clientLanguage (from client record)
```

**Node 3: Show app selector**

Only shown if client has more than 1 active app.
If client has exactly 1 app → skip to Node 4, auto-set var_appId and var_appName.

```
Message (in var_language):
  EN: "Hi {var_clientName}! Which solution are you contacting us about?"
  DE: "Hallo {var_clientName}! Um welche Lösung geht es?"
  ES: "¡Hola {var_clientName}! ¿Sobre qué solución nos contactas?"

Card type: Adaptive card with buttons
Buttons: one per app in var_apps
  [{appName: "Race to Quality"}, {appName: "QBR Rating App"}, ...]
  + "Other / not sure"

On selection: set var_appId, var_appName
On "Other": set var_appName = "Unknown", var_appId = ""
             → intake flow handles it, architect agent will ask for clarification
```

**Node 4: Capture issue description**
```
Message (in var_language):
  EN: "Got it — {var_appName}. What's happening? Describe it in as much
      detail as you can — the more you tell me, the faster we can help."
  DE: "Verstanden — {var_appName}. Was ist das Problem? Beschreibe es
      so genau wie möglich."
  ES: "Entendido — {var_appName}. ¿Qué está pasando? Descríbelo con
      el mayor detalle posible."

Input: Free text
Set: var_description = user input
Validation: if length < 10 characters
  → "Could you give me a bit more detail? Even a few more words help."
Max length: 4000 characters (trim silently if exceeded, note in var_truncated)
```

**Node 5: Urgency detection**
```
Logic (run on var_description, no user interaction):
  Check for urgency keywords:
    EN: "urgent", "broken", "down", "not working", "production", "critical", "asap", "emergency"
    DE: "dringend", "kaputt", "nicht funktioniert", "Produktion", "kritisch", "sofort"
    ES: "urgente", "roto", "no funciona", "producción", "crítico", "emergencia"

  if any keyword found: set var_urgency = "P1_HINT"
  else: set var_urgency = "NORMAL"
```

**Node 6: Confirm understanding**
```
Message (in var_language):
  EN: "Here's what I understood:
       Company: {var_clientName}
       Solution: {var_appName}
       Issue: {var_description}

       Is that right? I'll create your ticket now."
  DE: "Das habe ich verstanden:
       Unternehmen: {var_clientName}
       Lösung: {var_appName}
       Problem: {var_description}

       Stimmt das so? Ich erstelle jetzt dein Ticket."
  ES: "Esto es lo que entendí:
       Empresa: {var_clientName}
       Solución: {var_appName}
       Problema: {var_description}

       ¿Es correcto? Crearé tu ticket ahora."

Note: No yes/no button here — agent proceeds immediately.
The real confirmation happens at Gate 0 (sent by requirement agent after structuring).
This is just a courtesy summary before the API call.
```

**Node 7: Create ticket**
```
Action: Call p3f-flow-teams-intake (HTTP POST)
Payload:
  {
    "teamsUserId": System.User.Id,
    "teamsConversationId": System.Conversation.Id,
    "clientId": var_clientId,
    "appId": var_appId,
    "appName": var_appName,
    "description": var_description,
    "urgencyHint": var_urgency,
    "language": var_language,
    "rawMessage": Activity.Text
  }

Response: { "ticketId": "T-0042", "displayId": "T-0042" }
Set: var_ticketId = response.ticketId
```

**Node 8: Acknowledge**
```
Message (in var_language):
  EN: "Done! Ticket {var_ticketId} has been created for {var_appName}.
      Our team is already reviewing it. I'll send you updates right here
      as things progress. You can ask me for a status update any time."
  DE: "Erledigt! Ticket {var_ticketId} wurde für {var_appName} erstellt.
      Unser Team prüft es bereits. Ich informiere dich hier über den Fortschritt."
  ES: "¡Listo! El ticket {var_ticketId} ha sido creado para {var_appName}.
      Nuestro equipo ya lo está revisando. Te mantendré informado aquí."
```

---

## Topic 2 — Status check

**Trigger phrases:**
```
EN: "status", "update", "where is my ticket", "any news", "what's happening",
    "T-[0-9]+", "ticket [0-9]+"
DE: "Status", "Neuigkeiten", "wo ist mein Ticket", "was ist der Stand", "T-[0-9]+"
ES: "estado", "actualización", "dónde está mi ticket", "T-[0-9]+"
```

**Trigger pattern (regex entity):** `T-\d{4}` → extracts ticket ID if present

### Build steps

**Node 1: Identify user + resolve ticket**
```
Action: Call p3f-flow-resolve-user-context (same as Topic 1)
Then: Call p3f-flow-get-ticket-status
  Input: { clientId: var_clientId, conversationId: System.Conversation.Id,
           ticketIdHint: extracted entity or null }
  Output: { found: bool, ticketId, title, status, statusLabel, lastAgentAction,
            estimatedCompletion }

if found = false:
  → Message: "I couldn't find an open ticket for your account.
              Would you like to report something new?"
  → End or redirect to Topic 1
```

**Node 2: Status response**
```
Message (in var_language):
  EN: "Your ticket {ticketId} — {title}
       Status: {statusLabel}
       Last update: {lastAgentAction}
       {if estimatedCompletion} Expected: {estimatedCompletion}{/if}

       Need anything else?"
  DE: "Dein Ticket {ticketId} — {title}
       Status: {statusLabel}
       Letzte Aktualisierung: {lastAgentAction}"
  ES: "Tu ticket {ticketId} — {title}
       Estado: {statusLabel}
       Última actualización: {lastAgentAction}"
```

**Status labels (localised):**
```
EN: Submitted→"Received", Confirming→"Reviewing your description",
    Assessed→"Being analysed", InDevelopment→"Being built",
    QAReview→"In quality check", UATPending→"Ready for you to test",
    Deployed→"Deployed ✓", Closed→"Closed ✓"
DE: Submitted→"Eingegangen", Confirming→"Wird geprüft", ...
ES: Submitted→"Recibido", Confirming→"Revisando tu descripción", ...
```

---

## Topic 3 — Gate 0 confirmation response

**Trigger:** Proactive message sent by `p3f-flow-requirement-agent`
This topic handles the customer's CONFIRMED / CORRECTION reply.

**This topic is triggered BY the agent, not by the user.**
The requirement agent sends a proactive message. When the user replies, the
reply-handler flow detects `status = CONFIRMING` and routes to this topic.

### Build steps

**Node 1: Detect intent**
```
User reply is free text. Classify:

CONFIRM signals:
  EN: "confirmed", "correct", "yes", "that's right", "looks good", "proceed", "ok"
  DE: "bestätigt", "korrekt", "ja", "stimmt", "gut", "weiter"
  ES: "confirmado", "correcto", "sí", "está bien", "procede"

CORRECTION signals: anything else — treat as correction

if CONFIRM:
  → Call p3f-flow-gate0-confirmed
    Input: { ticketId: var_activeTicketId, confirmed: true }
  → Message:
    EN: "Great! We're now analysing your request. I'll update you shortly."
    DE: "Sehr gut! Wir analysieren deinen Auftrag. Ich melde mich bald."
    ES: "¡Perfecto! Estamos analizando tu solicitud. Te actualizo pronto."

if CORRECTION:
  → Call p3f-flow-gate0-confirmed
    Input: { ticketId: var_activeTicketId, confirmed: false, correction: userReply }
  → Message:
    EN: "Got it — let me update the description. Give me a moment."
    DE: "Verstanden — ich aktualisiere die Beschreibung. Einen Moment."
    ES: "Entendido — actualizaré la descripción. Un momento."
```

---

## Topic 4 — Offer response (CR only)

**Trigger:** Proactive message sent by `p3f-flow-offer-generator`
User sees the scope + price and replies.

### Build steps

**Node 1: Detect intent**
```
ACCEPT:
  EN: "accept", "yes", "agreed", "let's go", "proceed", "ok", "deal", "approved"
  DE: "akzeptiert", "ja", "einverstanden", "machen wir", "ok"
  ES: "aceptado", "sí", "de acuerdo", "adelante", "ok"

REJECT:
  EN: "no", "reject", "too expensive", "not what I wanted", "cancel", "decline"
  DE: "nein", "ablehnen", "zu teuer", "nicht was ich wollte"
  ES: "no", "rechazar", "muy caro", "no es lo que quería"

AMBIGUOUS: anything else

if ACCEPT:
  → Call p3f-flow-offer-reply-handler { decision: "accepted" }
  → Message:
    EN: "Excellent! We'll begin working on this. I'll let you know when it's ready."
    DE: "Ausgezeichnet! Wir beginnen mit der Arbeit. Ich melde mich, wenn es fertig ist."
    ES: "¡Excelente! Comenzaremos a trabajar. Te aviso cuando esté listo."

if REJECT:
  → Call p3f-flow-offer-reply-handler { decision: "rejected", comment: userReply }
  → Message:
    EN: "Understood. I'll pass your feedback on and we'll revise the proposal."
    DE: "Verstanden. Ich leite dein Feedback weiter und überarbeiten das Angebot."
    ES: "Entendido. Pasaré tu comentario y revisaremos la propuesta."

if AMBIGUOUS:
  → Message:
    EN: "I want to make sure I understand — would you like to accept this
        proposal and proceed, or would you prefer to discuss it further?"
    DE: "Ich möchte sicherstellen, dass ich dich richtig verstehe — möchtest
        du das Angebot annehmen oder lieber noch besprechen?"
    ES: "Quiero asegurarme — ¿deseas aceptar esta propuesta y proceder,
        o prefieres discutirla más?"
  → Set var_offerClarificationPending = true
  → On next reply: if still ambiguous → escalate to manager
```

---

## Topic 5 — UAT confirmation

**Trigger:** Proactive message sent by `p3f-flow-qa-agent`
User has been asked to test in the environment and confirm.

### Build steps

**Node 1: Detect intent**
```
PASS:
  EN: "confirmed", "works", "looks good", "all good", "tested", "approved", "done"
  DE: "bestätigt", "funktioniert", "sieht gut aus", "getestet", "erledigt"
  ES: "confirmado", "funciona", "se ve bien", "probado", "listo"

FAIL:
  EN: "problem", "issue", "not working", "broken", "still", "doesn't work", "failed"
  DE: "Problem", "funktioniert nicht", "kaputt", "immer noch", "fehlgeschlagen"
  ES: "problema", "no funciona", "roto", "todavía", "falló"

if PASS:
  → Call p3f-flow-gate2-check { ticketId, uatResult: "passed" }
  → Message:
    EN: "Confirmed! We're deploying to production now. I'll let you know when it's live."
    DE: "Bestätigt! Wir deployen jetzt in die Produktion. Ich melde mich, wenn es live ist."
    ES: "¡Confirmado! Estamos desplegando a producción. Te aviso cuando esté en vivo."

if FAIL:
  → Prompt: "I'm sorry to hear that. Can you describe what's not working?"
  → User provides description
  → Call p3f-flow-gate2-check { ticketId, uatResult: "failed", failureDescription }
  → Message:
    EN: "Got it. I've logged the issue and our team will investigate. I'll update you shortly."
    DE: "Verstanden. Ich habe das Problem protokolliert. Unser Team wird es untersuchen."
    ES: "Entendido. He registrado el problema. Nuestro equipo lo investigará."
```

---

## Topic 6 — Cancel or pause

**Trigger phrases:**
```
EN: "cancel", "stop", "pause", "put on hold", "no longer needed", "forget it"
DE: "abbrechen", "stoppen", "pausieren", "nicht mehr nötig", "vergiss es"
ES: "cancelar", "detener", "pausar", "ya no es necesario", "olvídalo"
```

### Build steps

**Node 1: Clarify intent**
```
Message:
  EN: "Do you want to cancel ticket {var_activeTicketId} completely,
      or just pause it for now?"
  DE: "Möchtest du Ticket {var_activeTicketId} komplett abbrechen
      oder nur pausieren?"
  ES: "¿Quieres cancelar el ticket {var_activeTicketId} completamente
      o solo pausarlo por ahora?"

Buttons: [Cancel it] [Pause it] [Never mind]
```

**Node 2: Execute**
```
if Cancel:
  → Call p3f-flow-cancel-handler { ticketId }
  → Response A (cancellable): "Done. Ticket cancelled. Let me know if you need anything else."
  → Response B (in-flight): "Your ticket is currently being built. I've notified the P3 team.
     They'll be in touch shortly about your options."

if Pause:
  → Call p3f-flow-pause-handler { ticketId }
  → Message: "Ticket paused. Reply RESUME any time to continue where we left off."

if Never mind:
  → Message: "No problem — your ticket continues as normal."
  → End topic
```

---

## Topic 7 — Resume paused ticket

**Trigger phrases:**
```
EN: "resume", "continue", "unpause", "start again", "carry on"
DE: "fortsetzen", "weitermachen", "weitergehen"
ES: "reanudar", "continuar", "seguir"
```

```
Action: Call p3f-flow-resume-handler { ticketId: var_activeTicketId }
Message:
  EN: "Ticket {var_activeTicketId} is back in progress. I'll keep you updated."
  DE: "Ticket {var_activeTicketId} ist wieder in Bearbeitung. Ich halte dich auf dem Laufenden."
  ES: "El ticket {var_activeTicketId} ha retomado el proceso. Te mantendré informado."
```

---

## Proactive messages (sent BY the agent TO the user)

These are sent by Power Automate flows, not by topic triggers.
Each uses the Teams connector "Post message in a chat or channel" action.

### Gate 0 — requirement confirmation

```
Flow: p3f-flow-requirement-agent
Recipient: ticket.p3f_submittedby (Teams user ID)
Conversation: ticket.p3f_conversationid

Message template (EN):
"Here's what I understood from your request about **{appName}**:

📋 **{Bug Report | User Story title}**

{structured requirement text}

⏱ **Effort estimate:** {effortEstimate}
{💰 **Price estimate:** {priceEstimate} (CR only)}

Is this correct? Reply **CONFIRMED** to proceed, or tell me what to change."
```

### Manager notification — ticket confirmed

```
Flow: p3f-flow-gate0-confirmed
Recipient: client.managedby (P3 manager Teams user ID)
Card type: Adaptive card

Fields:
  Title: "📋 New ticket confirmed — {ticketId}"
  Company: {clientName}
  Solution: {appName}
  Type: {Bug | Change Request}
  Summary: {plainLanguageSummary}
  Effort: {effortEstimate}
  Button: "View ticket →" (deep link to Code App)
  Note: "No action needed — pipeline running."
```

### Offer sent — CR

```
Flow: p3f-flow-offer-generator
Recipient: ticket.p3f_submittedby

Message (EN):
"Your change request for **{appName}** has been reviewed. Here's our proposal:

📝 **What's included:** {scopeSummary}
❌ **Not included:** {exclusions}
💶 **Price:** €{price}
⏱ **Timeline:** {timeline}

Reply **ACCEPT** to proceed, or tell me what you'd like to change."
```

### UAT ready

```
Flow: p3f-flow-qa-agent (on pass)
Recipient: ticket.p3f_submittedby

Message (EN):
"Your ticket {ticketId} is ready to test! 🎉

Please test the change in {appName} and let me know:
- Reply **CONFIRMED** if everything looks good
- Reply **PROBLEM:** followed by what's not working

Take your time — I'll follow up in 5 days if I don't hear from you."
```

### Resolution

```
Flow: p3f-flow-deploy-orchestrator
Recipient: ticket.p3f_submittedby

Message (EN):
"✅ Done! Your ticket {ticketId} has been deployed to {appName}.

The change is now live. Let me know if you notice anything unexpected.

*(In 48 hours I'll ask for a quick rating — it helps us improve.)*"
```

---

## New flow required: p3f-flow-resolve-user-context

Add this to the master flow list in copilot-instructions.md and SPEC.md.

```
Trigger: HTTP POST (called by Teams Agent at start of every topic)
Input:
  {
    "teamsUserId": string,
    "teamsTenantId": string
  }
Output:
  {
    "found": boolean,
    "clientId": string | null,
    "clientName": string | null,
    "defaultLanguage": string | null,
    "apps": [{ "appId": string, "appName": string }]
  }

Steps:
1. Query p3f_client:
   $filter=p3f_teamstenantid eq '{teamsTenantId}' and p3f_active eq true

2. If no client found: return { found: false }

3. Query p3f_app joined through p3f_project:
   Get all active apps for this client

4. Return full context object
```

---

## p3f_client — new column required

```
p3f_teamstenantid   Text 100   Azure AD tenant ID of the client's Microsoft tenant.
                               Set during onboarding.
                               For P3 internal use: set to P3's own tenant ID.
                               Used by resolve-user-context to identify who is talking.
```

This column is already in DATAVERSE.md — confirming it is populated during onboarding.

---

## Build checklist for first VS Code session

```
□ 1. Dataverse: p3f_client + p3f_ticket + p3f_app tables created
□ 2. Seed: p3f_client row — "P3 Internal", teamstenantid = your Azure AD tenant ID
□ 3. Seed: p3f_app row — "P3 Forge Manager App", linked to P3 Internal
□ 4. Power Automate: p3f-flow-resolve-user-context (real — needed from minute one)
□ 5. Power Automate: p3f-flow-teams-intake (stub — creates ticket, returns ID)
□ 6. Copilot Studio: create new agent "P3 Forge"
□ 7. Copilot Studio: enable multilingual + Azure AD auth
□ 8. Copilot Studio: Topic 1 — New ticket (full flow above)
□ 9. Copilot Studio: Topic 2 — Status check (real DV query)
□ 10. Copilot Studio: publish to Teams
□ 11. Test: message the agent as Santi → creates T-0001 for P3 Forge Manager App
```

Once step 11 works, the foundation is solid. Every other topic and flow plugs into this.
```
