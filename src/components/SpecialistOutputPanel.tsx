import React, { useState } from 'react';
import {
  makeStyles,
  tokens,
  TabList,
  Tab,
  Text,
  Card,
} from '@fluentui/react-components';
import type { P3FArchitectPlan, P3FBuildPlan } from '../api/types';

const useStyles = makeStyles({
  content: {
    marginTop: tokens.spacingVerticalM,
    whiteSpace: 'pre-wrap',
  },
});

interface Props {
  architectPlan: P3FArchitectPlan | null;
  buildPlan: P3FBuildPlan | null;
}

export default function SpecialistOutputPanel({ architectPlan, buildPlan }: Props) {
  const styles = useStyles();
  const [tab, setTab] = useState('architect');

  return (
    <div>
      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as string)}>
        <Tab value="architect">Architect</Tab>
        <Tab value="pa">PA Expert</Tab>
        <Tab value="codeapp">Code App Expert</Tab>
        <Tab value="dv">DV Expert</Tab>
      </TabList>
      <div className={styles.content}>
        {tab === 'architect' && (
          architectPlan ? (
            <Card>
              <Text weight="semibold">Components Affected</Text>
              <Text>{architectPlan.p3f_componentsaffected}</Text>
              <Text weight="semibold" style={{ marginTop: 8 }}>Approach</Text>
              <Text>{architectPlan.p3f_approach}</Text>
            </Card>
          ) : <Text>No architect plan available.</Text>
        )}
        {tab === 'pa' && (
          buildPlan ? (
            <Card>
              <Text weight="semibold">Power Automate Spec</Text>
              <Text>{buildPlan.p3f_paspecsjson ?? 'No PA spec'}</Text>
            </Card>
          ) : <Text>No PA spec available.</Text>
        )}
        {tab === 'codeapp' && (
          buildPlan ? (
            <Card>
              <Text weight="semibold">Code App Plan</Text>
              <Text>{buildPlan.p3f_codeappspecjson ?? 'No Code App spec'}</Text>
            </Card>
          ) : <Text>No Code App spec available.</Text>
        )}
        {tab === 'dv' && (
          buildPlan ? (
            <Card>
              <Text weight="semibold">Dataverse Changes</Text>
              <Text>{buildPlan.p3f_dataversespecjson ?? 'No DV spec'}</Text>
            </Card>
          ) : <Text>No DV spec available.</Text>
        )}
      </div>
    </div>
  );
}
