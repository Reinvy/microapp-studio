'use client';

/** Template gallery card: preview, copy, and the one-click "Pakai" action. */

import type { ReactElement } from 'react';
import { Badge, Button, Card } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { permissionDefinition } from '@/features/permissions/catalog';
import type { TemplateDefinition } from './catalog';
import { TemplatePreview } from './preview';

export interface TemplateCardProps {
  template: TemplateDefinition;
  onUse: (template: TemplateDefinition) => void;
  onPreview: (template: TemplateDefinition) => void;
  using: boolean;
}

export function TemplateCard({ template, onUse, onPreview, using }: TemplateCardProps): ReactElement {
  const host = useHost();
  return (
    <Card title={template.name}>
      <div className="mads-stack">
        <p>{template.description}</p>
        <TemplatePreview root={template.nodes[0]} label={template.name} />
        <div className="mads-row">
          <Badge tone="info">{host.t(`templates.category${capitalize(template.category)}`)}</Badge>
          {template.permissions.map((permission) => (
            <Badge key={permission} tone="neutral">
              {permissionDefinition(permission, host.locale).label}
            </Badge>
          ))}
        </div>
        <div className="mads-row">
          <Button size="sm" onClick={() => onUse(template)} loading={using} disabled={host.ephemeral || !host.ready}>
            {host.t('templates.use')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onPreview(template)}>
            {host.t('templates.preview')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
