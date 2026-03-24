import { useState, useEffect, useCallback } from 'react';
import { getAllActiveTickets, getTicketsByClient } from '../api/dataverse';
import type { P3FTicket } from '../api/types';

export function useTickets(clientId?: string) {
  const [tickets, setTickets] = useState<P3FTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = clientId
        ? await getTicketsByClient(clientId)
        : await getAllActiveTickets();
      setTickets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { tickets, loading, error, refresh };
}
