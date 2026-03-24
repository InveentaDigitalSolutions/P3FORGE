import React, { useState, useMemo } from 'react';
import {
  makeStyles,
  tokens,
  Dropdown,
  Option,
  Text,
  Spinner,
} from '@fluentui/react-components';
import { useTickets } from '../hooks/useTickets';
import TicketCard from '../components/TicketCard';
import { STATUS, STATUS_LABELS, type StatusCode } from '../api/types';

const useStyles = makeStyles({
  toolbar: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalL,
    alignItems: 'center',
  },
  board: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    overflowX: 'auto',
    paddingBottom: tokens.spacingVerticalM,
  },
  column: {
    minWidth: '280px',
    maxWidth: '320px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalS,
  },
  columnHeader: {
    padding: tokens.spacingVerticalS,
    fontWeight: tokens.fontWeightSemibold,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    marginBottom: tokens.spacingVerticalS,
  },
});

const KANBAN_COLUMNS: { label: string; statuses: StatusCode[] }[] = [
  { label: 'Intake',        statuses: [STATUS.SUBMITTED, STATUS.STRUCTURING, STATUS.CONFIRMING] },
  { label: 'Confirmed',     statuses: [STATUS.CONFIRMED, STATUS.ASSESSED] },
  { label: 'Design',        statuses: [STATUS.SPECIALIST_REVIEW] },
  { label: 'Offer',         statuses: [STATUS.OFFER_SENT, STATUS.OFFER_ACCEPTED] },
  { label: 'Gate 1',        statuses: [STATUS.GATE1_PENDING] },
  { label: 'Building',      statuses: [STATUS.IN_DEVELOPMENT] },
  { label: 'QA / UAT',      statuses: [STATUS.QA_REVIEW, STATUS.QA_FAILED, STATUS.UAT_PENDING] },
  { label: 'Gate 2',        statuses: [STATUS.GATE2_PENDING] },
  { label: 'Deployed',      statuses: [STATUS.DEPLOYED, STATUS.CLOSED] },
];

export default function KanbanBoard() {
  const styles = useStyles();
  const [clientFilter, setClientFilter] = useState<string>('all');
  const { tickets, loading } = useTickets();

  const filtered = useMemo(() => {
    if (clientFilter === 'all') return tickets;
    return tickets.filter(t => t._p3f_clientid_value === clientFilter);
  }, [tickets, clientFilter]);

  if (loading) return <Spinner label="Loading tickets..." />;

  return (
    <div>
      <div className={styles.toolbar}>
        <Text weight="semibold" size={500}>Ticket Board</Text>
        <Dropdown
          placeholder="All clients"
          value={clientFilter === 'all' ? 'All clients' : clientFilter}
          onOptionSelect={(_, data) => setClientFilter(data.optionValue ?? 'all')}
        >
          <Option value="all">All clients</Option>
        </Dropdown>
      </div>
      <div className={styles.board}>
        {KANBAN_COLUMNS.map(col => {
          const colTickets = filtered.filter(t => col.statuses.includes(t.p3f_status));
          return (
            <div key={col.label} className={styles.column}>
              <div className={styles.columnHeader}>
                {col.label} ({colTickets.length})
              </div>
              {colTickets.map(ticket => (
                <TicketCard key={ticket.p3f_ticketid} ticket={ticket} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
