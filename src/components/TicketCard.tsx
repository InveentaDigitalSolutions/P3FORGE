import React from 'react';
import {
  makeStyles,
  tokens,
  Card,
  CardHeader,
  Badge,
  Text,
} from '@fluentui/react-components';
import type { P3FTicket } from '../api/types';
import {
  STATUS_LABELS,
  TICKET_TYPE_LABELS,
  CRITICALITY_LABELS,
  COMPLEXITY_LABELS,
} from '../api/types';

const useStyles = makeStyles({
  card: {
    marginBottom: tokens.spacingVerticalXS,
  },
  badges: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    flexWrap: 'wrap',
    marginTop: tokens.spacingVerticalXS,
  },
});

function criticalityColor(c?: number): 'danger' | 'important' | 'warning' | 'informative' {
  switch (c) {
    case 1: return 'danger';
    case 2: return 'important';
    case 3: return 'warning';
    default: return 'informative';
  }
}

interface TicketCardProps {
  ticket: P3FTicket;
  onClick?: () => void;
}

export default function TicketCard({ ticket, onClick }: TicketCardProps) {
  const styles = useStyles();

  return (
    <Card className={styles.card} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <CardHeader
        header={
          <Text weight="semibold" size={300}>
            {ticket.p3f_ticketid} — {ticket.p3f_title ?? 'Untitled'}
          </Text>
        }
      />
      <div className={styles.badges}>
        <Badge appearance="outline">{STATUS_LABELS[ticket.p3f_status]}</Badge>
        {ticket.p3f_tickettype !== undefined && (
          <Badge appearance="tint">{TICKET_TYPE_LABELS[ticket.p3f_tickettype]}</Badge>
        )}
        {ticket.p3f_criticality !== undefined && (
          <Badge color={criticalityColor(ticket.p3f_criticality)}>
            {CRITICALITY_LABELS[ticket.p3f_criticality]}
          </Badge>
        )}
        {ticket.p3f_complexity !== undefined && (
          <Badge appearance="ghost">{COMPLEXITY_LABELS[ticket.p3f_complexity]}</Badge>
        )}
      </div>
    </Card>
  );
}
