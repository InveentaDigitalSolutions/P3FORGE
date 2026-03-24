// P3 Forge — Power Automate trigger API
// All AI calls go through Power Automate — never call Azure OpenAI from the Code App.

const PA_BASE_URL = process.env.REACT_APP_PA_BASE_URL ?? '';

async function triggerFlow(flowName: string, payload: Record<string, unknown>): Promise<unknown> {
  const url = `${PA_BASE_URL}/${flowName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Flow ${flowName} failed (${res.status}): ${body}`);
  }
  if (res.status === 202) return { accepted: true };
  return res.json();
}

export async function triggerGate1Approve(ticketId: string, buildPlanId: string): Promise<void> {
  await triggerFlow('p3f-flow-gate1-check', {
    ticketId,
    buildPlanId,
    action: 'approve',
  });
}

export async function triggerGate1Reject(ticketId: string, buildPlanId: string, reason: string): Promise<void> {
  await triggerFlow('p3f-flow-gate1-check', {
    ticketId,
    buildPlanId,
    action: 'reject',
    reason,
  });
}

export async function triggerGate2Approve(ticketId: string): Promise<void> {
  await triggerFlow('p3f-flow-gate2-check', {
    ticketId,
    action: 'approve',
  });
}

export async function triggerGate2Reject(ticketId: string, reason: string): Promise<void> {
  await triggerFlow('p3f-flow-gate2-check', {
    ticketId,
    action: 'reject',
    reason,
  });
}

export async function triggerRollback(ticketId: string, reason: string): Promise<void> {
  await triggerFlow('p3f-flow-rollback-orchestrator', {
    ticketId,
    reason,
  });
}

export async function triggerDeploy(ticketId: string, targetEnvUrl: string): Promise<void> {
  await triggerFlow('p3f-flow-deploy-orchestrator', {
    ticketId,
    targetEnvUrl,
  });
}
