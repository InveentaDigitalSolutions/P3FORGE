import React, { useState } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Spinner,
  Button,
  Card,
  CardHeader,
  Textarea,
} from '@fluentui/react-components';
import { Rocket24Regular, ArrowUndo24Regular } from '@fluentui/react-icons';
import { useGateNotifications } from '../hooks/useGateNotifications';
import { triggerGate2Approve, triggerRollback } from '../api/powerautomate';
import { getQAReport } from '../api/dataverse';
import QAReportCard from '../components/QAReportCard';
import ConflictAlert from '../components/ConflictAlert';
import type { P3FQAReport } from '../api/types';

const useStyles = makeStyles({
  container: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  actions: { display: 'flex', gap: tokens.spacingHorizontalM, marginTop: tokens.spacingVerticalM },
});

export default function Gate2Review() {
  const styles = useStyles();
  const { gate2, loading, refresh } = useGateNotifications();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [qaReport, setQAReport] = useState<P3FQAReport | null>(null);

  const selectedTicket = gate2.find(t => t.p3f_ticketid === selectedTicketId);

  const handleSelect = async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    const report = await getQAReport(ticketId);
    setQAReport(report);
  };

  const handleDeploy = async () => {
    if (!selectedTicket) return;
    await triggerGate2Approve(selectedTicket.p3f_ticketid);
    refresh();
  };

  const handleRollback = async () => {
    if (!selectedTicket) return;
    await triggerRollback(selectedTicket.p3f_ticketid, 'Manager initiated rollback from Gate 2');
    refresh();
  };

  if (loading) return <Spinner label="Loading Gate 2 tickets..." />;

  return (
    <div className={styles.container}>
      <Text weight="semibold" size={500}>Gate 2 — Deploy Review</Text>

      {gate2.length === 0 && <Text>No tickets pending Gate 2 approval.</Text>}

      <div style={{ display: 'flex', gap: tokens.spacingHorizontalL }}>
        <div style={{ minWidth: 250, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
          {gate2.map(t => (
            <Card
              key={t.p3f_ticketid}
              selected={t.p3f_ticketid === selectedTicketId}
              onClick={() => handleSelect(t.p3f_ticketid)}
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
            <ConflictAlert ticket={selectedTicket} />
            {qaReport && <QAReportCard report={qaReport} />}

            <div className={styles.actions}>
              <Button appearance="primary" icon={<Rocket24Regular />} onClick={handleDeploy}>
                Deploy to Production
              </Button>
              <Button appearance="secondary" icon={<ArrowUndo24Regular />} onClick={handleRollback}>
                Rollback
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
