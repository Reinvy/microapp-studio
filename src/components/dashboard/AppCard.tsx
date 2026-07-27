'use client';

import { useRouter } from 'next/navigation';
import {
  Play,
  Pencil,
  Trash2,
  Type,
  Hash,
  List,
  CheckSquare,
  AlignLeft,
  Calendar,
  Sliders,
  ToggleLeft,
  File,
} from 'lucide-react';
import type { AppSchema, FieldType } from '@/types/schema';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface AppCardProps {
  app: AppSchema;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
}

const fieldTypeIcons: Record<FieldType, React.ReactNode> = {
  text: <Type className="h-3 w-3" />,
  number: <Hash className="h-3 w-3" />,
  select: <List className="h-3 w-3" />,
  checkbox: <CheckSquare className="h-3 w-3" />,
  textarea: <AlignLeft className="h-3 w-3" />,
  date: <Calendar className="h-3 w-3" />,
  file: <File className="h-3 w-3" />,
  slider: <Sliders className="h-3 w-3" />,
  toggle: <ToggleLeft className="h-3 w-3" />,
  heading: <Type className="h-3 w-3" />,
  paragraph: <AlignLeft className="h-3 w-3" />,
  divider: <Type className="h-3 w-3" />,
  spacer: <Type className="h-3 w-3" />,
  image: <File className="h-3 w-3" />,
  card: <Type className="h-3 w-3" />,
  button: <Type className="h-3 w-3" />,
  color: <Hash className="h-3 w-3" />,
  email: <Type className="h-3 w-3" />,
  phone: <Hash className="h-3 w-3" />,
  url: <Type className="h-3 w-3" />,
  rating: <List className="h-3 w-3" />,
};

const fieldTypeLabels: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  select: 'Select',
  checkbox: 'Checkbox',
  textarea: 'Textarea',
  date: 'Date',
  file: 'File',
  slider: 'Slider',
  toggle: 'Toggle',
  heading: 'Heading',
  paragraph: 'Paragraph',
  divider: 'Divider',
  spacer: 'Spacer',
  image: 'Image',
  card: 'Card',
  button: 'Button',
  color: 'Color',
  email: 'Email',
  phone: 'Phone',
  url: 'URL',
  rating: 'Rating',
};

function getFieldTypeCounts(fields: AppSchema['fields']): Map<FieldType, number> {
  const counts = new Map<FieldType, number>();
  for (const f of fields) {
    counts.set(f.type, (counts.get(f.type) || 0) + 1);
  }
  return counts;
}

export default function AppCard({ app, onDelete, onRun }: AppCardProps) {
  const router = useRouter();
  const fieldCounts = getFieldTypeCounts(app.fields);
  const totalFields = app.fields.length;
  const logicCount = app.logicNodes?.length || 0;

  return (
    <Card className="group relative overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-border/50 hover:border-border">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold truncate flex-1">
            {app.name}
          </CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => router.push(`/builder?id=${app.id}`)}
              aria-label={`Edit ${app.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(app.id)}
              aria-label={`Delete ${app.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs line-clamp-2 min-h-[2em]">
          {app.description || 'No description'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex flex-wrap gap-1.5">
          {Array.from(fieldCounts.entries()).slice(0, 5).map(([type, count]) => (
            <Badge
              key={type}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-normal"
            >
              {fieldTypeIcons[type]}
              {fieldTypeLabels[type]}
              {count > 1 && <span className="text-muted-foreground">×{count}</span>}
            </Badge>
          ))}
          {Array.from(fieldCounts.keys()).length > 5 && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-normal">
              +{Array.from(fieldCounts.keys()).length - 5} more
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>{totalFields} field{totalFields !== 1 ? 's' : ''}</span>
          {logicCount > 0 && <span>{logicCount} node{logicCount !== 1 ? 's' : ''}</span>}
          <span>{formatDate(app.updatedAt)}</span>
        </div>
        <Button
          variant="default"
          size="sm"
          className="h-7 px-3 text-xs gap-1.5"
          onClick={() => onRun(app.id)}
        >
          <Play className="h-3 w-3 fill-current" />
          Run
        </Button>
      </CardFooter>
    </Card>
  );
}
