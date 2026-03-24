import React, { useEffect, useState } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Card,
  Badge,
  Spinner,
} from '@fluentui/react-components';
import { getRetryQueue } from '../api/dataverse';
import type { P3FRetryQueue } from '../api/types';

const useStyles = makeStyles({
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
});

export default function RetryQueuePanel() {
  const styles = useStyles();
  const [items, setItems] = useState<P3FRetryQueue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRetryQueue().then(setItems).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="tiny" label="Loading retry queue..." />;
  if (items.length === 0) return <Text>No items in retry queue.</Text>;

  return (
    <div className={styles.list}>
      {items.map(item => (
        <Card key={item.p3f_retryqueueid}>
          <Text weight="semibold">{item.p3f_agentname}</Text>
          <Text size={200}>Ticket: {item._p3f_ticketid_value}</Text>
          <div style={{ display: 'flex', gap: 8 }}>
            <Badge appearance="outline">Retries: {item.p3f_retrycount}</Badge>
            <Text size={200}>
              Next: {item.p3f_nextretry ? new Date(item.p3f_nextretry).toLocaleString() : 'N/A'}
            </Text>
          </div>
          {item.p3f_lasterror && <Text size={200}>Error: {item.p3f_lasterror}</Text>}
        </Card>
      ))}
    </div>
  );
}
