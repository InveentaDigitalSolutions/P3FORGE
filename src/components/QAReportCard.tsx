import React, { useState, useEffect } from 'react';
import { Card, CardHeader, Text, Badge, tokens } from '@fluentui/react-components';
import { getQAReport } from '../api/dataverse';
import type { P3FQAReport } from '../api/types';

interface PropsWithReport {
  report: P3FQAReport;
  ticketId?: never;
}

interface PropsWithTicketId {
  ticketId: string;
  report?: never;
}

type Props = PropsWithReport | PropsWithTicketId;

export default function QAReportCard(props: Props) {
  const [report, setReport] = useState<P3FQAReport | null>(props.report ?? null);
  const [loading, setLoading] = useState(!props.report);

  useEffect(() => {
    if (props.ticketId && !props.report) {
      setLoading(true);
      getQAReport(props.ticketId).then(setReport).finally(() => setLoading(false));
    }
  }, [props.ticketId]);

  if (loading) return <Text>Loading QA report...</Text>;
  if (!report) return <Text>No QA report available.</Text>;

  return (
    <Card>
      <CardHeader
        header={<Text weight="semibold">QA Report</Text>}
        description={
          <Badge color={report.p3f_passed ? 'success' : 'danger'}>
            {report.p3f_passed ? 'PASS' : 'FAIL'}
          </Badge>
        }
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
        {report.p3f_criteriaresultsjson && (
          <Text style={{ whiteSpace: 'pre-wrap' }}>{report.p3f_criteriaresultsjson}</Text>
        )}
        {report.p3f_failuresummary && (
          <div>
            <Text weight="semibold" size={200}>Failure Summary:</Text>
            <Text>{report.p3f_failuresummary}</Text>
          </div>
        )}
      </div>
    </Card>
  );
}
