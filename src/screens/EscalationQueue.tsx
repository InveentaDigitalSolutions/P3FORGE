import React from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Spinner,
  Card,
  CardHeader,
  Badge,
} from '@fluentui/react-components';
import { useTickets } from '../hooks/useTickets';
import { STATUS } from '../api/types';
import TicketCard from '../components/TicketCard';
import SLACountdown from '../components/SLACountdown';
import RetryQueuePanel from '../components/RetryQueuePanel';

const useStyles = makeStyles({
  sections: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  section: {
    marginBottom: tokens.spacingVerticalL,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: tokens.spacingHorizontalM,
  },
});

export default function EscalationQueue() {
  const styles = useStyles();
  const { tickets, loading } = useTickets();

  if (loading) return <Spinner label="Loading escalations..." />;

  const escalated = tickets.filter(t => t.p3f_status === STATUS.ESCALATED);
  const p1Active = tickets.filter(t => t.p3f_criticality === 1 && t.p3f_status < STATUS.DEPLOYED);
  const lowConf = tickets.filter(t =>
    t.p3f_agentconfidence !== undefined && t.p3f_agentconfidence < 0.75 &&
    t.p3f_status < STATUS.DEPLOYED
  );

  return (
    <div className={styles.sections}>
      <Text weight="semibold" size={500}>Escalation Queue</Text>

      <div className={styles.section}>
        <Text weight="semibold" size={400}>
          P1 Critical <Badge appearance="filled" color="danger">{p1Active.length}</Badge>
        </Text>
        <div className={styles.grid}>
          {p1Active.map(t => (
            <div key={t.p3f_ticketid}>
              <TicketCard ticket={t} />
              <SLACountdown ticket={t} />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <Text weight="semibold" size={400}>
          Escalated <Badge appearance="filled" color="warning">{escalated.length}</Badge>
        </Text>
        <div className={styles.grid}>
          {escalated.map(t => <TicketCard key={t.p3f_ticketid} ticket={t} />)}
        </div>
      </div>

      <div className={styles.section}>
        <Text weight="semibold" size={400}>
          Low Confidence <Badge appearance="ghost">{lowConf.length}</Badge>
        </Text>
        <div className={styles.grid}>
          {lowConf.map(t => <TicketCard key={t.p3f_ticketid} ticket={t} />)}
        </div>
      </div>

      <div className={styles.section}>
        <Text weight="semibold" size={400}>Retry Queue</Text>
        <RetryQueuePanel />
      </div>
    </div>
  );
}
