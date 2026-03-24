import React from 'react';
import { Card, CardHeader, Text, Badge, tokens } from '@fluentui/react-components';
import type { P3FBuildPlan } from '../api/types';

interface Props {
  buildPlan: P3FBuildPlan;
}

export default function BuildPlanCard({ buildPlan }: Props) {
  return (
    <Card>
      <CardHeader
        header={<Text weight="semibold">Build Plan</Text>}
        description={
          <Badge
            color={buildPlan.p3f_status === 3 ? 'success' : 'warning'}
          >
            {buildPlan.p3f_status === 3 ? 'Approved' : 'Pending'}
          </Badge>
        }
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
        {buildPlan.p3f_plansummary && (
          <div>
            <Text weight="semibold" size={200}>Plan Summary</Text>
            <Text style={{ whiteSpace: 'pre-wrap' }}>{buildPlan.p3f_plansummary}</Text>
          </div>
        )}
        {buildPlan.p3f_finalhoursestimate !== undefined && (
          <Text size={200}>Estimated Hours: {buildPlan.p3f_finalhoursestimate}</Text>
        )}
      </div>
    </Card>
  );
}
