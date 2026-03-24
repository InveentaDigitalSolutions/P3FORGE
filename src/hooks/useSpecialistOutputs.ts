import { useState, useEffect } from 'react';
import { getArchitectPlan, getBuildPlan, getAgentConversations } from '../api/dataverse';
import type { P3FArchitectPlan, P3FBuildPlan, P3FAgentConversation } from '../api/types';

export function useSpecialistOutputs(ticketId: string) {
  const [architectPlan, setArchitectPlan] = useState<P3FArchitectPlan | null>(null);
  const [buildPlan, setBuildPlan] = useState<P3FBuildPlan | null>(null);
  const [deliberationLog, setDeliberationLog] = useState<P3FAgentConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getArchitectPlan(ticketId),
      getBuildPlan(ticketId),
      getAgentConversations(ticketId),
    ]).then(([arch, bp, delib]) => {
      if (!cancelled) {
        setArchitectPlan(arch);
        setBuildPlan(bp);
        setDeliberationLog(delib);
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticketId]);

  return { architectPlan, buildPlan, deliberationLog, loading };
}
