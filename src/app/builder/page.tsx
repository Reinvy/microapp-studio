'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, LayoutTemplate, SquarePen, Settings2 } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { microAppRepo } from '@/db/microAppRepo';
import { generateId } from '@/lib/utils';
import type { AppSchema, FieldType, FieldSchema } from '@/types/schema';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  closestCenter,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import Toolbar from '@/components/builder/Toolbar';
import ComponentPalette from '@/components/builder/ComponentPalette';
import Canvas, { CanvasFieldCard } from '@/components/builder/Canvas';
import PropertiesPanel from '@/components/builder/PropertiesPanel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ActivePanel = 'components' | 'canvas' | 'properties';

const TAB_ITEMS: { key: ActivePanel; label: string; icon: React.ReactNode }[] = [
  { key: 'components', label: 'Components', icon: <LayoutTemplate className="h-4 w-4" /> },
  { key: 'canvas', label: 'Canvas', icon: <SquarePen className="h-4 w-4" /> },
  { key: 'properties', label: 'Properties', icon: <Settings2 className="h-4 w-4" /> },
];

function BuilderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    setActiveApp,
    setLoading,
    isLoading,
    activeApp,
    addField,
    reorderFields,
  } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Responsive layout state
  const [activePanel, setActivePanel] = useState<ActivePanel>('canvas');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const appId = searchParams.get('id');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Check if this is a palette drop
      if (active.data.current?.type === 'component') {
        const fieldType = active.data.current?.fieldType as FieldType;
        if (fieldType && activeApp) {
          const newIndex = activeApp.fields.findIndex((f) => f.id === over.id);
          addField({
            type: fieldType,
            label: `New ${String(fieldType).charAt(0).toUpperCase() + String(fieldType).slice(1)}`,
          });
          if (newIndex >= 0) {
            reorderFields(activeApp.fields.length - 1, newIndex);
          }
        }
        return;
      }

      // Reorder existing fields
      const oldIndex = activeApp?.fields.findIndex((f) => f.id === active.id);
      const newIndex = activeApp?.fields.findIndex((f) => f.id === over.id);
      if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== -1 && newIndex !== -1) {
        reorderFields(oldIndex, newIndex);
      }
    },
    [activeApp, addField, reorderFields]
  );

  const loadApp = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (appId) {
        const app = await microAppRepo.getById(appId);
        if (app) {
          setActiveApp(app);
        } else {
          setError(`App with ID "${appId}" not found.`);
        }
      } else {
        const now = Date.now();
        const newApp: AppSchema = {
          id: generateId(),
          name: 'Untitled App',
          description: '',
          prompt: '',
          fields: [],
          logicNodes: [],
          layout: [],
          createdAt: now,
          updatedAt: now,
          version: 1,
        };
        setActiveApp(newApp);
      }
    } catch (err) {
      console.error('Failed to load app:', err);
      setError('Failed to load the app. Please try again.');
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [appId, setActiveApp, setLoading]);

  useEffect(() => {
    loadApp();
  }, [loadApp]);

  /** Build a preview field for the DragOverlay */
  const getDragOverlayField = (): FieldSchema | null => {
    if (!activeDragId || !activeApp) return null;
    // Check if it's a palette item
    if (activeDragId.startsWith('palette-')) {
      const fieldType = activeDragId.replace('palette-', '') as FieldType;
      return {
        id: 'overlay',
        type: fieldType,
        label: `New ${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)}`,
      };
    }
    // Existing field
    return activeApp.fields.find((f) => f.id === activeDragId) || null;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-clay-cream flex items-center justify-center">
        <div className="text-center max-w-sm clay p-8">
          <div className="w-16 h-16 rounded-2xl bg-clay-rose flex items-center justify-center mx-auto mb-4 shadow-inner">
            <AlertTriangle className="h-8 w-8 text-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2 text-foreground">Something went wrong</h2>
          <p className="text-sm mb-6 text-clay-muted">{error}</p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" onClick={() => router.push('/')}>
              Back to Dashboard
            </Button>
            <Button onClick={loadApp}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !initialized) {
    return (
      <div className="min-h-screen bg-clay-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 clay-sm p-6">
          <Loader2 className="h-8 w-8 animate-spin text-clay-purple" />
          <p className="text-sm text-clay-muted">
            {appId ? 'Loading app...' : 'Creating new app...'}
          </p>
        </div>
      </div>
    );
  }

  const dragOverlayField = getDragOverlayField();

  return (
    <div className="h-screen flex flex-col bg-clay-cream overflow-hidden">
      <Toolbar />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Desktop (≥768px): show all panels side by side */}
        {/* Mobile (<768px): show only active panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Component Palette — hidden on mobile unless active */}
          <div className={cn(
            'hidden md:flex',
            'md:w-64 md:flex-shrink-0'
          )}>
            <ComponentPalette />
          </div>
          <div className={cn(
            'md:hidden flex-1',
            activePanel !== 'components' && 'hidden'
          )}>
            <ComponentPalette />
          </div>

          {/* Canvas — always flex-1 on desktop, hidden on mobile unless active */}
          <div className={cn(
            'flex-1 min-w-0',
            'hidden md:block',
            activePanel === 'canvas' && 'md:block'
          )}>
            <Canvas />
          </div>
          <div className={cn(
            'md:hidden flex-1',
            activePanel !== 'canvas' && 'hidden'
          )}>
            <Canvas />
          </div>

          {/* Properties Panel — hidden on mobile unless active */}
          <div className={cn(
            'hidden md:flex',
            'md:w-72 md:flex-shrink-0'
          )}>
            <PropertiesPanel />
          </div>
          <div className={cn(
            'md:hidden flex-1',
            activePanel !== 'properties' && 'hidden'
          )}>
            <PropertiesPanel />
          </div>
        </div>

        <DragOverlay>
          {dragOverlayField && (
            <CanvasFieldCard field={dragOverlayField} />
          )}
        </DragOverlay>
      </DndContext>

      {/* Mobile tab bar (<768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex rounded-t-2xl border-t border-clay-border/30 bg-[var(--clay-card)] shadow-[0_-4px_12px_rgba(174,162,146,0.15)]">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActivePanel(tab.key)}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-medium transition-colors relative',
              activePanel === tab.key
                ? 'text-foreground'
                : 'text-clay-muted hover:text-foreground'
            )}
          >
            {activePanel === tab.key && (
              <span className="absolute -top-px left-1/4 right-1/4 h-0.5 rounded-full bg-[#D5B8F5]" />
            )}
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Spacer for mobile tab bar — push content up so it's not hidden behind the bar */}
      <div className="md:hidden h-14" />
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-clay-cream flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-clay-purple" />
            <p className="text-sm text-clay-muted">Loading builder...</p>
          </div>
        </div>
      }
    >
      <BuilderContent />
    </Suspense>
  );
}
