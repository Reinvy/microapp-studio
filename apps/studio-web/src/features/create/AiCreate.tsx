'use client';

/**
 * Magic Create (SCR-04, AI mode).
 *
 * One 2000-character prompt, four suggestion chips, `Cmd/Ctrl+Enter` to submit.
 * The flow is deliberately two-step: a plan is shown first and nothing is
 * generated until the user presses **Buat aplikasi**. Without an endpoint/model/
 * key the panel offers **Atur AI** and **Gunakan template**; offline it also
 * offers **Mulai kosong**.
 */

import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { Alert, Button, Card, PromptInput, SuggestionChip } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { AiClient, AiClientError, isAiConfigured, type AiConfig, type AiPlan } from '@/features/ai/client';
import { MAX_PROMPT_LENGTH, PROMPT_SUGGESTIONS, checkPrompt, validateAiDraft } from '@/features/ai/plan';
import { readAiKey } from '@/features/ai/vault';
import { PlanReview } from './PlanReview';

export interface AiCreateProps {
  creating: boolean;
  onUseTemplate: () => void;
  onBlank: () => void;
  onOpenAiSettings: () => void;
  onCreate: (input: { plan: AiPlan; root: ReturnType<typeof validateAiDraft>['root'] }) => void;
}

type Phase = 'prompt' | 'reviewing' | 'generating' | 'invalid';

export function AiCreate({ creating, onUseTemplate, onBlank, onOpenAiSettings, onCreate }: AiCreateProps): ReactElement {
  const host = useHost();
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState<Phase>('prompt');
  const [plan, setPlan] = useState<AiPlan | null>(null);
  const [error, setError] = useState<'E-CREATE-001' | 'E-CREATE-002' | 'E-CREATE-003' | null>(null);

  const configured = useMemo(
    () =>
      isAiConfigured({
        endpoint: host.prefs.aiEndpoint,
        model: host.prefs.aiModel,
        apiKey: host.prefs.aiKeyLast4.length > 0 ? 'stored' : '',
      }),
    [host.prefs.aiEndpoint, host.prefs.aiKeyLast4, host.prefs.aiModel],
  );

  const clientFor = useCallback(
    async (config: AiConfig): Promise<AiClient> => new AiClient(config, { allowLocalHttp: process.env.NODE_ENV !== 'production' }),
    [],
  );

  const submitPrompt = useCallback(async () => {
    const check = checkPrompt(prompt);
    if (!check.ok) {
      setError('E-CREATE-001');
      return;
    }
    setError(null);
    if (!configured) {
      setError('E-CREATE-002');
      return;
    }
    if (!host.ready || !host.db || !host.workspace || !host.identityService) {
      setError('E-CREATE-002');
      return;
    }
    try {
      const apiKey = await readAiKey(host.db, host.workspace.id, host.identityService);
      const client = await clientFor({
        endpoint: host.prefs.aiEndpoint,
        model: host.prefs.aiModel,
        apiKey,
      });
      const next = await client.plan(prompt);
      setPlan(next);
      setPhase('reviewing');
    } catch (failure) {
      setError(failure instanceof AiClientError ? failure.code : 'E-CREATE-003');
    }
  }, [clientFor, configured, host.db, host.identityService, host.prefs.aiEndpoint, host.prefs.aiModel, host.ready, host.workspace, prompt]);

  const generate = useCallback(async () => {
    if (!plan || !host.db || !host.workspace || !host.identityService) return;
    setPhase('generating');
    try {
      const apiKey = await readAiKey(host.db, host.workspace.id, host.identityService);
      const client = await clientFor({
        endpoint: host.prefs.aiEndpoint,
        model: host.prefs.aiModel,
        apiKey,
      });
      const nodes = await client.draft(plan);
      const validation = validateAiDraft(nodes);
      if (!validation.ok || !validation.root) {
        // Keep the plan: the user can retry manually or take a fallback.
        setError('E-CREATE-003');
        setPhase('invalid');
        return;
      }
      onCreate({ plan, root: validation.root });
    } catch (failure) {
      setError(failure instanceof AiClientError ? failure.code : 'E-CREATE-003');
      setPhase('invalid');
    }
  }, [clientFor, host.db, host.identityService, host.prefs.aiEndpoint, host.prefs.aiModel, host.workspace, onCreate, plan]);

  return (
    <div className="mads-stack">
      {error ? (
        <Alert
          tone="error"
          title={host.t(`errors.${error}`)}
          actions={
            <>
              <Button size="sm" variant="secondary" onClick={onOpenAiSettings}>
                {host.t('settings.groups.ai.title')}
              </Button>
              <Button size="sm" variant="secondary" onClick={onUseTemplate}>
                {host.t('create.fallbackTemplate')}
              </Button>
              {!host.online ? (
                <Button size="sm" variant="ghost" onClick={onBlank}>
                  {host.t('create.fallbackBlank')}
                </Button>
              ) : null}
            </>
          }
        >
          {error === 'E-CREATE-002' ? host.t('create.fallbackSettings') : null}
        </Alert>
      ) : null}

      <PromptInput
        label={host.t('create.promptLabel')}
        value={prompt}
        onChange={setPrompt}
        onSubmit={() => void submitPrompt()}
        maxLength={MAX_PROMPT_LENGTH}
        placeholder={host.t('create.promptPlaceholder')}
        description={host.t('create.promptHint')}
        disabled={creating || phase === 'generating'}
      />

      <div className="mads-cluster" role="group" aria-label={host.t('create.promptLabel')}>
        {PROMPT_SUGGESTIONS.map((suggestion) => (
          <SuggestionChip key={suggestion} pressed={prompt === suggestion} onClick={() => setPrompt(suggestion)}>
            {suggestion}
          </SuggestionChip>
        ))}
      </div>

      {phase === 'reviewing' || phase === 'generating' || phase === 'invalid' ? (
        plan ? (
          <PlanReview
            plan={plan}
            generating={phase === 'generating' || creating}
            onGenerate={() => void generate()}
            onRetry={() => void generate()}
            retryDisabled={phase !== 'invalid'}
            onFallbackTemplate={onUseTemplate}
            onFallbackBlank={onBlank}
          />
        ) : null
      ) : (
        <Card>
          <div className="mads-row">
            <Button onClick={() => void submitPrompt()} loading={creating}>
              {host.t('create.submit')}
            </Button>
            <Button variant="ghost" onClick={onUseTemplate}>
              {host.t('create.fallbackTemplate')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
