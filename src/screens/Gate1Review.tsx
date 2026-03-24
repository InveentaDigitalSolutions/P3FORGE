import React, { useState } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Spinner,
  Button,
  Card,
  CardHeader,
  Tab,
  TabList,
  SelectTabEvent,
  SelectTabData,
  Textarea,
} from '@fluentui/react-components';
import { Checkmark24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { useGateNotifications } from '../hooks/useGateNotifications';
import { useSpecialistOutputs } from '../hooks/useSpecialistOutputs';
import { approveBuildPlan, rejectBuildPlan } from '../api/dataverse';
import { triggerGate1Approve, triggerGate1Reject } from '../api/powerautomate';
import SpecialistOutputPanel from '../components/SpecialistOutputPanel';
import BuildPlanCard from '../components/BuildPlanCard';

const useStyles = makeStyles({
  container: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  ticketList: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  actions: { display: 'flex', gap: tokens.spacingHorizontalM, marginTop: tokens.spacingVerticalM },
});

export default function Gate1Review() {
  const styles = useStyles();
  const { gate1, loading, refresh } = useGateNotifications();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const selectedTicket = gate1.find(t => t.p3f_ticketid === selectedTicketId);
  const outputs = useSpecialistOutputs(selectedTicketId ?? '');

  const handleApprove = async () => {
    if (!selectedTicket || !outputs.buildPlan) return;
    await approveBuildPlan(outputs.buildPlan.p3f_buildplanid, '');
    await triggerGate1Approve(selectedTicket.p3f_ticketid, outputs.buildPlan.p3f_buildplanid);
    refresh();
  };

  const handleReject = async () => {
    if (!selectedTicket || !outputs.buildPlan) return;
    await rejectBuildPlan(outputs.buildPlan.p3f_buildplanid);
    await triggerGate1Reject(selectedTicket.p3f_ticketid, outputs.buildPlan.p3f_buildplanid, rejectReason);
    setRejectReason('');
    refresh();
  };

  if (loading) return <Spinner label="Loading Gate 1 tickets..." />;

  return (
    <div className={styles.container}>
      <Text weight="semibold" size={500}>Gate 1 — Build Plan Review</Text>

      {gate1.length === 0 && <Text>No tickets pending Gate 1 approval.</Text>}

      <div style={{ display: 'flex', gap: tokens.spacingHorizontalL }}>
        <div className={styles.ticketList} style={{ minWidth: 250 }}>
          {gate1.map(t => (
            <Card
              key={t.p3f_ticketid}
              selected={t.p3f_ticketid === selectedTicketId}
              onClick={() => setSelectedTicketId(t.p3f_ticketid)}
              style={{ cursor: 'pointer' }}
            >
              <CardHeader
                header={<Text weight="semibold">{t.p3f_ticketid}</Text>}
                description={t.p3f_title ?? 'Untitled'}
              />
            </Card>
          ))}
        </div>

        {selectedTicket && (
          <div style={{ flex: 1 }}>
            <TabList defaultSelectedValue="plan">
              <Tab value="plan">Build Plan</Tab>
              <Tab value="specialists">Specialist Outputs</Tab>
              <Tab value="deliberation">Deliberation Log</Tab>
            </TabList>

            {outputs.buildPlan && <BuildPlanCard buildPlan={outputs.buildPlan} />}
            {outputs.architectPlan && <SpecialistOutputPanel architectPlan={outputs.architectPlan} buildPlan={outputs.buildPlan} />}

            <div className={styles.actions}>
              <Button appearance="primary" icon={<Checkmark24Regular />} onClick={handleApprove}>
                Approve
              </Button>
              <Textarea
                placeholder="Rejection reason..."
                value={rejectReason}
                onChange={(_, d) => setRejectReason(d.value)}
                style={{ flex: 1 }}
              />
              <Button appearance="secondary" icon={<Dismiss24Regular />} onClick={handleReject}>
                Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
