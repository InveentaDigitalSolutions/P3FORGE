import React from 'react';
import { Card, CardHeader, Text, tokens } from '@fluentui/react-components';
import type { P3FRequirement } from '../api/types';

interface Props {
  requirement: P3FRequirement;
}

export default function RequirementCard({ requirement }: Props) {
  return (
    <Card>
      <CardHeader
        header={<Text weight="semibold">{requirement.p3f_plainlanguagesummary}</Text>}
      />
      <Text style={{ whiteSpace: 'pre-wrap' }}>{requirement.p3f_structuredjson}</Text>
      {requirement.p3f_included && (
        <div style={{ marginTop: tokens.spacingVerticalS }}>
          <Text weight="semibold" size={200}>Included:</Text>
          <Text style={{ whiteSpace: 'pre-wrap' }}>{requirement.p3f_included}</Text>
        </div>
      )}
      {requirement.p3f_effortestimate && (
        <Text size={200} style={{ marginTop: tokens.spacingVerticalXS }}>
          Effort: {requirement.p3f_effortestimate}
        </Text>
      )}
    </Card>
  );
}
