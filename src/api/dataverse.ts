// P3 Forge — Dataverse Web API Client
// All queries MUST filter by p3f_clientid. No exceptions.
// Never hardcode PP_ENV_URL — read from p3f_client.p3f_envurl or env var.

import type {
  DataverseResponse,
  P3FTicket,
  P3FClient,
  P3FApp,
  P3FRequirement,
  P3FBuildPlan,
  P3FQAReport,
  P3FOffer,
  P3FDeployRecord,
  P3FTicketMessage,
  P3FArchitectPlan,
  P3FTrustHistory,
  P3FRetryQueue,
  P3FAppRequirement,
  P3FBillingRecord,
  P3FAgentConversation,
  StatusCode,
} from './types';

const API_VERSION = 'v9.2';

function getBaseUrl(): string {
  const envUrl = ((window as unknown) as Record<string, unknown>).__PP_ENV_URL__ as string | undefined
    ?? process.env.REACT_APP_PP_ENV_URL;
  if (!envUrl) throw new Error('PP_ENV_URL not configured');
  return `${envUrl.replace(/\/$/, '')}/api/data/${API_VERSION}`;
}

async function dvFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Dataverse ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// Token retrieval — injected by MSAL provider
let tokenFn: (() => Promise<string>) | null = null;

export function setTokenProvider(fn: () => Promise<string>): void {
  tokenFn = fn;
}

async function getAccessToken(): Promise<string> {
  if (!tokenFn) throw new Error('Token provider not set. Call setTokenProvider first.');
  return tokenFn();
}

// ─── Client queries ─────────────────────────────────────────────

export async function getClients(): Promise<P3FClient[]> {
  const res = await dvFetch<DataverseResponse<P3FClient>>(
    `/p3f_clients?$filter=p3f_active eq true&$orderby=p3f_name asc`
  );
  return res.value;
}

export async function getClient(clientId: string): Promise<P3FClient> {
  return dvFetch<P3FClient>(`/p3f_clients(${clientId})`);
}

export async function updateClient(clientId: string, data: Partial<P3FClient>): Promise<void> {
  await dvFetch(`/p3f_clients(${clientId})`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ─── Ticket queries ─────────────────────────────────────────────

export async function getTicketsByClient(clientId: string): Promise<P3FTicket[]> {
  const res = await dvFetch<DataverseResponse<P3FTicket>>(
    `/p3f_tickets?$filter=_p3f_clientid_value eq ${clientId} and p3f_status ne 850` +
    `&$orderby=p3f_criticality asc,p3f_sladue asc`
  );
  return res.value;
}

export async function getAllActiveTickets(): Promise<P3FTicket[]> {
  const res = await dvFetch<DataverseResponse<P3FTicket>>(
    `/p3f_tickets?$filter=p3f_status ne 850 and p3f_status ne 999` +
    `&$expand=p3f_clientid($select=p3f_name,p3f_autonomytier)` +
    `&$orderby=p3f_criticality asc,p3f_sladue asc`
  );
  return res.value;
}

export async function getTicket(ticketId: string): Promise<P3FTicket> {
  return dvFetch<P3FTicket>(`/p3f_tickets(${ticketId})`);
}

export async function updateTicket(ticketId: string, data: Partial<P3FTicket>): Promise<void> {
  await dvFetch(`/p3f_tickets(${ticketId})`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getGate1Tickets(): Promise<P3FTicket[]> {
  const res = await dvFetch<DataverseResponse<P3FTicket>>(
    `/p3f_tickets?$filter=p3f_status eq 500 and p3f_gate1required eq true` +
    `&$expand=p3f_clientid($select=p3f_name,p3f_autonomytier)` +
    `&$orderby=p3f_sladue asc`
  );
  return res.value;
}

export async function getGate2Tickets(): Promise<P3FTicket[]> {
  const res = await dvFetch<DataverseResponse<P3FTicket>>(
    `/p3f_tickets?$filter=p3f_status eq 750 and p3f_gate2required eq true` +
    `&$expand=p3f_clientid($select=p3f_name,p3f_autonomytier)` +
    `&$orderby=p3f_sladue asc`
  );
  return res.value;
}

export async function getEscalatedTickets(): Promise<P3FTicket[]> {
  const res = await dvFetch<DataverseResponse<P3FTicket>>(
    `/p3f_tickets?$filter=p3f_status eq 900` +
    `&$expand=p3f_clientid($select=p3f_name,p3f_autonomytier)` +
    `&$orderby=p3f_sladue asc`
  );
  return res.value;
}

// ─── Ticket messages ────────────────────────────────────────────

export async function getTicketMessages(ticketId: string): Promise<P3FTicketMessage[]> {
  const res = await dvFetch<DataverseResponse<P3FTicketMessage>>(
    `/p3f_ticketmessages?$filter=_p3f_ticketid_value eq ${ticketId}` +
    `&$orderby=p3f_createdon asc`
  );
  return res.value;
}

// ─── Requirement queries ────────────────────────────────────────

export async function getConfirmedRequirement(ticketId: string): Promise<P3FRequirement | null> {
  const res = await dvFetch<DataverseResponse<P3FRequirement>>(
    `/p3f_requirements?$filter=_p3f_ticketid_value eq ${ticketId} and p3f_status eq 3`
  );
  return res.value[0] ?? null;
}

// ─── Architect plan ─────────────────────────────────────────────

export async function getArchitectPlan(ticketId: string): Promise<P3FArchitectPlan | null> {
  const res = await dvFetch<DataverseResponse<P3FArchitectPlan>>(
    `/p3f_architectplans?$filter=_p3f_ticketid_value eq ${ticketId}`
  );
  return res.value[0] ?? null;
}

// ─── Build plan ─────────────────────────────────────────────────

export async function getBuildPlan(ticketId: string): Promise<P3FBuildPlan | null> {
  const res = await dvFetch<DataverseResponse<P3FBuildPlan>>(
    `/p3f_buildplans?$filter=_p3f_ticketid_value eq ${ticketId}`
  );
  return res.value[0] ?? null;
}

export async function approveBuildPlan(buildPlanId: string, approverUserId: string): Promise<void> {
  await dvFetch(`/p3f_buildplans(${buildPlanId})`, {
    method: 'PATCH',
    body: JSON.stringify({
      p3f_status: 3,
      'p3f_approvedby@odata.bind': `/systemusers(${approverUserId})`,
      p3f_approvedon: new Date().toISOString(),
    }),
  });
}

export async function rejectBuildPlan(buildPlanId: string): Promise<void> {
  await dvFetch(`/p3f_buildplans(${buildPlanId})`, {
    method: 'PATCH',
    body: JSON.stringify({ p3f_status: 4 }),
  });
}

// ─── QA report ──────────────────────────────────────────────────

export async function getQAReport(ticketId: string): Promise<P3FQAReport | null> {
  const res = await dvFetch<DataverseResponse<P3FQAReport>>(
    `/p3f_qareports?$filter=_p3f_ticketid_value eq ${ticketId}&$orderby=p3f_createdon desc&$top=1`
  );
  return res.value[0] ?? null;
}

// ─── Offer ──────────────────────────────────────────────────────

export async function getOffer(ticketId: string): Promise<P3FOffer | null> {
  const res = await dvFetch<DataverseResponse<P3FOffer>>(
    `/p3f_offers?$filter=_p3f_ticketid_value eq ${ticketId}&$orderby=p3f_revision desc&$top=1`
  );
  return res.value[0] ?? null;
}

// ─── Deploy records ─────────────────────────────────────────────

export async function getDeployRecords(ticketId: string): Promise<P3FDeployRecord[]> {
  const res = await dvFetch<DataverseResponse<P3FDeployRecord>>(
    `/p3f_deployrecords?$filter=_p3f_ticketid_value eq ${ticketId}&$orderby=p3f_deployedon desc`
  );
  return res.value;
}

// ─── Trust history ──────────────────────────────────────────────

export async function getTrustHistory(clientId: string): Promise<P3FTrustHistory[]> {
  const res = await dvFetch<DataverseResponse<P3FTrustHistory>>(
    `/p3f_trusthistorys?$filter=_p3f_clientid_value eq ${clientId}&$orderby=p3f_createdon desc`
  );
  return res.value;
}

// ─── Retry queue ────────────────────────────────────────────────

export async function getRetryQueue(): Promise<P3FRetryQueue[]> {
  const res = await dvFetch<DataverseResponse<P3FRetryQueue>>(
    `/p3f_retryqueues?$filter=p3f_status eq 1 or p3f_status eq 2&$orderby=p3f_nextretry asc`
  );
  return res.value;
}

// ─── Agent conversations ────────────────────────────────────────

export async function getAgentConversations(ticketId: string): Promise<P3FAgentConversation[]> {
  const res = await dvFetch<DataverseResponse<P3FAgentConversation>>(
    `/p3f_agentconversations?$filter=_p3f_ticketid_value eq ${ticketId}&$orderby=p3f_createdon asc`
  );
  return res.value;
}

// ─── App requirements (registry) ────────────────────────────────

export async function getAppRequirements(appId: string): Promise<P3FAppRequirement[]> {
  const res = await dvFetch<DataverseResponse<P3FAppRequirement>>(
    `/p3f_apprequirements?$filter=_p3f_appid_value eq ${appId} and p3f_status eq 1` +
    `&$orderby=p3f_createdon desc`
  );
  return res.value;
}

// ─── Billing records ────────────────────────────────────────────

export async function getBillingByClient(clientId: string): Promise<P3FBillingRecord[]> {
  const res = await dvFetch<DataverseResponse<P3FBillingRecord>>(
    `/p3f_billingrecords?$filter=_p3f_clientid_value eq ${clientId}&$orderby=p3f_resolvedon desc`
  );
  return res.value;
}

// ─── Apps ────────────────────────────────────────────────────────

export async function getApps(): Promise<P3FApp[]> {
  const res = await dvFetch<DataverseResponse<P3FApp>>(
    `/p3f_apps?$orderby=p3f_name asc`
  );
  return res.value;
}

// ─── Intake ──────────────────────────────────────────────────────

export async function getIntakeTickets(): Promise<P3FTicket[]> {
  const res = await dvFetch<DataverseResponse<P3FTicket>>(
    `/p3f_tickets?$filter=p3f_status le 250&$orderby=p3f_createdon desc`
  );
  return res.value;
}

export async function createTicket(data: {
  clientId: string;
  appId: string;
  rawMessage: string;
  submittedBy: string;
}): Promise<P3FTicket> {
  return dvFetch<P3FTicket>('/p3f_tickets', {
    method: 'POST',
    body: JSON.stringify({
      'p3f_clientid@odata.bind': `/p3f_clients(${data.clientId})`,
      'p3f_appid@odata.bind': `/p3f_apps(${data.appId})`,
      p3f_rawmessage: data.rawMessage,
      p3f_submittedby: data.submittedBy,
      p3f_status: 100,
      p3f_triageloopcount: 0,
      p3f_specialistscomplete: 0,
      p3f_offerrevcount: 0,
      p3f_qaretrycount: 0,
      p3f_buildsuccess: 0,
      p3f_buildfailed: 0,
    }),
    headers: { 'Prefer': 'return=representation' },
  });
}

export async function sendTicketMessage(ticketId: string, content: string): Promise<void> {
  await dvFetch('/p3f_ticketmessages', {
    method: 'POST',
    body: JSON.stringify({
      'p3f_ticketid@odata.bind': `/p3f_tickets(${ticketId})`,
      p3f_sender: 1,
      p3f_content: content,
    }),
  });
}
