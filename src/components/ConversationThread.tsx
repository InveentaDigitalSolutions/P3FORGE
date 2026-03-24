import React, { useEffect, useState } from 'react';
import { makeStyles, tokens, Text, Card, Badge } from '@fluentui/react-components';
import { getTicketMessages } from '../api/dataverse';
import type { P3FTicketMessage } from '../api/types';

const useStyles = makeStyles({
  thread: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    maxHeight: '500px',
    overflowY: 'auto',
  },
  message: {
    padding: tokens.spacingVerticalS,
  },
  meta: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalXS,
  },
});

interface Props {
  ticketId: string;
}

export default function ConversationThread({ ticketId }: Props) {
  const styles = useStyles();
  const [messages, setMessages] = useState<P3FTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTicketMessages(ticketId).then(setMessages).finally(() => setLoading(false));
  }, [ticketId]);

  if (loading) return <Text>Loading conversation...</Text>;
  if (messages.length === 0) return <Text>No messages yet.</Text>;

  return (
    <div className={styles.thread}>
      {messages.map(msg => (
        <Card key={msg.p3f_messageid} className={styles.message}>
          <div className={styles.meta}>
            <Badge appearance="outline">{String(msg.p3f_sender)}</Badge>
            <Text size={200}>
              {msg.p3f_createdon ? new Date(msg.p3f_createdon).toLocaleString() : ''}
            </Text>
          </div>
          <Text style={{ whiteSpace: 'pre-wrap' }}>{msg.p3f_content}</Text>
        </Card>
      ))}
    </div>
  );
}
