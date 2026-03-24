import React from 'react';
import { Card, CardHeader, Text, Badge, Button, tokens } from '@fluentui/react-components';
import type { P3FOffer } from '../api/types';

interface Props {
  offer: P3FOffer;
}

export default function OfferCard({ offer }: Props) {
  return (
    <Card>
      <CardHeader
        header={<Text weight="semibold">Offer</Text>}
        description={
          <Badge color={offer.p3f_status === 3 ? 'success' : 'warning'}>
            {offer.p3f_status === 3 ? 'Accepted' : 'Pending'}
          </Badge>
        }
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
        {offer.p3f_scopesummary && <Text>{offer.p3f_scopesummary}</Text>}
        {offer.p3f_price !== undefined && (
          <Text weight="semibold">Price: €{offer.p3f_price.toFixed(2)}</Text>
        )}
        {offer.p3f_revision !== undefined && (
          <Text size={200}>Revision: {offer.p3f_revision}</Text>
        )}
      </div>
    </Card>
  );
}
