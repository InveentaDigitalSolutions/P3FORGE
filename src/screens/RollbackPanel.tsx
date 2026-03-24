import React, { useState } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Input,
  Card,
} from '@fluentui/react-components';
import { triggerRollback } from '../api/powerautomate';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    maxWidth: '600px',
  },
});

export default function RollbackPanel() {
  const styles = useStyles();
  const [ticketId, setTicketId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleRollback = async () => {
    if (!ticketId || !reason) return;
    setSubmitting(true);
    try {
      await triggerRollback(ticketId, reason);
      setResult(`Rollback triggered for ${ticketId}`);
      setTicketId('');
      setReason('');
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Text size={500} weight="semibold">Rollback</Text>
      <Card>
        <Text>Enter the ticket ID and reason to trigger a one-click rollback.</Text>
        <Input
          placeholder="Ticket ID (e.g. T-0042)"
          value={ticketId}
          onChange={(_, d) => setTicketId(d.value)}
        />
        <Input
          placeholder="Reason for rollback"
          value={reason}
          onChange={(_, d) => setReason(d.value)}
        />
        <Button appearance="primary" onClick={handleRollback} disabled={submitting}>
          {submitting ? 'Rolling back...' : 'Trigger Rollback'}
        </Button>
        {result && <Text>{result}</Text>}
      </Card>
    </div>
  );
}
