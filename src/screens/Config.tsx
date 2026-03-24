import React from 'react';
import { Text } from '@fluentui/react-components';

export default function Config() {
  return (
    <div>
      <Text size={500} weight="semibold" style={{ marginBottom: 16, display: 'block' }}>
        Configuration
      </Text>
      <Text>Client settings, app management, rate cards, retention policies, and onboarding checklists will be managed here.</Text>
    </div>
  );
}
