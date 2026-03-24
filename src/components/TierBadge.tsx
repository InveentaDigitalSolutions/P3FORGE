import React from 'react';
import { Badge } from '@fluentui/react-components';
import { TIER_LABELS } from '../api/types';

interface Props {
  tier: number;
}

function tierColor(tier: number): 'informative' | 'warning' | 'success' {
  switch (tier) {
    case 1: return 'informative';
    case 2: return 'warning';
    case 3: return 'success';
    default: return 'informative';
  }
}

export default function TierBadge({ tier }: Props) {
  return (
    <Badge color={tierColor(tier)} appearance="filled">
      {TIER_LABELS[tier] ?? `Tier ${tier}`}
    </Badge>
  );
}
