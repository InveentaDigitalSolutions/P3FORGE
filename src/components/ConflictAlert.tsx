import React from 'react';
import { MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import type { P3FTicket } from '../api/types';

interface Props {
  ticket: P3FTicket;
}

export default function ConflictAlert({ ticket }: Props) {
  if (!ticket.p3f_hasmergeconflict) return null;

  return (
    <MessageBar intent="warning" style={{ marginBottom: 12 }}>
      <MessageBarBody>
        <MessageBarTitle>Merge Conflict</MessageBarTitle>
        This ticket's PR has a merge conflict. Resolve the conflict manually or re-trigger the build agent with the updated main branch.
      </MessageBarBody>
    </MessageBar>
  );
}
