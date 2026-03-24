import React, { useState, useEffect, useRef } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Textarea,
  Input,
  Spinner,
  Badge,
  Field,
} from '@fluentui/react-components';
import { Send24Regular, Checkmark24Filled, ArrowCounterclockwise24Regular, Key24Regular, Rocket24Regular } from '@fluentui/react-icons';
import {
  sendIntakeMessage,
  isRequirementConfirmed,
  extractRequirementJson,
  GREETING,
  type IntakeMessage,
} from '../api/claudeIntake';
import { getClients, getApps, createTicket } from '../api/dataverse';
import type { P3FClient, P3FApp } from '../api/types';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 52px)',
    maxWidth: '760px',
    margin: '0 auto',
    width: '100%',
  },

  // ── Header ────────────────────────────────────────────────────
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalM} 0`,
    borderBottom: '1px solid #2a2a6a',
    flexShrink: 0,
  },
  agentLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  agentDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#dbff55',
    flexShrink: 0,
    boxShadow: '0 0 6px #dbff55',
  },

  // ── Messages ──────────────────────────────────────────────────
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: `${tokens.spacingVerticalL} 0`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    scrollbarWidth: 'thin',
    scrollbarColor: '#2a2a6a transparent',
  },

  bubbleWrapAgent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
  },
  bubbleWrapUser: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },

  bubbleMeta: {
    fontSize: tokens.fontSizeBase100,
    color: '#6a6a8a',
    paddingLeft: '2px',
    paddingRight: '2px',
  },

  bubbleAgent: {
    maxWidth: '82%',
    backgroundColor: '#12124a',
    border: '1px solid #2a2a6a',
    color: '#fafafa',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderRadius: '16px',
    borderBottomLeftRadius: '4px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: '1.6',
    fontSize: tokens.fontSizeBase300,
  },
  bubbleUser: {
    maxWidth: '82%',
    backgroundColor: '#1a1a5a',
    border: '1px solid #3a3a8a',
    color: '#fafafa',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderRadius: '16px',
    borderBottomRightRadius: '4px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: '1.6',
    fontSize: tokens.fontSizeBase300,
  },

  // ── Confirmed state ───────────────────────────────────────────
  confirmedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    backgroundColor: 'rgba(219, 255, 85, 0.08)',
    border: '1px solid rgba(219, 255, 85, 0.25)',
    borderRadius: '12px',
  },
  confirmedTitle: {
    color: '#dbff55',
    fontWeight: '600',
  },

  // ── Typing indicator ─────────────────────────────────────────
  typing: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: '#6a6a8a',
    fontSize: tokens.fontSizeBase200,
    padding: `0 2px`,
  },

  // ── Input area ────────────────────────────────────────────────
  inputArea: {
    padding: `${tokens.spacingVerticalM} 0 ${tokens.spacingVerticalL}`,
    flexShrink: 0,
    borderTop: '1px solid #2a2a6a',
  },
  inputRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-end',
  },

  // ── Empty / API key missing ───────────────────────────────────
  notice: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: tokens.spacingVerticalM,
    textAlign: 'center',
    color: '#6a6a8a',
  },
  noticeAccent: {
    color: '#dbff55',
    fontWeight: '600',
  },
  keyForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    width: '100%',
    maxWidth: '480px',
  },
  keyInput: {
    backgroundColor: '#12124a',
    color: '#fafafa',
    fontFamily: "'Courier New', monospace",
    fontSize: '13px',
  },
});

interface Bubble {
  role: 'user' | 'assistant';
  content: string;
}

const LS_KEY = 'p3forge_anthropic_key';

function getStoredKey(): string {
  const fromEnv = process.env.REACT_APP_ANTHROPIC_API_KEY ?? '';
  if (fromEnv && fromEnv !== 'REPLACE_WITH_YOUR_ANTHROPIC_API_KEY') return fromEnv;
  return localStorage.getItem(LS_KEY) ?? '';
}

export default function Intake() {
  const styles = useStyles();
  const [apiKey, setApiKey] = useState(getStoredKey);
  const [keyInput, setKeyInput] = useState('');
  const [bubbles, setBubbles] = useState<Bubble[]>([
    { role: 'assistant', content: GREETING },
  ]);
  const [history, setHistory] = useState<IntakeMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [requirement, setRequirement] = useState<object | null>(null);
  const [clients, setClients] = useState<P3FClient[]>([]);
  const [apps, setApps] = useState<P3FApp[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const saveKey = () => {
    const k = keyInput.trim();
    if (!k) return;
    localStorage.setItem(LS_KEY, k);
    setApiKey(k);
    setKeyInput('');
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [bubbles, thinking]);

  // Load clients + apps from Dataverse when requirement is confirmed
  useEffect(() => {
    if (!confirmed) return;
    Promise.all([getClients(), getApps()])
      .then(([c, a]) => { setClients(c); setApps(a); })
      .catch(() => { /* Dataverse not yet provisioned — silent */ });
  }, [confirmed]);

  const reset = () => {
    setBubbles([{ role: 'assistant', content: GREETING }]);
    setHistory([]);
    setInput('');
    setThinking(false);
    setError(null);
    setConfirmed(false);
    setRequirement(null);
    setClients([]);
    setApps([]);
    setSubmitting(false);
    setSubmitted(false);
    setSubmitError(null);
  };

  const submitToPipeline = async () => {
    if (!requirement || submitting || submitted) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const req = requirement as Record<string, unknown>;
      // Use first available client + app, or fall back to empty (ticket will need manual assignment)
      const clientId = clients[0]?.p3f_clientid ?? '';
      const appId    = apps[0]?.p3f_appid ?? '';
      if (!clientId || !appId) {
        throw new Error('No client or app found in Dataverse. Run the provisioning script first.');
      }
      await createTicket({
        clientId,
        appId,
        rawMessage: (req.plain_summary as string) ?? JSON.stringify(req),
        submittedBy: 'P3 Forge Manager',
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || thinking || confirmed) return;
    setInput('');
    setError(null);

    const userBubble: Bubble = { role: 'user', content: text };
    setBubbles(prev => [...prev, userBubble]);
    setThinking(true);

    try {
      const reply = await sendIntakeMessage(history, text, apiKey);
      const newHistory: IntakeMessage[] = [
        ...history,
        { role: 'user', content: text },
        { role: 'assistant', content: reply },
      ];
      setHistory(newHistory);
      setBubbles(prev => [...prev, { role: 'assistant', content: reply }]);

      if (isRequirementConfirmed(reply)) {
        setConfirmed(true);
        setRequirement(extractRequirementJson(reply));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setThinking(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!apiKey) {
    return (
      <div className={styles.root}>
        <div className={styles.notice}>
          <Key24Regular style={{ color: '#dbff55', width: 32, height: 32 }} />
          <Text size={500} weight="semibold" className={styles.noticeAccent}>
            Anthropic API key required
          </Text>
          <Text size={300} style={{ color: '#a1a1aa', maxWidth: 480 }}>
            Paste your Anthropic API key below to activate the intake agent.
            It is stored only in your browser's localStorage.
          </Text>
          <div className={styles.keyForm}>
            <Field label={<span style={{ color: '#a1a1aa', fontSize: 13 }}>API Key</span>}>
              <Input
                className={styles.keyInput}
                type="password"
                placeholder="Paste your API key…"
                value={keyInput}
                onChange={(_, d) => setKeyInput(d.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveKey(); }}
              />
            </Field>
            <Button
              appearance="primary"
              onClick={saveKey}
              disabled={!keyInput.trim()}
            >
              Save and continue
            </Button>
          </div>
          <Text size={200} style={{ color: '#6a6a8a' }}>
            Get your key at console.anthropic.com → API Keys
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.chatHeader}>
        <div className={styles.agentLabel}>
          <div className={styles.agentDot} />
          <Text weight="semibold" size={300} style={{ color: '#fafafa' }}>
            P3 Forge Intake Agent
          </Text>
          <Badge appearance="tint" size="small" style={{ color: '#a1a1aa', borderColor: '#2a2a6a' }}>
            claude-opus-4-6 · Azure
          </Badge>
        </div>
        <Button
          appearance="subtle"
          size="small"
          icon={<ArrowCounterclockwise24Regular />}
          onClick={reset}
          style={{ color: '#6a6a8a' }}
        >
          New conversation
        </Button>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {bubbles.map((b, i) => (
          <div key={i} className={b.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapAgent}>
            <Text className={styles.bubbleMeta}>
              {b.role === 'user' ? 'You' : 'Intake Agent'}
            </Text>
            <div className={b.role === 'user' ? styles.bubbleUser : styles.bubbleAgent}>
              {b.content.replace(/REQUIREMENT_CONFIRMED[\s\S]*/, '').trim() || b.content}
            </div>
          </div>
        ))}

        {thinking && (
          <div className={styles.bubbleWrapAgent}>
            <Text className={styles.bubbleMeta}>Intake Agent</Text>
            <div className={styles.typing}>
              <Spinner size="tiny" />
              <span>thinking…</span>
            </div>
          </div>
        )}

        {confirmed && (
          <div className={styles.confirmedBanner}>
            <Checkmark24Filled style={{ color: '#dbff55', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <Text block weight="semibold" className={styles.confirmedTitle}>
                Requirement confirmed
              </Text>
              {submitted ? (
                <Text size={200} style={{ color: '#dbff55' }}>
                  Ticket created in Dataverse. The pipeline agents will take it from here.
                </Text>
              ) : (
                <Text size={200} style={{ color: '#a1a1aa' }}>
                  Ready to submit to the pipeline.
                  {clients.length === 0 && ' (Dataverse not yet provisioned — run scripts/provision.mjs first)'}
                </Text>
              )}
              {submitError && (
                <Text block size={200} style={{ color: '#ff7f6a', marginTop: '4px' }}>
                  {submitError}
                </Text>
              )}
            </div>
            {!submitted && (
              <Button
                appearance="primary"
                icon={submitting ? <Spinner size="tiny" /> : <Rocket24Regular />}
                onClick={submitToPipeline}
                disabled={submitting || clients.length === 0}
                style={{ flexShrink: 0 }}
              >
                Submit to pipeline
              </Button>
            )}
          </div>
        )}

        {error && (
          <Text size={200} style={{ color: '#ff7f6a', padding: '0 2px' }}>
            {error}
          </Text>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!confirmed && (
        <div className={styles.inputArea}>
          <div className={styles.inputRow}>
            <Textarea
              style={{ flex: 1, backgroundColor: '#12124a', borderColor: '#2a2a6a', color: '#fafafa' }}
              placeholder="Describe your request… (Enter to send, Shift+Enter for new line)"
              value={input}
              onChange={(_, d) => { setInput(d.value); setError(null); }}
              onKeyDown={onKeyDown}
              disabled={thinking}
              resize="vertical"
            />
            <Button
              appearance="primary"
              icon={<Send24Regular />}
              onClick={send}
              disabled={!input.trim() || thinking}
              style={{ alignSelf: 'flex-end' }}
            >
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
