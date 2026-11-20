'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { AppSchema, FieldType } from '@/types/schema';
import { formatDate } from '@/lib/utils';
import { FieldTypeIcon, fieldLabels } from '@/lib/fieldMeta';
import { contentService } from '@/services/contentService';
import { formatCountTemplate, type AppCardCopy } from '@/db/contentRepo';

interface AppCardProps {
  app: AppSchema;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
}

// DB-driven card copy ('app-card-copy' via contentRepo) — fallback keeps
// first paint intact and mirrors the seeded defaults exactly.
const defaultCopy: AppCardCopy = {
  noDescription: 'No description',
  runLabel: 'Run',
  fieldSingular: 'field',
  fieldPlural: 'fields',
  nodeSingular: 'node',
  nodePlural: 'nodes',
  moreTemplate: '+{count} more',
};

function getFieldTypeCounts(fields: AppSchema['fields']): Map<FieldType, number> {
  const counts = new Map<FieldType, number>();
  for (const f of fields) {
    counts.set(f.type, (counts.get(f.type) || 0) + 1);
  }
  return counts;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export default function AppCard({ app, onDelete, onRun }: AppCardProps) {
  const router = useRouter();
  const [copy, setCopy] = useState<AppCardCopy>(defaultCopy);
  const fieldCounts = getFieldTypeCounts(app.fields);
  const totalFields = app.fields.length;
  const logicCount = app.logicNodes?.length || 0;

  useEffect(() => {
    // Load DB-driven card copy — falls back to the defaults above.
    // The content service caches per type, so all cards share one read.
    contentService.getContent<AppCardCopy>('app-card-copy').then((c) => {
      if (c) setCopy(c);
    }).catch(() => {});
  }, []);

  return (
    <div className="clay-card group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1">
      {/* Top row: name + actions */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-base font-semibold text-clay-foreground truncate flex-1">
          {app.name}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          <button
            className="clay-sm flex h-7 w-7 items-center justify-center bg-[#F5EDE5] text-clay-muted hover:text-clay-foreground"
            onClick={() => router.push(`/builder?id=${app.id}`)}
            aria-label={`Edit ${app.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="clay-sm flex h-7 w-7 items-center justify-center bg-[#FFD0D0] text-clay-muted hover:text-clay-foreground"
            onClick={() => onDelete(app.id)}
            aria-label={`Delete ${app.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-clay-muted line-clamp-2 min-h-[2em] mb-3">
        {app.description || copy.noDescription}
      </p>

      {/* Field type badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Array.from(fieldCounts.entries()).slice(0, 5).map(([type, count]) => (
          <span
            key={type}
            className="clay-sm inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-normal text-clay-foreground bg-[#F5EDE5]"
          >
            <FieldTypeIcon type={type} className="h-3 w-3" />
            {fieldLabels[type]}
            {count > 1 && <span className="text-clay-muted">×{count}</span>}
          </span>
        ))}
        {Array.from(fieldCounts.keys()).length > 5 && (
          <span className="clay-sm inline-flex items-center px-2 py-0.5 text-[10px] font-normal text-clay-muted bg-[#F5EDE5]">
            {formatCountTemplate(copy.moreTemplate, Array.from(fieldCounts.keys()).length - 5)}
          </span>
        )}
      </div>

      {/* Footer: meta + run button */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3 text-[10px] text-clay-muted">
          <span>{totalFields} {pluralize(totalFields, copy.fieldSingular, copy.fieldPlural)}</span>
          {logicCount > 0 && <span>{logicCount} {pluralize(logicCount, copy.nodeSingular, copy.nodePlural)}</span>}
          <span>{formatDate(app.updatedAt)}</span>
        </div>
        <button
          className="clay-button flex h-7 items-center gap-1.5 px-3 text-xs font-medium text-clay-foreground bg-[#C5E8F7]"
          onClick={() => onRun(app.id)}
        >
          <Play className="h-3 w-3 fill-current" />
          {copy.runLabel}
        </button>
      </div>
    </div>
  );
}
