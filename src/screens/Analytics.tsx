import React from 'react';
import { Text, tokens } from '@fluentui/react-components';

export default function Analytics() {
  return (
    <div>
      <Text weight="semibold" size={500} block style={{ marginBottom: tokens.spacingVerticalL }}>
        Analytics
      </Text>
      <Text>Revenue, SLA compliance, ticket volume, and feedback ratings will be displayed here.</Text>
    </div>
  );
}
