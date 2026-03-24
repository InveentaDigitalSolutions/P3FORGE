import { useState, useEffect } from 'react';
import { getClient } from '../api/dataverse';
import type { P3FClient } from '../api/types';

export function useClientTier(clientId: string | undefined) {
  const [client, setClient] = useState<P3FClient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    getClient(clientId)
      .then(setClient)
      .catch(() => setClient(null))
      .finally(() => setLoading(false));
  }, [clientId]);

  return { client, tier: client?.p3f_autonomytier ?? 1, loading };
}
