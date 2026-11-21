'use client';

/**
 * Plan review step for Magic Create.
 *
 * Shows exactly what the provider proposed — screens, data, actions — and asks
 * for one explicit confirmation before the second (generation) call. Fallbacks
 * stay visible so a bad plan never traps the user.
 */

import type { ReactElement } from 'react';
import { Button, Card, List } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import type { AiPlan } from '@/features/ai/client';

export interface PlanReviewProps {
  plan: AiPlan;
  generating: boolean;
  onGenerate: () => void;
  onRetry: () => void;
  retryDisabled: boolean;
  onFallbackTemplate: () => void;
  onFallbackBlank: () => void;
}

export function PlanReview({
  plan,
  generating,
  onGenerate,
  onRetry,
  retryDisabled,
  onFallbackTemplate,
  onFallbackBlank,
}: PlanReviewProps): ReactElement {
  const host = useHost();

  const section = (label: string, items: string[]): ReactElement => (
    <div>
      <h3>{label}</h3>
      {items.length === 0 ? (
        <p>{host.t('create.invalidPlan')}</p>
      ) : (
        <List label={label} items={items.map((item, index) => <span key={`${label}-${index}`}>{item}</span>)} />
      )}
    </div>
  );

  return (
    <Card title={host.t('create.planTitle')}>
      <div className="mads-stack">
        {section(host.t('create.planTitle'), plan.screens)}
        {section(host.t('settings.groups.data.title'), plan.data)}
        {section(host.t('home.contextMenuLabel'), plan.actions)}
        <div className="mads-row">
          <Button onClick={onGenerate} loading={generating}>
            {host.t('create.planApply')}
          </Button>
          <Button variant="secondary" onClick={onRetry} disabled={retryDisabled || generating}>
            {host.t('common.retry')}
          </Button>
          <Button variant="ghost" onClick={onFallbackTemplate}>
            {host.t('create.fallbackTemplate')}
          </Button>
          <Button variant="ghost" onClick={onFallbackBlank}>
            {host.t('create.fallbackBlank')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
