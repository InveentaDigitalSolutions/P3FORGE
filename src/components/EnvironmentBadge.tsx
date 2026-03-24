import React from 'react';
import { Badge } from '@fluentui/react-components';

interface Props {
  envUrl?: string;
}

export default function EnvironmentBadge({ envUrl }: Props) {
  const label = envUrl
    ? new URL(envUrl).hostname.split('.')[0]
    : 'unknown';

  return (
    <Badge appearance="outline" color="informative">
      {label}
    </Badge>
  );
}
