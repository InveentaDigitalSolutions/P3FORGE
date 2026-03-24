import React, { useState } from 'react';
import {
  Tab,
  TabList,
  SelectTabEvent,
  SelectTabData,
  Badge,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  Board24Regular,
  Warning24Regular,
  Checkmark24Regular,
  Rocket24Regular,
  People24Regular,
  DataBarVertical24Regular,
  Settings24Regular,
  ArrowUndo24Regular,
  ChatMultiple24Regular,
} from '@fluentui/react-icons';
import { useGateNotifications } from './hooks/useGateNotifications';
import { useTokenProvider } from './hooks/useTokenProvider';
import KanbanBoard from './screens/KanbanBoard';
import EscalationQueue from './screens/EscalationQueue';
import Gate1Review from './screens/Gate1Review';
import Gate2Review from './screens/Gate2Review';
import ClientList from './screens/ClientList';
import Analytics from './screens/Analytics';
import Config from './screens/Config';
import RollbackPanel from './screens/RollbackPanel';
import Intake from './screens/Intake';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#00002d',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: `0 ${tokens.spacingHorizontalL}`,
    borderBottom: '1px solid #2a2a6a',
    backgroundColor: '#0a0a3a',
    minHeight: '52px',
    flexShrink: 0,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginRight: tokens.spacingHorizontalXL,
    userSelect: 'none',
    flexShrink: 0,
  },
  logoMark: {
    height: '26px',
    width: 'auto',
    display: 'block',
    flexShrink: 0,
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  logoForge: {
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '0.12em',
    color: '#fafafa',
    fontFamily: "'Inter', sans-serif",
    lineHeight: 1,
  },
  logoSub: {
    fontSize: '9px',
    fontWeight: '500',
    letterSpacing: '0.08em',
    color: '#6a6a8a',
    fontFamily: "'Inter', sans-serif",
    lineHeight: 1,
    textTransform: 'uppercase' as const,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: tokens.spacingHorizontalL,
  },
});

type Screen = 'intake' | 'kanban' | 'escalation' | 'gate1' | 'gate2' | 'clients' | 'analytics' | 'config' | 'rollback';

export default function App() {
  const styles = useStyles();
  const [screen, setScreen] = useState<Screen>('intake');
  const { gate1, gate2, escalated } = useGateNotifications();
  useTokenProvider();

  const onTabSelect = (_: SelectTabEvent, data: SelectTabData) => {
    setScreen(data.value as Screen);
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <img src="/p3-logo.svg" alt="P3" className={styles.logoMark} />
          <div className={styles.logoText}>
            <span className={styles.logoForge}>P3 FORGE</span>
            <span className={styles.logoSub}>P3 Cloud Solutions Germany</span>
          </div>
        </div>
        <TabList selectedValue={screen} onTabSelect={onTabSelect}>
          <Tab value="intake" icon={<ChatMultiple24Regular />}>Intake</Tab>
          <Tab value="kanban" icon={<Board24Regular />}>Board</Tab>
          <Tab value="escalation" icon={<Warning24Regular />}>
            Escalations {escalated.length > 0 && <Badge appearance="filled" color="danger">{escalated.length}</Badge>}
          </Tab>
          <Tab value="gate1" icon={<Checkmark24Regular />}>
            Gate 1 {gate1.length > 0 && <Badge appearance="filled" color="important">{gate1.length}</Badge>}
          </Tab>
          <Tab value="gate2" icon={<Rocket24Regular />}>
            Gate 2 {gate2.length > 0 && <Badge appearance="filled" color="important">{gate2.length}</Badge>}
          </Tab>
          <Tab value="clients" icon={<People24Regular />}>Clients</Tab>
          <Tab value="analytics" icon={<DataBarVertical24Regular />}>Analytics</Tab>
          <Tab value="config" icon={<Settings24Regular />}>Config</Tab>
          <Tab value="rollback" icon={<ArrowUndo24Regular />}>Rollback</Tab>
        </TabList>
      </div>
      <div className={styles.content}>
        {screen === 'intake' && <Intake />}
        {screen === 'kanban' && <KanbanBoard />}
        {screen === 'escalation' && <EscalationQueue />}
        {screen === 'gate1' && <Gate1Review />}
        {screen === 'gate2' && <Gate2Review />}
        {screen === 'clients' && <ClientList />}
        {screen === 'analytics' && <Analytics />}
        {screen === 'config' && <Config />}
        {screen === 'rollback' && <RollbackPanel />}
      </div>
    </div>
  );
}
