import React from 'react';
import { Text, Badge, tokens } from '@fluentui/react-components';
import type { P3FTicket } from '../api/types';
import { getTimeRemaining, isSLABreached } from '../utils/sla';

interface Props {
  ticket: P3FTicket;
}

export default function SLACountdown({ ticket }: Props) {
  if (!ticket.p3f_sladue) return null;

  const breached = isSLABreached(ticket);
  const remaining = getTimeRemaining(ticket);

  if (breached) {
    return <Badge color="danger">SLA Breached</Badge>;
  }

  return (
    <Text size={200} style={{ color: remaining.hours < 2 ? tokens.colorPaletteRedForeground1 : tokens.colorNeutralForeground3 }}>
      SLA: {remaining.hours}h {remaining.minutes}m remaining
    </Text>
  );
}
