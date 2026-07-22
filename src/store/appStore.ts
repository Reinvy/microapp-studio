'use client';

import { create } from 'zustand';
import type { AppSchema, FieldSchema, FieldLayout, LogicNode } from '@/types/schema';
import { generateId } from '@/lib/utils';

interface AppState {
  /** All micro-apps loaded from storage */
  apps: AppSchema[];
  /** Currently active app being edited */
  activeApp: AppSchema | null;
  /** Loading state */
  isLoading: boolean;
  /** Selected field ID in the builder */
  selectedFieldId: string | null;

  // Actions
  setApps: (apps: AppSchema[]) => void;
  setActiveApp: (app: AppSchema | null) => void;
  setLoading: (loading: boolean) => void;
  selectField: (fieldId: string | null) => void;

  // CRUD
  addApp: (app: AppSchema) => void;
  updateApp: (id: string, updates: Partial<AppSchema>) => void;
  removeApp: (id: string) => void;

  // Builder actions
  addField: (field: Partial<FieldSchema>) => void;
  updateField: (fieldId: string, updates: Partial<FieldSchema>) => void;
  removeField: (fieldId: string) => void;
  reorderFields: (fromIndex: number, toIndex: number) => void;
  updateLayout: (layout: FieldLayout[]) => void;

  // Logic nodes
  addLogicNode: (node: LogicNode) => void;
  updateLogicNode: (nodeId: string, updates: Partial<LogicNode>) => void;
  removeLogicNode: (nodeId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  apps: [],
  activeApp: null,
  isLoading: false,
  selectedFieldId: null,

  setApps: (apps) => set({ apps }),
  setActiveApp: (app) => set({ activeApp: app, selectedFieldId: null }),
  setLoading: (isLoading) => set({ isLoading }),
  selectField: (fieldId) => set({ selectedFieldId: fieldId }),

  addApp: (app) => set((state) => ({ apps: [app, ...state.apps] })),

  updateApp: (id, updates) =>
    set((state) => ({
      apps: state.apps.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a
      ),
      activeApp:
        state.activeApp?.id === id
          ? { ...state.activeApp, ...updates, updatedAt: Date.now() }
          : state.activeApp,
    })),

  removeApp: (id) =>
    set((state) => ({
      apps: state.apps.filter((a) => a.id !== id),
      activeApp: state.activeApp?.id === id ? null : state.activeApp,
    })),

  addField: (field) =>
    set((state) => {
      if (!state.activeApp) return state;
      const newField: FieldSchema = {
        id: generateId(),
        type: 'text',
        label: 'New Field',
        ...field,
      };
      const newLayout: FieldLayout = {
        fieldId: newField.id,
        x: 0,
        y: state.activeApp.fields.length * 100,
        width: 12,
      };
      return {
        activeApp: {
          ...state.activeApp,
          fields: [...state.activeApp.fields, newField],
          layout: [...state.activeApp.layout, newLayout],
          updatedAt: Date.now(),
        },
      };
    }),

  updateField: (fieldId, updates) =>
    set((state) => {
      if (!state.activeApp) return state;
      return {
        activeApp: {
          ...state.activeApp,
          fields: state.activeApp.fields.map((f) =>
            f.id === fieldId ? { ...f, ...updates } : f
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  removeField: (fieldId) =>
    set((state) => {
      if (!state.activeApp) return state;
      return {
        activeApp: {
          ...state.activeApp,
          fields: state.activeApp.fields.filter((f) => f.id !== fieldId),
          layout: state.activeApp.layout.filter((l) => l.fieldId !== fieldId),
          updatedAt: Date.now(),
        },
        selectedFieldId:
          state.selectedFieldId === fieldId ? null : state.selectedFieldId,
      };
    }),

  reorderFields: (fromIndex, toIndex) =>
    set((state) => {
      if (!state.activeApp) return state;
      const fields = [...state.activeApp.fields];
      const [moved] = fields.splice(fromIndex, 1);
      fields.splice(toIndex, 0, moved);
      return {
        activeApp: { ...state.activeApp, fields, updatedAt: Date.now() },
      };
    }),

  updateLayout: (layout) =>
    set((state) => {
      if (!state.activeApp) return state;
      return {
        activeApp: { ...state.activeApp, layout, updatedAt: Date.now() },
      };
    }),

  addLogicNode: (node) =>
    set((state) => {
      if (!state.activeApp) return state;
      return {
        activeApp: {
          ...state.activeApp,
          logicNodes: [...state.activeApp.logicNodes, node],
          updatedAt: Date.now(),
        },
      };
    }),

  updateLogicNode: (nodeId, updates) =>
    set((state) => {
      if (!state.activeApp) return state;
      return {
        activeApp: {
          ...state.activeApp,
          logicNodes: state.activeApp.logicNodes.map((n) =>
            n.id === nodeId ? { ...n, ...updates, version: n.version + 1 } : n
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  removeLogicNode: (nodeId) =>
    set((state) => {
      if (!state.activeApp) return state;
      return {
        activeApp: {
          ...state.activeApp,
          logicNodes: state.activeApp.logicNodes.filter(
            (n) => n.id !== nodeId
          ),
          updatedAt: Date.now(),
        },
      };
    }),
}));
