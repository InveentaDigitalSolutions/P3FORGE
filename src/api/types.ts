// P3 Forge — Dataverse TypeScript Types
// Source of truth: DATAVERSE.md. If types conflict with schema, fix the types.

// ─── Status codes ───────────────────────────────────────────────

export const STATUS = {
  SUBMITTED:          100,
  STRUCTURING:        150,
  CONFIRMING:         200,
  CONFIRMED:          250,
  ASSESSED:           300,
  SPECIALIST_REVIEW:  350,
  OFFER_SENT:         400,
  OFFER_ACCEPTED:     450,
  GATE1_PENDING:      500,
  IN_DEVELOPMENT:     550,
  QA_REVIEW:          600,
  QA_FAILED:          650,
  UAT_PENDING:        700,
  GATE2_PENDING:      750,
  DEPLOYED:           800,
  CLOSED:             850,
  ESCALATED:          900,
  DUPLICATE:          950,
  EXPIRED:            975,
  CANCELLED:          999,
  PAUSED:             990,
  ROLLBACK_PENDING:   985,
} as const;

export type StatusCode = typeof STATUS[keyof typeof STATUS];

export const STATUS_LABELS: Record<StatusCode, string> = {
  [STATUS.SUBMITTED]:         'Submitted',
  [STATUS.STRUCTURING]:       'Structuring',
  [STATUS.CONFIRMING]:        'Awaiting Confirmation',
  [STATUS.CONFIRMED]:         'Confirmed',
  [STATUS.ASSESSED]:          'Assessed',
  [STATUS.SPECIALIST_REVIEW]: 'Specialist Review',
  [STATUS.OFFER_SENT]:        'Offer Sent',
  [STATUS.OFFER_ACCEPTED]:    'Offer Accepted',
  [STATUS.GATE1_PENDING]:     'Gate 1 Pending',
  [STATUS.IN_DEVELOPMENT]:    'In Development',
  [STATUS.QA_REVIEW]:         'QA Review',
  [STATUS.QA_FAILED]:         'QA Failed',
  [STATUS.UAT_PENDING]:       'UAT Pending',
  [STATUS.GATE2_PENDING]:     'Gate 2 Pending',
  [STATUS.DEPLOYED]:          'Deployed',
  [STATUS.CLOSED]:            'Closed',
  [STATUS.ESCALATED]:         'Escalated',
  [STATUS.DUPLICATE]:         'Duplicate',
  [STATUS.EXPIRED]:           'Expired',
  [STATUS.CANCELLED]:         'Cancelled',
  [STATUS.PAUSED]:            'Paused',
  [STATUS.ROLLBACK_PENDING]:  'Rollback Pending',
};

// ─── OptionSet values ───────────────────────────────────────────

export const TICKET_TYPE = { BUG: 100, CHANGE_REQUEST: 200, UNCLASSIFIED: 300 } as const;
export const CRITICALITY = { P1: 1, P2: 2, P3: 3, P4: 4 } as const;
export const COMPLEXITY   = { S: 1, M: 2, L: 3, XL: 4 } as const;
export const LANGUAGE     = { DE: 1, EN: 2, ES: 3, FR: 4 } as const;
export const TIER         = { SUPERVISED: 1, SEMI_AUTONOMOUS: 2, AUTONOMOUS: 3 } as const;

export const COMPLEXITY_LABELS: Record<number, string> = {
  [COMPLEXITY.S]:  'Small',
  [COMPLEXITY.M]:  'Medium',
  [COMPLEXITY.L]:  'Large',
  [COMPLEXITY.XL]: 'XL',
};

export const CRITICALITY_LABELS: Record<number, string> = {
  [CRITICALITY.P1]: 'P1 — Critical',
  [CRITICALITY.P2]: 'P2 — High',
  [CRITICALITY.P3]: 'P3 — Medium',
  [CRITICALITY.P4]: 'P4 — Low',
};

export const TIER_LABELS: Record<number, string> = {
  [TIER.SUPERVISED]:       'Supervised',
  [TIER.SEMI_AUTONOMOUS]:  'Semi-Autonomous',
  [TIER.AUTONOMOUS]:       'Autonomous',
};

export const TICKET_TYPE_LABELS: Record<number, string> = {
  [TICKET_TYPE.BUG]:             'Bug',
  [TICKET_TYPE.CHANGE_REQUEST]:  'Change Request',
  [TICKET_TYPE.UNCLASSIFIED]:    'Unclassified',
};

// ─── Entity interfaces ─────────────────────────────────────────

export interface P3FClient {
  p3f_clientid: string;
  p3f_name: string;
  p3f_autonomytier: 1 | 2 | 3;
  p3f_defaultlanguage: 1 | 2 | 3 | 4;
  p3f_teamstenantid?: string;
  p3f_pricethreshold?: number;
  p3f_active: boolean;
  p3f_onboardingcomplete: boolean;
  p3f_envurl?: string;
  p3f_uatenvurl?: string;
  p3f_prodenvurl?: string;
  '_p3f_managedby_value': string;
}

export interface P3FProject {
  p3f_projectid: string;
  p3f_name: string;
  p3f_repouri?: string;
  p3f_techstack?: string;
  p3f_status: 1 | 2 | 3;
  '_p3f_clientid_value': string;
}

export interface P3FApp {
  p3f_appid: string;
  p3f_name: string;
  p3f_environmenturl?: string;
  p3f_publishedversion?: string;
  p3f_flownames?: string;
  p3f_screenfiles?: string;
  p3f_topicnames?: string;
  p3f_requirementsimported?: boolean;
  p3f_requirementsdocument?: string;
  '_p3f_projectid_value': string;
  '_p3f_ratecardid_value'?: string;
}

export interface P3FRateCard {
  p3f_ratecardid: string;
  p3f_label: string;
  p3f_tickettype: 100 | 200;
  p3f_complexity: 1 | 2 | 3 | 4;
  p3f_baseprice: number;
  p3f_basehours: number;
  '_p3f_clientid_value'?: string;
}

export interface P3FTicket {
  p3f_ticketid: string;
  p3f_title?: string;
  p3f_rawmessage: string;
  p3f_status: StatusCode;
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
  p3f_buildsuccess: number;
  p3f_buildfailed: number;
  p3f_sladue?: string;
  p3f_createdon: string;
  p3f_resolvedon?: string;
  p3f_resolutionfeedback?: number;
  p3f_pausedon?: string;
  p3f_emergencypath?: boolean;
  p3f_conversationid?: string;
  p3f_deliberationpending?: boolean;
  p3f_waitingforagent?: string;
  p3f_registryanalysis?: string;
  p3f_overridesrequirement?: string;
  p3f_intentional_override?: boolean;
  p3f_hasmergeconflict?: boolean;
  '_p3f_clientid_value': string;
  '_p3f_appid_value': string;
  '_p3f_assignedmanager_value'?: string;
  '_p3f_duplicateof_value'?: string;
}

export interface P3FTicketMessage {
  p3f_messageid: string;
  p3f_sender: number;
  p3f_content: string;
  p3f_language?: number;
  p3f_channel?: number;
  p3f_createdon: string;
  '_p3f_ticketid_value': string;
}

export interface P3FRequirement {
  p3f_requirementid: string;
  p3f_type: 100 | 200;
  p3f_structuredjson: string;
  p3f_plainlanguagesummary: string;
  p3f_effortestimate: string;
  p3f_priceestimate?: string;
  p3f_included?: string;
  p3f_notincluded?: string;
  p3f_status: 1 | 2 | 3;
  p3f_confirmedon?: string;
  p3f_correctioncount: number;
  p3f_clarifications?: string;
  '_p3f_ticketid_value': string;
}

export interface P3FArchitectPlan {
  p3f_architectplanid: string;
  p3f_approach: string;
  p3f_componentsaffected: string;
  p3f_dependencies?: string;
  p3f_riskflags?: string;
  p3f_implementationorder?: string;
  p3f_estimatedhours: number;
  '_p3f_ticketid_value': string;
}

export interface P3FBuildPlan {
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
  p3f_deliberationrounds?: number;
  p3f_consensusreached?: boolean;
  p3f_estimationdiscrepancy?: number;
  p3f_securityreviewjson?: string;
  p3f_testspecsjson?: string;
  p3f_finalhoursestimate?: number;
  '_p3f_ticketid_value': string;
  '_p3f_architectplanid_value': string;
  '_p3f_approvedby_value'?: string;
  p3f_approvedon?: string;
}

export interface P3FQAReport {
  p3f_qareportid: string;
  p3f_criteriaresultsjson: string;
  p3f_passed: boolean;
  p3f_failuresummary?: string;
  p3f_retrycount?: number;
  p3f_signedoffon?: string;
  '_p3f_ticketid_value': string;
}

export interface P3FOffer {
  p3f_offerid: string;
  p3f_scopesummary: string;
  p3f_exclusions?: string;
  p3f_price: number;
  p3f_hours?: number;
  p3f_timeline?: string;
  p3f_status: 1 | 2 | 3 | 4 | 5 | 6;
  p3f_revision: number;
  p3f_customercomment?: string;
  p3f_expireson: string;
  p3f_clarificationpending?: boolean;
  '_p3f_ticketid_value': string;
}

export interface P3FDeployRecord {
  p3f_deployrecordid: string;
  p3f_deployedon: string;
  p3f_deployedby: string;
  p3f_componentsdeployed: string;
  p3f_paflowsactivated?: string;
  p3f_codeappversion?: string;
  p3f_dataversechanges?: string;
  p3f_copilottopics?: string;
  p3f_snapshot_pa?: string;
  p3f_snapshot_dv?: string;
  p3f_snapshot_codeapp_version?: string;
  p3f_snapshot_cs?: string;
  p3f_targetenv?: number;
  p3f_releasenotesjson?: string;
  p3f_requirementschanged?: string;
  '_p3f_ticketid_value': string;
}

export interface P3FTrustHistory {
  p3f_trusthistoryid: string;
  p3f_event: string;
  p3f_tierbefore: 1 | 2 | 3;
  p3f_tierafter: 1 | 2 | 3;
  p3f_createdon: string;
  '_p3f_clientid_value': string;
  '_p3f_ticketid_value'?: string;
  '_p3f_changedby_value'?: string;
}

export interface P3FBillingRecord {
  p3f_billingrecordid: string;
  p3f_agreedprice: number;
  p3f_tickettype: 100 | 200;
  p3f_resolvedon: string;
  p3f_invoiced: boolean;
  '_p3f_ticketid_value': string;
  '_p3f_clientid_value': string;
  '_p3f_offerid_value'?: string;
}

export interface P3FRollbackRecord {
  p3f_rollbackrecordid: string;
  p3f_triggeredon: string;
  p3f_reason: string;
  p3f_componentsrolledback: string;
  p3f_result: 1 | 2 | 3;
  '_p3f_ticketid_value': string;
  '_p3f_triggeredby_value'?: string;
}

export interface P3FRetryQueue {
  p3f_retryqueueid: string;
  p3f_agentname: string;
  p3f_payloadjson: string;
  p3f_retrycount: number;
  p3f_nextretry: string;
  p3f_lasterror?: string;
  p3f_status: 1 | 2 | 3 | 4;
  '_p3f_ticketid_value': string;
}

export interface P3FAgentPrompt {
  p3f_agentpromptid: string;
  p3f_agentname: string;
  p3f_version: number;
  p3f_systemprompt: string;
  p3f_userprompttemplate: string;
  p3f_model: string;
  p3f_active: boolean;
  p3f_notes?: string;
}

export interface P3FAgentConversation {
  p3f_agentconversationid: string;
  p3f_fromagent: string;
  p3f_toagent: string;
  p3f_messagetype: 1 | 2 | 3 | 4 | 5;
  p3f_content: string;
  p3f_round: number;
  p3f_resolved?: boolean;
  p3f_createdon: string;
  '_p3f_ticketid_value': string;
}

export interface P3FAppRequirement {
  p3f_apprequirementid: string;
  p3f_featuretitle: string;
  p3f_featuredescription?: string;
  p3f_status: 1 | 2 | 3 | 4;
  p3f_sourcetype: 1 | 2;
  p3f_sourcedocument?: string;
  p3f_version: number;
  p3f_tags?: string;
  p3f_createdon: string;
  p3f_deprecatedon?: string;
  '_p3f_appid_value': string;
  '_p3f_sourceticketid_value'?: string;
  '_p3f_previousversionid_value'?: string;
  '_p3f_supersededbyticket_value'?: string;
}

export interface P3FDataRetentionPolicy {
  p3f_dataretentionpolicyid: string;
  p3f_retentionperiodmonths: number;
  p3f_anonymiseonexpiry: boolean;
  p3f_deleteonexpiry: boolean;
  p3f_legalhold: boolean;
  '_p3f_clientid_value': string;
}

export interface P3FAgentCircuitBreaker {
  p3f_agentcircuitbreakerid: string;
  p3f_agentname: string;
  p3f_trippedat: string;
  p3f_reason: string;
  p3f_resetat: string;
  p3f_manualreset: boolean;
  p3f_active: boolean;
}

// ─── Dataverse API response wrapper ─────────────────────────────

export interface DataverseResponse<T> {
  '@odata.context': string;
  '@odata.count'?: number;
  value: T[];
}
