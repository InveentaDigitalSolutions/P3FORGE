#!/usr/bin/env node
// P3 Forge — Dataverse Provisioning Script v1.0
// Creates all p3f_ tables, option sets, relationships, and seeds initial data.
//
// Usage:
//   cd /Users/sgr/P3FORGE/scripts
//   npm install
//   node provision.mjs
//
// Requires: Node 18+, System Administrator or System Customizer role in the environment.

import { DeviceCodeCredential } from '@azure/identity';

// ─── Config ─────────────────────────────────────────────────────
const TENANT_ID = '47176c00-abb5-4125-8ce3-a795dffd8b87';
const ENV_URL   = 'https://org2d99840c.crm.dynamics.com';
const API_BASE  = `${ENV_URL}/api/data/v9.2`;
const SCOPE     = [`${ENV_URL}/.default`];

// ─── Auth ────────────────────────────────────────────────────────
const cred = new DeviceCodeCredential({
  tenantId: TENANT_ID,
  clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46', // Azure CLI public client
  userPromptCallback: (info) => console.log('\n' + info.message + '\n'),
});

let _token = null;
async function getToken() {
  const result = await cred.getToken(SCOPE);
  _token = result.token;
  return _token;
}

// ─── HTTP helper ─────────────────────────────────────────────────
async function dvFetch(method, path, body) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`${method} ${path} → HTTP ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const loc = res.headers.get('OData-EntityId') || res.headers.get('Location');
  if (loc && !res.headers.get('Content-Type')?.includes('json')) return { location: loc };
  try { return await res.json(); } catch { return { location: loc }; }
}

async function safeRun(label, fn) {
  try {
    const result = await fn();
    console.log(`  ✓ ${label}`);
    return result;
  } catch (e) {
    // 409 = conflict, 0x80047013 = attribute already exists
    if (e.status === 409 || e.message?.includes('0x80047013') || e.message?.includes('already exists')) {
      console.log(`  ↩ ${label} (already exists)`);
    } else {
      console.error(`  ✗ ${label}: ${e.message}`);
    }
  }
}

// ─── Label helpers ───────────────────────────────────────────────
function lbl(text) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.Label',
    LocalizedLabels: [{ '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel', Label: text, LanguageCode: 1033 }],
    UserLocalizedLabel: { '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel', Label: text, LanguageCode: 1033 },
  };
}

function optionItem(value, label) {
  return {
    Value: value,
    Label: lbl(label),
    Description: lbl(''),
  };
}

function req(level = 'None') {
  return { Value: level, CanBeChanged: true, ManagedPropertyLogicalName: 'canmodifyrequirementlevelsettings' };
}

// ─── Option set factory ──────────────────────────────────────────
function makeOptionSet(name, displayName, options) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.OptionSetMetadata',
    Name: name,
    DisplayName: lbl(displayName),
    Description: lbl(''),
    IsGlobal: true,
    OptionSetType: 'Picklist',
    Options: options,
  };
}

// ─── Attribute factories ──────────────────────────────────────────
function strAttr(schema, display, maxLen = 200, required = 'None') {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
    SchemaName: schema,
    LogicalName: schema.toLowerCase(),
    DisplayName: lbl(display),
    Description: lbl(''),
    RequiredLevel: req(required),
    MaxLength: maxLen,
    Format: 'Text',
    ImeMode: 'Disabled',
  };
}

function memoAttr(schema, display, required = 'None') {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.MemoAttributeMetadata',
    SchemaName: schema,
    LogicalName: schema.toLowerCase(),
    DisplayName: lbl(display),
    Description: lbl(''),
    RequiredLevel: req(required),
    MaxLength: 100000,
    Format: 'TextArea',
    ImeMode: 'Disabled',
  };
}

function intAttr(schema, display, min = 0, max = 2147483647, required = 'None') {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.IntegerAttributeMetadata',
    SchemaName: schema,
    LogicalName: schema.toLowerCase(),
    DisplayName: lbl(display),
    Description: lbl(''),
    RequiredLevel: req(required),
    MinValue: min,
    MaxValue: max,
    Format: 'None',
  };
}

function decimalAttr(schema, display, required = 'None') {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.DecimalAttributeMetadata',
    SchemaName: schema,
    LogicalName: schema.toLowerCase(),
    DisplayName: lbl(display),
    Description: lbl(''),
    RequiredLevel: req(required),
    MinValue: 0,
    MaxValue: 100000,
    Precision: 2,
  };
}

function boolAttr(schema, display) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.BooleanAttributeMetadata',
    SchemaName: schema,
    LogicalName: schema.toLowerCase(),
    DisplayName: lbl(display),
    Description: lbl(''),
    RequiredLevel: req('None'),
    OptionSet: {
      '@odata.type': 'Microsoft.Dynamics.CRM.BooleanOptionSetMetadata',
      TrueOption: { Value: 1, Label: lbl('Yes') },
      FalseOption: { Value: 0, Label: lbl('No') },
    },
  };
}

function moneyAttr(schema, display, required = 'None') {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.MoneyAttributeMetadata',
    SchemaName: schema,
    LogicalName: schema.toLowerCase(),
    DisplayName: lbl(display),
    Description: lbl(''),
    RequiredLevel: req(required),
    MinValue: 0,
    MaxValue: 1000000,
    Precision: 2,
    PrecisionSource: 2,
  };
}

function dtAttr(schema, display) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata',
    SchemaName: schema,
    LogicalName: schema.toLowerCase(),
    DisplayName: lbl(display),
    Description: lbl(''),
    RequiredLevel: req('None'),
    Format: 'DateAndTime',
    DateTimeBehavior: { Value: 'UserLocal' },
  };
}

// Pre-defined option values for local option sets
// (must match global option sets created in step 1)
const OPTIONS = {
  p3f_ticketstatus: [
    [100,'Submitted'],[150,'Structuring'],[200,'Awaiting Confirmation'],[250,'Confirmed'],
    [300,'Assessed'],[350,'Specialist Review'],[400,'Offer Sent'],[450,'Offer Accepted'],
    [500,'Gate 1 Pending'],[550,'In Development'],[600,'QA Review'],[650,'QA Failed'],
    [700,'UAT Pending'],[750,'Gate 2 Pending'],[800,'Deployed'],[850,'Closed'],
    [900,'Escalated'],[950,'Duplicate'],[975,'Expired'],[985,'Rollback Pending'],
    [990,'Paused'],[999,'Cancelled'],
  ],
  p3f_tickettype:        [[100,'Bug'],[200,'Change Request'],[300,'Unclassified']],
  p3f_complexity:        [[1,'Small (S)'],[2,'Medium (M)'],[3,'Large (L)'],[4,'Extra Large (XL)']],
  p3f_criticality:       [[1,'P1 — Critical'],[2,'P2 — High'],[3,'P3 — Medium'],[4,'P4 — Low']],
  p3f_autonomytier:      [[1,'Supervised'],[2,'Semi-Autonomous'],[3,'Autonomous']],
  p3f_language:          [[1,'German (DE)'],[2,'English (EN)'],[3,'Spanish (ES)'],[4,'French (FR)']],
  p3f_projectstatus:     [[1,'Active'],[2,'Maintenance'],[3,'Archived']],
  p3f_requirementstatus: [[1,'Draft'],[2,'Pending Confirmation'],[3,'Confirmed']],
  p3f_offerstatus:       [[1,'Draft'],[2,'Sent'],[3,'Accepted'],[4,'Rejected'],[5,'Expired'],[6,'Revised']],
  p3f_buildplanstatus:   [[1,'Draft'],[2,'Pending Approval'],[3,'Approved'],[4,'Rejected']],
  p3f_messagesender:     [[1,'Customer'],[2,'Agent'],[3,'Manager'],[4,'System']],
  p3f_messagechannel:    [[1,'Teams'],[2,'Email'],[3,'Internal']],
  p3f_rollbackresult:    [[1,'Success'],[2,'Partial'],[3,'Failed']],
  p3f_apprequirementstatus:[[1,'Active'],[2,'Draft'],[3,'Deprecated'],[4,'Superseded']],
  p3f_apprequirementsource:[[1,'Ticket'],[2,'Import']],
  p3f_deployenvironment: [[1,'Dev'],[2,'UAT'],[3,'Production']],
  p3f_retryqueuestatus:  [[1,'Pending'],[2,'Retrying'],[3,'Resolved'],[4,'Failed']],
  p3f_agentmessagetype:  [[1,'Question'],[2,'Answer'],[3,'Objection'],[4,'Resolution'],[5,'Consensus']],
};

function picklistAttr(schema, display, optionSetKey, required = 'None') {
  const values = OPTIONS[optionSetKey];
  if (!values) throw new Error(`Unknown option set key: ${optionSetKey}`);
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata',
    SchemaName: schema,
    LogicalName: schema.toLowerCase(),
    DisplayName: lbl(display),
    Description: lbl(''),
    RequiredLevel: req(required),
    OptionSet: {
      '@odata.type': 'Microsoft.Dynamics.CRM.OptionSetMetadata',
      IsGlobal: false,
      Options: values.map(([v, l]) => ({ Value: v, Label: lbl(l), Description: lbl('') })),
    },
  };
}

// ─── Entity factory ──────────────────────────────────────────────
// Dataverse Web API: POST /EntityDefinitions
// Primary name attribute goes in the Attributes array with IsPrimaryName: true.
// This is what the Organization Service layer looks for as 'PrimaryAttribute'.
function makeEntity(schema, displaySingular, displayPlural, primaryNameAttr = 'p3f_name') {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.EntityMetadata',
    SchemaName: schema,
    LogicalName: schema.toLowerCase(),
    DisplayName: lbl(displaySingular),
    DisplayCollectionName: lbl(displayPlural),
    Description: lbl(''),
    PrimaryNameAttribute: primaryNameAttr.toLowerCase(),
    OwnershipType: 'OrganizationOwned',
    IsActivity: false,
    HasActivities: false,
    HasNotes: false,
    Attributes: [
      {
        '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
        SchemaName: primaryNameAttr,
        LogicalName: primaryNameAttr.toLowerCase(),
        IsPrimaryName: true,
        DisplayName: lbl('Name'),
        Description: lbl(''),
        RequiredLevel: req('ApplicationRequired'),
        MaxLength: 200,
        Format: 'Text',
        ImeMode: 'Disabled',
      },
    ],
  };
}

// ─── Relationship (lookup) factory ───────────────────────────────
function makeRelationship(schemaName, referencedEntity, referencingEntity, lookupSchema, lookupDisplay, required = 'None') {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata',
    SchemaName: schemaName,
    ReferencedEntity: referencedEntity,
    ReferencingEntity: referencingEntity,
    CascadeConfiguration: {
      Assign: 'NoCascade',
      Delete: 'RemoveLink',
      Merge: 'NoCascade',
      Reparent: 'NoCascade',
      Share: 'NoCascade',
      Unshare: 'NoCascade',
    },
    Lookup: {
      '@odata.type': 'Microsoft.Dynamics.CRM.LookupAttributeMetadata',
      SchemaName: lookupSchema,
      LogicalName: lookupSchema.toLowerCase(),
      DisplayName: lbl(lookupDisplay),
      Description: lbl(''),
      RequiredLevel: req(required),
    },
  };
}

// ─── POST helpers ────────────────────────────────────────────────
async function createOptionSet(os) {
  return safeRun(`Option set: ${os.Name}`, () =>
    dvFetch('POST', '/GlobalOptionSetDefinitions', os)
  );
}

async function createEntity(entity) {
  return safeRun(`Entity: ${entity.SchemaName}`, () =>
    dvFetch('POST', '/EntityDefinitions', entity)
  );
}

async function addAttr(entityLogical, attr) {
  return safeRun(`  Attr: ${entityLogical}.${attr.SchemaName}`, () =>
    dvFetch('POST', `/EntityDefinitions(LogicalName='${entityLogical}')/Attributes`, attr)
  );
}

async function createRel(rel) {
  return safeRun(`Relationship: ${rel.SchemaName}`, () =>
    dvFetch('POST', '/RelationshipDefinitions', rel)
  );
}

async function seedRecord(entitySet, data, label) {
  return safeRun(`Seed: ${label}`, () =>
    dvFetch('POST', `/${entitySet}`, data)
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log('P3 Forge — Dataverse Provisioning');
  console.log('═══════════════════════════════════');
  // Flags: --skip-optionsets, --skip-entities, --skip-attributes, --skip-relationships, --picklists-and-seed
  const skipOptionSets   = process.argv.includes('--skip-optionsets') || process.argv.includes('--picklists-and-seed');
  const skipEntities     = process.argv.includes('--skip-entities')    || process.argv.includes('--picklists-and-seed');
  const skipRelationships= process.argv.includes('--skip-relationships')|| process.argv.includes('--picklists-and-seed');
  const onlyPicklists    = process.argv.includes('--picklists-and-seed');

  // ── Step 1: Global option sets ──────────────────────────────────
  if (skipOptionSets) {
    console.log('\n[1/6] Skipping option sets (already created).');
  } else {
  console.log('\n[1/6] Creating global option sets…');

  await createOptionSet(makeOptionSet('p3f_ticketstatus', 'P3F Ticket Status', [
    optionItem(100,  'Submitted'),
    optionItem(150,  'Structuring'),
    optionItem(200,  'Awaiting Confirmation'),
    optionItem(250,  'Confirmed'),
    optionItem(300,  'Assessed'),
    optionItem(350,  'Specialist Review'),
    optionItem(400,  'Offer Sent'),
    optionItem(450,  'Offer Accepted'),
    optionItem(500,  'Gate 1 Pending'),
    optionItem(550,  'In Development'),
    optionItem(600,  'QA Review'),
    optionItem(650,  'QA Failed'),
    optionItem(700,  'UAT Pending'),
    optionItem(750,  'Gate 2 Pending'),
    optionItem(800,  'Deployed'),
    optionItem(850,  'Closed'),
    optionItem(900,  'Escalated'),
    optionItem(950,  'Duplicate'),
    optionItem(975,  'Expired'),
    optionItem(985,  'Rollback Pending'),
    optionItem(990,  'Paused'),
    optionItem(999,  'Cancelled'),
  ]));

  await createOptionSet(makeOptionSet('p3f_tickettype', 'P3F Ticket Type', [
    optionItem(100, 'Bug'),
    optionItem(200, 'Change Request'),
    optionItem(300, 'Unclassified'),
  ]));

  await createOptionSet(makeOptionSet('p3f_complexity', 'P3F Complexity', [
    optionItem(1, 'Small (S)'),
    optionItem(2, 'Medium (M)'),
    optionItem(3, 'Large (L)'),
    optionItem(4, 'Extra Large (XL)'),
  ]));

  await createOptionSet(makeOptionSet('p3f_criticality', 'P3F Criticality', [
    optionItem(1, 'P1 — Critical'),
    optionItem(2, 'P2 — High'),
    optionItem(3, 'P3 — Medium'),
    optionItem(4, 'P4 — Low'),
  ]));

  await createOptionSet(makeOptionSet('p3f_autonomytier', 'P3F Autonomy Tier', [
    optionItem(1, 'Supervised'),
    optionItem(2, 'Semi-Autonomous'),
    optionItem(3, 'Autonomous'),
  ]));

  await createOptionSet(makeOptionSet('p3f_language', 'P3F Language', [
    optionItem(1, 'German (DE)'),
    optionItem(2, 'English (EN)'),
    optionItem(3, 'Spanish (ES)'),
    optionItem(4, 'French (FR)'),
  ]));

  await createOptionSet(makeOptionSet('p3f_projectstatus', 'P3F Project Status', [
    optionItem(1, 'Active'),
    optionItem(2, 'Maintenance'),
    optionItem(3, 'Archived'),
  ]));

  await createOptionSet(makeOptionSet('p3f_requirementstatus', 'P3F Requirement Status', [
    optionItem(1, 'Draft'),
    optionItem(2, 'Pending Confirmation'),
    optionItem(3, 'Confirmed'),
  ]));

  await createOptionSet(makeOptionSet('p3f_offerstatus', 'P3F Offer Status', [
    optionItem(1, 'Draft'),
    optionItem(2, 'Sent'),
    optionItem(3, 'Accepted'),
    optionItem(4, 'Rejected'),
    optionItem(5, 'Expired'),
    optionItem(6, 'Revised'),
  ]));

  await createOptionSet(makeOptionSet('p3f_buildplanstatus', 'P3F Build Plan Status', [
    optionItem(1, 'Draft'),
    optionItem(2, 'Pending Approval'),
    optionItem(3, 'Approved'),
    optionItem(4, 'Rejected'),
  ]));

  await createOptionSet(makeOptionSet('p3f_messagesender', 'P3F Message Sender', [
    optionItem(1, 'Customer'),
    optionItem(2, 'Agent'),
    optionItem(3, 'Manager'),
    optionItem(4, 'System'),
  ]));

  await createOptionSet(makeOptionSet('p3f_messagechannel', 'P3F Message Channel', [
    optionItem(1, 'Teams'),
    optionItem(2, 'Email'),
    optionItem(3, 'Internal'),
  ]));

  await createOptionSet(makeOptionSet('p3f_rollbackresult', 'P3F Rollback Result', [
    optionItem(1, 'Success'),
    optionItem(2, 'Partial'),
    optionItem(3, 'Failed'),
  ]));

  await createOptionSet(makeOptionSet('p3f_apprequirementstatus', 'P3F App Requirement Status', [
    optionItem(1, 'Active'),
    optionItem(2, 'Draft'),
    optionItem(3, 'Deprecated'),
    optionItem(4, 'Superseded'),
  ]));

  await createOptionSet(makeOptionSet('p3f_apprequirementsource', 'P3F App Requirement Source', [
    optionItem(1, 'Ticket'),
    optionItem(2, 'Import'),
  ]));

  await createOptionSet(makeOptionSet('p3f_deployenvironment', 'P3F Deploy Environment', [
    optionItem(1, 'Dev'),
    optionItem(2, 'UAT'),
    optionItem(3, 'Production'),
  ]));

  await createOptionSet(makeOptionSet('p3f_retryqueuestatus', 'P3F Retry Queue Status', [
    optionItem(1, 'Pending'),
    optionItem(2, 'Retrying'),
    optionItem(3, 'Resolved'),
    optionItem(4, 'Failed'),
  ]));

  await createOptionSet(makeOptionSet('p3f_agentmessagetype', 'P3F Agent Message Type', [
    optionItem(1, 'Question'),
    optionItem(2, 'Answer'),
    optionItem(3, 'Objection'),
    optionItem(4, 'Resolution'),
    optionItem(5, 'Consensus'),
  ]));

  } // end if (!skipOptionSets)

  // ── Step 2: Create entities ──────────────────────────────────────
  if (skipEntities) {
    console.log('\n[2/6] Skipping entities (already created).');
  } else {
  console.log('\n[2/6] Creating entities…');

  await createEntity(makeEntity('p3f_client',             'P3F Client',              'P3F Clients'));
  await createEntity(makeEntity('p3f_project',            'P3F Project',             'P3F Projects'));
  await createEntity(makeEntity('p3f_app',                'P3F App',                 'P3F Apps'));
  await createEntity(makeEntity('p3f_ratecard',           'P3F Rate Card',           'P3F Rate Cards',           'p3f_label'));
  await createEntity(makeEntity('p3f_ticket',             'P3F Ticket',              'P3F Tickets',              'p3f_title'));
  await createEntity(makeEntity('p3f_ticketmessage',      'P3F Ticket Message',      'P3F Ticket Messages',      'p3f_content'));
  await createEntity(makeEntity('p3f_requirement',        'P3F Requirement',         'P3F Requirements',         'p3f_plainlanguagesummary'));
  await createEntity(makeEntity('p3f_architectplan',      'P3F Architect Plan',      'P3F Architect Plans',      'p3f_approach'));
  await createEntity(makeEntity('p3f_buildplan',          'P3F Build Plan',          'P3F Build Plans',          'p3f_plansummary'));
  await createEntity(makeEntity('p3f_qareport',           'P3F QA Report',           'P3F QA Reports',           'p3f_criteriaresultsjson'));
  await createEntity(makeEntity('p3f_offer',              'P3F Offer',               'P3F Offers',               'p3f_scopesummary'));
  await createEntity(makeEntity('p3f_deployrecord',       'P3F Deploy Record',       'P3F Deploy Records',       'p3f_componentsdeployed'));
  await createEntity(makeEntity('p3f_rollbackrecord',     'P3F Rollback Record',     'P3F Rollback Records',     'p3f_reason'));
  await createEntity(makeEntity('p3f_billingrecord',      'P3F Billing Record',      'P3F Billing Records'));
  await createEntity(makeEntity('p3f_trusthistory',       'P3F Trust History',       'P3F Trust Histories',      'p3f_event'));
  await createEntity(makeEntity('p3f_retryqueue',         'P3F Retry Queue',         'P3F Retry Queues',         'p3f_agentname'));
  await createEntity(makeEntity('p3f_agentprompt',        'P3F Agent Prompt',        'P3F Agent Prompts',        'p3f_agentname'));
  await createEntity(makeEntity('p3f_agentconversation',  'P3F Agent Conversation',  'P3F Agent Conversations',  'p3f_content'));
  await createEntity(makeEntity('p3f_apprequirement',     'P3F App Requirement',     'P3F App Requirements',     'p3f_featuretitle'));
  await createEntity(makeEntity('p3f_dataretentionpolicy','P3F Data Retention Policy','P3F Data Retention Policies','p3f_name'));
  await createEntity(makeEntity('p3f_componentlock',      'P3F Component Lock',      'P3F Component Locks',      'p3f_componentname'));
  } // end if (!skipEntities)

  // ── Step 3: Add attributes ───────────────────────────────────────
  // Already-existing attrs are silently skipped (safeRun catches 0x80047013).
  console.log('\n[3/6] Adding attributes…');

  // p3f_client
  await addAttr('p3f_client', picklistAttr('p3f_autonomytier',    'Autonomy Tier',    'p3f_autonomytier',  'ApplicationRequired'));
  await addAttr('p3f_client', picklistAttr('p3f_defaultlanguage', 'Default Language', 'p3f_language',      'ApplicationRequired'));
  await addAttr('p3f_client', strAttr('p3f_teamstenantid', 'Teams Tenant ID', 100));
  await addAttr('p3f_client', moneyAttr('p3f_pricethreshold', 'Price Threshold'));
  await addAttr('p3f_client', boolAttr('p3f_active', 'Active'));
  await addAttr('p3f_client', boolAttr('p3f_onboardingcomplete', 'Onboarding Complete'));
  await addAttr('p3f_client', strAttr('p3f_uatenvurl', 'UAT Environment URL', 500));
  await addAttr('p3f_client', strAttr('p3f_prodenvurl', 'Production Environment URL', 500));

  // p3f_project
  await addAttr('p3f_project', strAttr('p3f_repouri', 'Repository URL', 500));
  await addAttr('p3f_project', strAttr('p3f_techstack', 'Tech Stack', 500));
  await addAttr('p3f_project', picklistAttr('p3f_status', 'Status', 'p3f_projectstatus', 'ApplicationRequired'));

  // p3f_app
  await addAttr('p3f_app', strAttr('p3f_environmenturl', 'Environment URL', 500));
  await addAttr('p3f_app', strAttr('p3f_publishedversion', 'Published Version', 50));
  await addAttr('p3f_app', memoAttr('p3f_flownames', 'Flow Names (JSON)'));
  await addAttr('p3f_app', memoAttr('p3f_screenfiles', 'Screen Files (JSON)'));
  await addAttr('p3f_app', memoAttr('p3f_topicnames', 'Topic Names (JSON)'));
  await addAttr('p3f_app', boolAttr('p3f_requirementsimported', 'Requirements Imported'));
  await addAttr('p3f_app', memoAttr('p3f_requirementsdocument', 'Requirements Document'));

  // p3f_ratecard
  await addAttr('p3f_ratecard', picklistAttr('p3f_tickettype',  'Ticket Type',  'p3f_tickettype',  'ApplicationRequired'));
  await addAttr('p3f_ratecard', picklistAttr('p3f_complexity',  'Complexity',   'p3f_complexity',  'ApplicationRequired'));
  await addAttr('p3f_ratecard', moneyAttr('p3f_baseprice',  'Base Price (EUR)', 'ApplicationRequired'));
  await addAttr('p3f_ratecard', decimalAttr('p3f_basehours', 'Base Hours',      'ApplicationRequired'));

  // p3f_ticket
  await addAttr('p3f_ticket', memoAttr('p3f_rawmessage', 'Raw Message', 'ApplicationRequired'));
  await addAttr('p3f_ticket', picklistAttr('p3f_status',      'Status',      'p3f_ticketstatus',  'ApplicationRequired'));
  await addAttr('p3f_ticket', picklistAttr('p3f_tickettype',  'Ticket Type', 'p3f_tickettype'));
  await addAttr('p3f_ticket', picklistAttr('p3f_criticality', 'Criticality', 'p3f_criticality'));
  await addAttr('p3f_ticket', picklistAttr('p3f_complexity',  'Complexity',  'p3f_complexity'));
  await addAttr('p3f_ticket', picklistAttr('p3f_language',    'Language',    'p3f_language'));
  await addAttr('p3f_ticket', picklistAttr('p3f_autonomytier','Autonomy Tier','p3f_autonomytier'));
  await addAttr('p3f_ticket', strAttr('p3f_submittedby', 'Submitted By', 200, 'ApplicationRequired'));
  await addAttr('p3f_ticket', intAttr('p3f_triageloopcount',    'Triage Loop Count'));
  await addAttr('p3f_ticket', intAttr('p3f_specialistscomplete','Specialists Complete'));
  await addAttr('p3f_ticket', intAttr('p3f_offerrevcount',      'Offer Revision Count'));
  await addAttr('p3f_ticket', intAttr('p3f_qaretrycount',       'QA Retry Count'));
  await addAttr('p3f_ticket', intAttr('p3f_buildsuccess',       'Build Success Count'));
  await addAttr('p3f_ticket', intAttr('p3f_buildfailed',        'Build Failed Count'));
  await addAttr('p3f_ticket', decimalAttr('p3f_agentconfidence', 'Agent Confidence'));
  await addAttr('p3f_ticket', boolAttr('p3f_gate1required',      'Gate 1 Required'));
  await addAttr('p3f_ticket', boolAttr('p3f_gate2required',      'Gate 2 Required'));
  await addAttr('p3f_ticket', boolAttr('p3f_emergencypath',      'Emergency Path'));
  await addAttr('p3f_ticket', boolAttr('p3f_hasmergeconflict',   'Has Merge Conflict'));
  await addAttr('p3f_ticket', boolAttr('p3f_deliberationpending','Deliberation Pending'));
  await addAttr('p3f_ticket', boolAttr('p3f_intentional_override','Intentional Override'));
  await addAttr('p3f_ticket', dtAttr('p3f_sladue',    'SLA Due'));
  await addAttr('p3f_ticket', dtAttr('p3f_resolvedon','Resolved On'));
  await addAttr('p3f_ticket', dtAttr('p3f_pausedon',  'Paused On'));
  await addAttr('p3f_ticket', strAttr('p3f_conversationid',   'Conversation ID', 200));
  await addAttr('p3f_ticket', strAttr('p3f_waitingforagent',  'Waiting For Agent', 200));
  await addAttr('p3f_ticket', memoAttr('p3f_registryanalysis',   'Registry Analysis'));
  await addAttr('p3f_ticket', memoAttr('p3f_overridesrequirement','Overrides Requirement'));
  await addAttr('p3f_ticket', intAttr('p3f_resolutionfeedback',  'Resolution Feedback', 1, 5));

  // p3f_ticketmessage
  await addAttr('p3f_ticketmessage', picklistAttr('p3f_sender',  'Sender',  'p3f_messagesender', 'ApplicationRequired'));
  await addAttr('p3f_ticketmessage', picklistAttr('p3f_channel', 'Channel', 'p3f_messagechannel'));
  await addAttr('p3f_ticketmessage', picklistAttr('p3f_language','Language','p3f_language'));

  // p3f_requirement
  await addAttr('p3f_requirement', picklistAttr('p3f_type',   'Type',   'p3f_tickettype',       'ApplicationRequired'));
  await addAttr('p3f_requirement', picklistAttr('p3f_status', 'Status', 'p3f_requirementstatus','ApplicationRequired'));
  await addAttr('p3f_requirement', memoAttr('p3f_structuredjson',        'Structured JSON',          'ApplicationRequired'));
  await addAttr('p3f_requirement', memoAttr('p3f_plainlanguagesummary',  'Plain Language Summary'));
  await addAttr('p3f_requirement', strAttr('p3f_effortestimate',  'Effort Estimate', 10));
  await addAttr('p3f_requirement', memoAttr('p3f_priceestimate',  'Price Estimate'));
  await addAttr('p3f_requirement', memoAttr('p3f_included',       'Included'));
  await addAttr('p3f_requirement', memoAttr('p3f_notincluded',    'Not Included'));
  await addAttr('p3f_requirement', dtAttr('p3f_confirmedon', 'Confirmed On'));
  await addAttr('p3f_requirement', intAttr('p3f_correctioncount', 'Correction Count'));
  await addAttr('p3f_requirement', memoAttr('p3f_clarifications', 'Clarifications'));

  // p3f_architectplan
  await addAttr('p3f_architectplan', memoAttr('p3f_componentsaffected', 'Components Affected', 'ApplicationRequired'));
  await addAttr('p3f_architectplan', memoAttr('p3f_dependencies',       'Dependencies'));
  await addAttr('p3f_architectplan', memoAttr('p3f_riskflags',          'Risk Flags'));
  await addAttr('p3f_architectplan', memoAttr('p3f_implementationorder','Implementation Order'));
  await addAttr('p3f_architectplan', decimalAttr('p3f_estimatedhours',  'Estimated Hours'));

  // p3f_buildplan
  await addAttr('p3f_buildplan', memoAttr('p3f_plansummary',         'Plan Summary'));
  await addAttr('p3f_buildplan', memoAttr('p3f_paspecsjson',         'PA Specs (JSON)'));
  await addAttr('p3f_buildplan', memoAttr('p3f_codeappspecjson',     'Code App Spec (JSON)'));
  await addAttr('p3f_buildplan', memoAttr('p3f_dataversespecjson',   'Dataverse Spec (JSON)'));
  await addAttr('p3f_buildplan', boolAttr('p3f_dataversevalid',      'Dataverse Valid'));
  await addAttr('p3f_buildplan', memoAttr('p3f_acceptancecriteria',  'Acceptance Criteria'));
  await addAttr('p3f_buildplan', picklistAttr('p3f_status', 'Status', 'p3f_buildplanstatus', 'ApplicationRequired'));
  await addAttr('p3f_buildplan', strAttr('p3f_prurl',    'PR URL', 500));
  await addAttr('p3f_buildplan', strAttr('p3f_branch',   'Branch', 200));
  await addAttr('p3f_buildplan', intAttr('p3f_deliberationrounds', 'Deliberation Rounds'));
  await addAttr('p3f_buildplan', boolAttr('p3f_consensusreached',   'Consensus Reached'));
  await addAttr('p3f_buildplan', decimalAttr('p3f_estimationdiscrepancy', 'Estimation Discrepancy'));
  await addAttr('p3f_buildplan', memoAttr('p3f_securityreviewjson', 'Security Review (JSON)'));
  await addAttr('p3f_buildplan', memoAttr('p3f_testspecsjson',      'Test Specs (JSON)'));
  await addAttr('p3f_buildplan', decimalAttr('p3f_finalhoursestimate','Final Hours Estimate'));
  await addAttr('p3f_buildplan', dtAttr('p3f_approvedon', 'Approved On'));

  // p3f_qareport
  await addAttr('p3f_qareport', boolAttr('p3f_passed',           'Passed'));
  await addAttr('p3f_qareport', memoAttr('p3f_failuresummary',   'Failure Summary'));
  await addAttr('p3f_qareport', intAttr('p3f_retrycount',        'Retry Count'));
  await addAttr('p3f_qareport', dtAttr('p3f_signedoffon',        'Signed Off On'));

  // p3f_offer
  await addAttr('p3f_offer', memoAttr('p3f_exclusions',  'Exclusions'));
  await addAttr('p3f_offer', moneyAttr('p3f_price',      'Price', 'ApplicationRequired'));
  await addAttr('p3f_offer', decimalAttr('p3f_hours',    'Hours'));
  await addAttr('p3f_offer', strAttr('p3f_timeline',     'Timeline', 200));
  await addAttr('p3f_offer', picklistAttr('p3f_status',  'Status', 'p3f_offerstatus', 'ApplicationRequired'));
  await addAttr('p3f_offer', intAttr('p3f_revision',     'Revision'));
  await addAttr('p3f_offer', memoAttr('p3f_customercomment', 'Customer Comment'));
  await addAttr('p3f_offer', dtAttr('p3f_expireson',     'Expires On'));
  await addAttr('p3f_offer', boolAttr('p3f_clarificationpending', 'Clarification Pending'));

  // p3f_deployrecord
  await addAttr('p3f_deployrecord', dtAttr('p3f_deployedon',           'Deployed On'));
  await addAttr('p3f_deployrecord', strAttr('p3f_deployedby',          'Deployed By', 200));
  await addAttr('p3f_deployrecord', memoAttr('p3f_paflowsactivated',   'PA Flows Activated'));
  await addAttr('p3f_deployrecord', strAttr('p3f_codeappversion',      'Code App Version', 50));
  await addAttr('p3f_deployrecord', memoAttr('p3f_dataversechanges',   'Dataverse Changes'));
  await addAttr('p3f_deployrecord', memoAttr('p3f_copilottopics',      'Copilot Topics'));
  await addAttr('p3f_deployrecord', memoAttr('p3f_snapshot_pa',        'Snapshot — PA Flows'));
  await addAttr('p3f_deployrecord', memoAttr('p3f_snapshot_dv',        'Snapshot — Dataverse'));
  await addAttr('p3f_deployrecord', strAttr('p3f_snapshot_codeapp_version', 'Snapshot — Code App Version', 50));
  await addAttr('p3f_deployrecord', memoAttr('p3f_snapshot_cs',        'Snapshot — Copilot Studio'));
  await addAttr('p3f_deployrecord', picklistAttr('p3f_targetenv',      'Target Environment', 'p3f_deployenvironment'));
  await addAttr('p3f_deployrecord', memoAttr('p3f_releasenotesjson',   'Release Notes (JSON)'));
  await addAttr('p3f_deployrecord', memoAttr('p3f_requirementschanged','Requirements Changed'));

  // p3f_rollbackrecord
  await addAttr('p3f_rollbackrecord', dtAttr('p3f_triggeredon',           'Triggered On'));
  await addAttr('p3f_rollbackrecord', memoAttr('p3f_componentsrolledback','Components Rolled Back'));
  await addAttr('p3f_rollbackrecord', picklistAttr('p3f_result',          'Result', 'p3f_rollbackresult'));

  // p3f_billingrecord
  await addAttr('p3f_billingrecord', moneyAttr('p3f_agreedprice', 'Agreed Price'));
  await addAttr('p3f_billingrecord', picklistAttr('p3f_tickettype', 'Ticket Type', 'p3f_tickettype'));
  await addAttr('p3f_billingrecord', dtAttr('p3f_resolvedon', 'Resolved On'));
  await addAttr('p3f_billingrecord', boolAttr('p3f_invoiced', 'Invoiced'));

  // p3f_trusthistory
  await addAttr('p3f_trusthistory', picklistAttr('p3f_tierbefore', 'Tier Before', 'p3f_autonomytier'));
  await addAttr('p3f_trusthistory', picklistAttr('p3f_tierafter',  'Tier After',  'p3f_autonomytier'));

  // p3f_retryqueue
  await addAttr('p3f_retryqueue', memoAttr('p3f_payloadjson', 'Payload (JSON)'));
  await addAttr('p3f_retryqueue', intAttr('p3f_retrycount',   'Retry Count'));
  await addAttr('p3f_retryqueue', dtAttr('p3f_nextretry',     'Next Retry'));
  await addAttr('p3f_retryqueue', memoAttr('p3f_lasterror',   'Last Error'));
  await addAttr('p3f_retryqueue', picklistAttr('p3f_status',  'Status', 'p3f_retryqueuestatus', 'ApplicationRequired'));

  // p3f_agentprompt
  await addAttr('p3f_agentprompt', intAttr('p3f_version',         'Version'));
  await addAttr('p3f_agentprompt', memoAttr('p3f_systemprompt',   'System Prompt'));
  await addAttr('p3f_agentprompt', memoAttr('p3f_userprompttemplate','User Prompt Template'));
  await addAttr('p3f_agentprompt', strAttr('p3f_model',           'Model', 100));
  await addAttr('p3f_agentprompt', boolAttr('p3f_active',         'Active'));
  await addAttr('p3f_agentprompt', memoAttr('p3f_notes',          'Notes'));

  // p3f_agentconversation
  await addAttr('p3f_agentconversation', strAttr('p3f_fromagent',  'From Agent', 200));
  await addAttr('p3f_agentconversation', strAttr('p3f_toagent',    'To Agent', 200));
  await addAttr('p3f_agentconversation', picklistAttr('p3f_messagetype','Message Type', 'p3f_agentmessagetype'));
  await addAttr('p3f_agentconversation', intAttr('p3f_round',      'Round'));
  await addAttr('p3f_agentconversation', boolAttr('p3f_resolved',  'Resolved'));

  // p3f_apprequirement
  await addAttr('p3f_apprequirement', memoAttr('p3f_featuredescription','Feature Description'));
  await addAttr('p3f_apprequirement', picklistAttr('p3f_status',  'Status', 'p3f_apprequirementstatus', 'ApplicationRequired'));
  await addAttr('p3f_apprequirement', picklistAttr('p3f_sourcetype','Source Type', 'p3f_apprequirementsource', 'ApplicationRequired'));
  await addAttr('p3f_apprequirement', memoAttr('p3f_sourcedocument','Source Document'));
  await addAttr('p3f_apprequirement', intAttr('p3f_version',      'Version'));
  await addAttr('p3f_apprequirement', strAttr('p3f_tags',         'Tags', 500));
  await addAttr('p3f_apprequirement', dtAttr('p3f_deprecatedon',  'Deprecated On'));

  // p3f_dataretentionpolicy
  await addAttr('p3f_dataretentionpolicy', intAttr('p3f_retentionperiodmonths','Retention Period (Months)'));
  await addAttr('p3f_dataretentionpolicy', boolAttr('p3f_anonymiseonexpiry',   'Anonymise On Expiry'));
  await addAttr('p3f_dataretentionpolicy', boolAttr('p3f_deleteonexpiry',      'Delete On Expiry'));
  await addAttr('p3f_dataretentionpolicy', boolAttr('p3f_legalhold',           'Legal Hold'));

  // p3f_componentlock
  await addAttr('p3f_componentlock', strAttr('p3f_ticketid', 'Ticket ID', 100));
  await addAttr('p3f_componentlock', dtAttr('p3f_lockedat',  'Locked At'));

  // ── Step 4: Relationships ────────────────────────────────────────
  if (skipRelationships) {
    console.log('\n[4/6] Skipping relationships (already created).');
  } else {
  console.log('\n[4/6] Creating relationships (lookups)…');

  // project → client
  await createRel(makeRelationship('p3f_client_project', 'p3f_client', 'p3f_project', 'p3f_clientid', 'Client', 'ApplicationRequired'));
  // app → project
  await createRel(makeRelationship('p3f_project_app', 'p3f_project', 'p3f_app', 'p3f_projectid', 'Project', 'ApplicationRequired'));
  // ratecard → client (nullable = global default)
  await createRel(makeRelationship('p3f_client_ratecard', 'p3f_client', 'p3f_ratecard', 'p3f_clientid', 'Client'));
  // app → ratecard (override)
  await createRel(makeRelationship('p3f_ratecard_app', 'p3f_ratecard', 'p3f_app', 'p3f_ratecardid', 'Rate Card'));
  // ticket → client
  await createRel(makeRelationship('p3f_client_ticket', 'p3f_client', 'p3f_ticket', 'p3f_clientid', 'Client', 'ApplicationRequired'));
  // ticket → app
  await createRel(makeRelationship('p3f_app_ticket', 'p3f_app', 'p3f_ticket', 'p3f_appid', 'App', 'ApplicationRequired'));
  // ticketmessage → ticket
  await createRel(makeRelationship('p3f_ticket_ticketmessage', 'p3f_ticket', 'p3f_ticketmessage', 'p3f_ticketid', 'Ticket', 'ApplicationRequired'));
  // requirement → ticket
  await createRel(makeRelationship('p3f_ticket_requirement', 'p3f_ticket', 'p3f_requirement', 'p3f_ticketid', 'Ticket', 'ApplicationRequired'));
  // architectplan → ticket
  await createRel(makeRelationship('p3f_ticket_architectplan', 'p3f_ticket', 'p3f_architectplan', 'p3f_ticketid', 'Ticket', 'ApplicationRequired'));
  // buildplan → ticket
  await createRel(makeRelationship('p3f_ticket_buildplan', 'p3f_ticket', 'p3f_buildplan', 'p3f_ticketid', 'Ticket', 'ApplicationRequired'));
  // buildplan → architectplan
  await createRel(makeRelationship('p3f_architectplan_buildplan', 'p3f_architectplan', 'p3f_buildplan', 'p3f_architectplanid', 'Architect Plan', 'ApplicationRequired'));
  // qareport → ticket
  await createRel(makeRelationship('p3f_ticket_qareport', 'p3f_ticket', 'p3f_qareport', 'p3f_ticketid', 'Ticket', 'ApplicationRequired'));
  // offer → ticket
  await createRel(makeRelationship('p3f_ticket_offer', 'p3f_ticket', 'p3f_offer', 'p3f_ticketid', 'Ticket', 'ApplicationRequired'));
  // deployrecord → ticket
  await createRel(makeRelationship('p3f_ticket_deployrecord', 'p3f_ticket', 'p3f_deployrecord', 'p3f_ticketid', 'Ticket', 'ApplicationRequired'));
  // rollbackrecord → ticket
  await createRel(makeRelationship('p3f_ticket_rollbackrecord', 'p3f_ticket', 'p3f_rollbackrecord', 'p3f_ticketid', 'Ticket', 'ApplicationRequired'));
  // billingrecord → ticket
  await createRel(makeRelationship('p3f_ticket_billingrecord', 'p3f_ticket', 'p3f_billingrecord', 'p3f_ticketid', 'Ticket', 'ApplicationRequired'));
  // billingrecord → client
  await createRel(makeRelationship('p3f_client_billingrecord', 'p3f_client', 'p3f_billingrecord', 'p3f_clientid', 'Client', 'ApplicationRequired'));
  // billingrecord → offer
  await createRel(makeRelationship('p3f_offer_billingrecord', 'p3f_offer', 'p3f_billingrecord', 'p3f_offerid', 'Offer'));
  // trusthistory → client
  await createRel(makeRelationship('p3f_client_trusthistory', 'p3f_client', 'p3f_trusthistory', 'p3f_clientid', 'Client', 'ApplicationRequired'));
  // trusthistory → ticket
  await createRel(makeRelationship('p3f_ticket_trusthistory', 'p3f_ticket', 'p3f_trusthistory', 'p3f_ticketid', 'Ticket'));
  // retryqueue → ticket
  await createRel(makeRelationship('p3f_ticket_retryqueue', 'p3f_ticket', 'p3f_retryqueue', 'p3f_ticketid', 'Ticket', 'ApplicationRequired'));
  // agentconversation → ticket
  await createRel(makeRelationship('p3f_ticket_agentconversation', 'p3f_ticket', 'p3f_agentconversation', 'p3f_ticketid', 'Ticket', 'ApplicationRequired'));
  // apprequirement → app
  await createRel(makeRelationship('p3f_app_apprequirement', 'p3f_app', 'p3f_apprequirement', 'p3f_appid', 'App', 'ApplicationRequired'));
  // apprequirement → ticket (source ticket)
  await createRel(makeRelationship('p3f_ticket_apprequirement', 'p3f_ticket', 'p3f_apprequirement', 'p3f_sourceticketid', 'Source Ticket'));
  // dataretentionpolicy → client
  await createRel(makeRelationship('p3f_client_dataretentionpolicy', 'p3f_client', 'p3f_dataretentionpolicy', 'p3f_clientid', 'Client', 'ApplicationRequired'));
  // componentlock → ticket
  await createRel(makeRelationship('p3f_ticket_componentlock', 'p3f_ticket', 'p3f_componentlock', 'p3f_ticketref', 'Ticket'));

  // Self-referential lookups on ticket (duplicate of, assigned manager) — added as extra attributes
  await safeRun('Self-ref: ticket → ticket (duplicate of)', () =>
    dvFetch('POST', `/RelationshipDefinitions`, {
      '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata',
      SchemaName: 'p3f_ticket_duplicateof',
      ReferencedEntity: 'p3f_ticket',
      ReferencingEntity: 'p3f_ticket',
      CascadeConfiguration: {
        Assign: 'NoCascade', Delete: 'RemoveLink', Merge: 'NoCascade',
        Reparent: 'NoCascade', Share: 'NoCascade', Unshare: 'NoCascade',
      },
      Lookup: {
        '@odata.type': 'Microsoft.Dynamics.CRM.LookupAttributeMetadata',
        SchemaName: 'p3f_duplicateof',
        LogicalName: 'p3f_duplicateof',
        DisplayName: lbl('Duplicate Of'),
        Description: lbl(''),
        RequiredLevel: req('None'),
      },
    })
  );

  } // end if (!skipRelationships)

  // ── Step 5: Publish all ──────────────────────────────────────────
  console.log('\n[5/6] Publishing all customizations…');
  await safeRun('PublishAllXml', () =>
    dvFetch('POST', '/PublishAllXml', {})
  );

  // ── Step 6: Seed data ────────────────────────────────────────────
  console.log('\n[6/6] Seeding initial data…');

  // Client
  const client = await safeRun('Client: P3 Internal', () =>
    dvFetch('POST', '/p3f_clients', {
      p3f_name: 'P3 Internal',
      p3f_autonomytier: 1,
      p3f_defaultlanguage: 2,
      p3f_active: true,
      p3f_onboardingcomplete: true,
    })
  );

  // Project (needs client ID)
  let projectId = null;
  if (client) {
    const clientId = client?.location?.match(/\(([^)]+)\)/)?.[1];
    if (clientId) {
      const project = await safeRun('Project: P3 Forge Platform', () =>
        dvFetch('POST', '/p3f_projects', {
          p3f_name: 'P3 Forge Platform',
          p3f_techstack: 'Power Apps Code App · Dataverse · TypeScript · Power Automate',
          p3f_status: 1,
          'p3f_clientid@odata.bind': `/p3f_clients(${clientId})`,
        })
      );
      projectId = project?.location?.match(/\(([^)]+)\)/)?.[1];

      if (projectId) {
        await safeRun('App: P3 Forge Manager App', () =>
          dvFetch('POST', '/p3f_apps', {
            p3f_name: 'P3 Forge Manager App',
            p3f_publishedversion: '1.0.0',
            'p3f_projectid@odata.bind': `/p3f_projects(${projectId})`,
          })
        );
      }

      // Data retention policy
      await safeRun('Data Retention: P3 Internal default', () =>
        dvFetch('POST', '/p3f_dataretentionpolicies', {
          p3f_name: 'P3 Internal Default',
          p3f_retentionperiodmonths: 24,
          p3f_anonymiseonexpiry: true,
          p3f_deleteonexpiry: false,
          p3f_legalhold: false,
          'p3f_clientid@odata.bind': `/p3f_clients(${clientId})`,
        })
      );
    }
  }

  // Global rate cards (no client = global default)
  const ratecards = [
    { p3f_label: 'Bug — Small',             p3f_tickettype: 100, p3f_complexity: 1, p3f_baseprice: 400,   p3f_basehours: 3   },
    { p3f_label: 'Bug — Medium',            p3f_tickettype: 100, p3f_complexity: 2, p3f_baseprice: 900,   p3f_basehours: 8   },
    { p3f_label: 'Bug — Large',             p3f_tickettype: 100, p3f_complexity: 3, p3f_baseprice: 2000,  p3f_basehours: 20  },
    { p3f_label: 'Bug — XL',               p3f_tickettype: 100, p3f_complexity: 4, p3f_baseprice: 4000,  p3f_basehours: 40  },
    { p3f_label: 'Change Request — Small',  p3f_tickettype: 200, p3f_complexity: 1, p3f_baseprice: 800,   p3f_basehours: 6   },
    { p3f_label: 'Change Request — Medium', p3f_tickettype: 200, p3f_complexity: 2, p3f_baseprice: 2400,  p3f_basehours: 20  },
    { p3f_label: 'Change Request — Large',  p3f_tickettype: 200, p3f_complexity: 3, p3f_baseprice: 5500,  p3f_basehours: 45  },
    { p3f_label: 'Change Request — XL',     p3f_tickettype: 200, p3f_complexity: 4, p3f_baseprice: 12000, p3f_basehours: 100 },
  ];
  for (const rc of ratecards) {
    await seedRecord('p3f_ratecards', rc, `Rate Card: ${rc.p3f_label}`);
  }

  // Agent prompts
  const agents = [
    'intake-agent', 'requirement-agent', 'assessment-agent', 'architect-agent',
    'pa-expert-agent', 'codeapp-expert-agent', 'dataverse-expert-agent',
    'offer-generator', 'qa-agent', 'duplicate-detector',
  ];
  for (const name of agents) {
    await seedRecord('p3f_agentprompts', {
      p3f_agentname: name,
      p3f_version: 1,
      p3f_model: name === 'duplicate-detector' ? 'gpt-4o-mini' : 'gpt-4o',
      p3f_active: true,
    }, `Agent prompt: ${name}`);
  }

  console.log('\n═══════════════════════════════════');
  console.log('✅ Provisioning complete!');
  console.log('   Open https://org2d99840c.crm.dynamics.com to verify tables in Power Apps maker portal.');
  console.log('   Tables are in the default solution. Add to P3Forge_v1 solution manually if needed.');
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message);
  process.exit(1);
});
