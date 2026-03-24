// P3 Forge — SLA utilities

import { CRITICALITY } from '../api/types';
import type { P3FTicket } from '../api/types';

const SLA_HOURS: Record<number, { gate1: number; total: number }> = {
  [CRITICALITY.P1]: { gate1: 1,  total: 24 },
  [CRITICALITY.P2]: { gate1: 4,  total: 72 },   // 3 business days ≈ 72h
  [CRITICALITY.P3]: { gate1: 24, total: 336 },   // 2 weeks ≈ 336h
  [CRITICALITY.P4]: { gate1: 48, total: Infinity },
};

export function getSLAConfig(criticality: number) {
  return SLA_HOURS[criticality] ?? SLA_HOURS[CRITICALITY.P3];
}

export function isSLABreached(ticket: P3FTicket): boolean {
  if (!ticket.p3f_sladue) return false;
  return new Date(ticket.p3f_sladue) < new Date();
}

export function getTimeRemaining(ticket: P3FTicket): { hours: number; minutes: number; breached: boolean } {
  if (!ticket.p3f_sladue) return { hours: 0, minutes: 0, breached: false };
  const diff = new Date(ticket.p3f_sladue).getTime() - Date.now();
  const breached = diff < 0;
  const absDiff = Math.abs(diff);
  return {
    hours: Math.floor(absDiff / (1000 * 60 * 60)),
    minutes: Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60)),
    breached,
  };
}
