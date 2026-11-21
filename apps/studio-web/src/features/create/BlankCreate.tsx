'use client';

/**
 * Blank create (SCR-04, blank mode).
 *
 * Three layout cards — Form, List, Dashboard — each producing one valid screen
 * with sample data. The card is a radio group so the choice is keyboard
 * reachable without a separate confirm step.
 */

import { useState, type ReactElement } from 'react';
import { Button, Card, RadioGroup } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { BLANK_LAYOUTS, type BlankLayout } from '@/features/studio/types';

export interface BlankCreateProps {
  creating: boolean;
  onCreate: (layout: BlankLayout) => void;
}

export function BlankCreate({ creating, onCreate }: BlankCreateProps): ReactElement {
  const host = useHost();
  const [layout, setLayout] = useState<BlankLayout>('form');

  const bodyKey: Record<BlankLayout, string> = {
    form: 'create.blankFormBody',
    list: 'create.blankListBody',
    dashboard: 'create.blankDashboardBody',
  };
  const labelKey: Record<BlankLayout, string> = {
    form: 'create.blankForm',
    list: 'create.blankList',
    dashboard: 'create.blankDashboard',
  };

  return (
    <div className="mads-stack">
      <RadioGroup
        label={host.t('create.blankTitle')}
        name="blank-layout"
        value={layout}
        onChange={(next) => setLayout(next as BlankLayout)}
        options={BLANK_LAYOUTS.map((id) => ({
          value: id,
          label: host.t(labelKey[id]),
          description: host.t(bodyKey[id]),
        }))}
      />
      <Card>
        <p>{host.t(bodyKey[layout])}</p>
      </Card>
      <div className="mads-row">
        <Button onClick={() => onCreate(layout)} loading={creating} disabled={host.ephemeral || !host.ready}>
          {host.t('home.actionCreate')}
        </Button>
      </div>
    </div>
  );
}
