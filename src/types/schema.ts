// MicroApp Studio — Core Type Definitions

/** Supported field types for micro-apps */
export type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'textarea'
  | 'date'
  | 'file'
  | 'slider'
  | 'toggle';

/** A single field configuration in a micro-app */
export interface FieldSchema {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  required?: boolean;
  options?: string[]; // for select
  min?: number;
  max?: number;
  step?: number;
  validation?: {
    pattern?: string;
    message?: string;
    minLength?: number;
    maxLength?: number;
  };
}

/** A custom JS logic node */
export interface LogicNode {
  id: string;
  name: string;
  code: string;
  inputs: string[];
  outputs: string[];
  version: number;
}

/** Layout arrangement for fields in the builder */
export interface FieldLayout {
  fieldId: string;
  x: number;
  y: number;
  width: number;
}

/** Complete schema for a micro-app */
export interface AppSchema {
  id: string;
  name: string;
  description: string;
  prompt: string; // original prompt that generated this
  fields: FieldSchema[];
  logicNodes: LogicNode[];
  layout: FieldLayout[];
  createdAt: number;
  updatedAt: number;
  version: number;
}

/** Runtime result from the schema engine */
export interface EngineResult {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  errors: string[];
}

/** Execution context passed to custom nodes */
export interface ExecutionContext {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  runNode: (nodeId: string, inputs: Record<string, unknown>) => unknown;
}

/** Parsed result from prompt-to-schema */
export interface ParsedSchema {
  appName: string;
  description: string;
  fields: FieldSchema[];
}

/** Builder drag item type */
export interface DragItem {
  type: 'field' | 'component';
  fieldType?: FieldType;
  id?: string;
}
