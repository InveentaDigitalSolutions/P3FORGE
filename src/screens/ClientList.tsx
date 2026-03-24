import React, { useState, useEffect } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Spinner,
  Card,
  CardHeader,
  Badge,
} from '@fluentui/react-components';
import { getClients } from '../api/dataverse';
import TierBadge from '../components/TierBadge';
import type { P3FClient } from '../api/types';

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: tokens.spacingHorizontalM,
  },
});

export default function ClientList() {
  const styles = useStyles();
  const [clients, setClients] = useState<P3FClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClients().then(setClients).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading clients..." />;

  return (
    <div>
      <Text weight="semibold" size={500} block style={{ marginBottom: tokens.spacingVerticalL }}>
        Clients
      </Text>
      <div className={styles.grid}>
        {clients.map(client => (
          <Card key={client.p3f_clientid}>
            <CardHeader
              header={<Text weight="semibold">{client.p3f_name}</Text>}
              description={
                <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'center' }}>
                  <TierBadge tier={client.p3f_autonomytier} />
                  {client.p3f_onboardingcomplete
                    ? <Badge appearance="filled" color="success">Onboarded</Badge>
                    : <Badge appearance="filled" color="warning">Setup pending</Badge>
                  }
                </div>
              }
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
