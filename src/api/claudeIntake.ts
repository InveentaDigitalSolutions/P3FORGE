import Anthropic from '@anthropic-ai/sdk';

// This module powers the conversational intake agent using Claude directly.
// Supports both Azure-hosted Claude (REACT_APP_AZURE_ANTHROPIC_ENDPOINT) and
// direct Anthropic API as fallback.

const AZURE_ENDPOINT   = process.env.REACT_APP_AZURE_ANTHROPIC_ENDPOINT ?? '';
const AZURE_DEPLOYMENT = process.env.REACT_APP_AZURE_ANTHROPIC_DEPLOYMENT ?? 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are the P3 Forge intake agent — a friendly, professional AI assistant for P3 Cloud Solutions Germany's agentic software delivery platform.

Your job is to have a natural conversation to fully understand a software request, then produce a structured requirement.

THE APP:
P3 FORGE Manager — the management UI for P3 Cloud Solutions Germany's AI-driven delivery platform.
Tech stack: React 18, TypeScript, Fluent UI v9, Microsoft Dataverse, Power Automate, Power Apps Code App.

YOUR PROCESS:
1. Greet the user briefly and ask them to describe their request.
2. Listen carefully. Detect whether it's a Bug or a Change Request from context.
3. Ask clarifying questions ONE AT A TIME until you have everything needed.
   - For a Bug: Title, Steps to Reproduce, Expected Behaviour, Actual Behaviour, Environment/Browser, Severity (blocks all / blocks some / workaround exists / cosmetic).
   - For a Change Request: Role (As a...), Capability (I want...), Business value (So that...), Acceptance Criteria (at least 2 testable scenarios).
4. Once you have everything, present the structured requirement clearly — NOT as raw JSON, but in readable format — and ask:
   "Is this correct? Reply CONFIRMED to proceed, or tell me what needs to change."
5. When the user confirms (says CONFIRMED, yes, correct, or similar), respond with ONLY this JSON block and nothing else:
   REQUIREMENT_CONFIRMED
   \`\`\`json
   {
     "type": "Bug" | "ChangeRequest",
     "title": "...",
     "structured": { ...full structured requirement... },
     "plain_summary": "2–3 sentence plain language summary",
     "effort_hint": "S / M / L / XL"
   }
   \`\`\`

RULES:
- Be concise. No filler phrases like "Great question!" or "Absolutely!".
- Ask ONE question at a time. Never list multiple questions.
- Never invent details about the codebase — only work with what the user tells you.
- If the user is vague, ask for the specific missing piece.
- Respond in the same language the user writes in.`;

export interface IntakeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const GREETING = `Hello! I'm the P3 FORGE intake agent.

Describe what you'd like built or fixed — a bug, a new feature, or a change to how something works. I'll ask a few questions to make sure we capture it correctly.

What would you like to work on?`;

export async function sendIntakeMessage(
  history: IntakeMessage[],
  userMessage: string,
  apiKey: string,
): Promise<string> {
  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  if (AZURE_ENDPOINT) {
    // Azure OpenAI Anthropic endpoint: auth via Authorization: Bearer
    const url = `${AZURE_ENDPOINT.replace(/\/$/, '')}/v1/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AZURE_DEPLOYMENT,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status} ${text}`);
    }
    const data = await res.json();
    const block = data.content?.[0];
    if (!block || block.type !== 'text') throw new Error('Unexpected response from Azure Claude');
    return block.text;
  }

  // Direct Anthropic fallback
  const response = await new Anthropic({ apiKey, dangerouslyAllowBrowser: true }).messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: messages as { role: 'user' | 'assistant'; content: string }[],
  });
  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from intake agent');
  return block.text;
}

export function isRequirementConfirmed(message: string): boolean {
  return message.includes('REQUIREMENT_CONFIRMED');
}

export function extractRequirementJson(message: string): object | null {
  const match = message.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}
