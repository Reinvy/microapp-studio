'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LayoutTemplate, SquarePen, Settings2 } from 'lucide-react';
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
import MobileTabBar, { type TabItem } from '@/components/builder/MobileTabBar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { goToDashboard } from '@/lib/navigation';
import { ClayLoader, ClayErrorCard } from '@/components/ui/clay-feedback';

type ActivePanel = 'components' | 'canvas' | 'properties';

const TAB_ITEMS: TabItem[] = [
  { key: 'components', label: 'Components', icon: <LayoutTemplate className="h-4 w-4" /> },
  { key: 'canvas', label: 'Canvas', icon: <SquarePen className="h-4 w-4" /> },
  { key: 'properties', label: 'Properties', icon: <Settings2 className="h-4 w-4" /> },
];

// Full literal class names so Tailwind can statically detect them.
const MD_DISPLAY: Record<'flex' | 'block', string> = {
  flex: 'md:flex',
  block: 'md:block',
};

/**
 * Responsive panel wrapper — desktop (≥768px) shows the panel side-by-side
 * with the given layout classes; mobile (<768px) shows only the panel
 * matching `activePanel` (the others are hidden behind the tab bar).
 */
function BuilderPanel({
  activePanel,
  panel,
  desktopClass,
  mdDisplay = 'flex',
  children,
}: {
  activePanel: ActivePanel;
  panel: ActivePanel;
  desktopClass: string;
  mdDisplay?: 'flex' | 'block';
  children: React.ReactNode;
}) {
  return (
    <>
      <div className={cn('hidden', MD_DISPLAY[mdDisplay], desktopClass)}>{children}</div>
      <div className={cn('md:hidden flex-1', activePanel !== panel && 'hidden')}>
        {children}
      </div>
    </>
  );
}

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
      <ClayErrorCard
        title="Something went wrong"
        message={error}
        actions={
          <>
            <Button variant="outline" onClick={() => goToDashboard(router)}>
              Back to Dashboard
            </Button>
            <Button onClick={loadApp}>Try Again</Button>
          </>
        }
      />
    );
  }

  if (isLoading || !initialized) {
    return <ClayLoader label={appId ? 'Loading app...' : 'Creating new app...'} />;
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
        {/* Mobile (<768px): show only active panel (tab bar below) */}
        <div className="flex flex-1 overflow-hidden">
          <BuilderPanel
            activePanel={activePanel}
            panel="components"
            desktopClass="md:w-64 md:flex-shrink-0"
          >
            <ComponentPalette />
          </BuilderPanel>

          <BuilderPanel
            activePanel={activePanel}
            panel="canvas"
            desktopClass="flex-1 min-w-0"
            mdDisplay="block"
          >
            <Canvas />
          </BuilderPanel>

          <BuilderPanel
            activePanel={activePanel}
            panel="properties"
            desktopClass="md:w-72 md:flex-shrink-0"
          >
            <PropertiesPanel />
          </BuilderPanel>
        </div>

        <DragOverlay>
          {dragOverlayField && (
            <CanvasFieldCard field={dragOverlayField} />
          )}
        </DragOverlay>
      </DndContext>

      {/* Mobile tab bar (<768px) */}
      <MobileTabBar items={TAB_ITEMS} active={activePanel} onChange={setActivePanel} />

      {/* Spacer for mobile tab bar — matches the fixed bar's height
          (h-[4.25rem]) so content is never hidden behind it */}
      <div className="md:hidden h-[4.25rem]" />
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense
      fallback={<ClayLoader label="Loading builder..." />}
    >
      <BuilderContent />
    </Suspense>
  );
}
