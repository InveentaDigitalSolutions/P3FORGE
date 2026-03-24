import { useState, useEffect, useCallback } from 'react';
import { getGate1Tickets, getGate2Tickets, getEscalatedTickets } from '../api/dataverse';
import type { P3FTicket } from '../api/types';

interface GateNotifications {
  gate1: P3FTicket[];
  gate2: P3FTicket[];
  escalated: P3FTicket[];
}

export function useGateNotifications() {
  const [data, setData] = useState<GateNotifications>({ gate1: [], gate2: [], escalated: [] });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [gate1, gate2, escalated] = await Promise.all([
        getGate1Tickets(),
        getGate2Tickets(),
        getEscalatedTickets(),
      ]);
      setData({ gate1, gate2, escalated });
    } catch {
      // Silently retry on next poll
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000); // poll every 30s
    return () => clearInterval(interval);
  }, [refresh]);

  return { ...data, loading, refresh };
}
