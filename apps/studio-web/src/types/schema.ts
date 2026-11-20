// MicroApp Studio — Core Type Definitions

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type BorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
export type ShadowSize = 'none' | 'sm' | 'md' | 'lg';
export type AnimationType = 'none' | 'fade' | 'slide' | 'bounce' | 'pulse';
export type FieldWidth = 'full' | 'half' | 'auto';
export type WidthStyle = FieldWidth;
export type FieldSize = 'sm' | 'md' | 'lg';
export type ButtonAction = 'submit' | 'reset' | 'link';
export type AspectRatio = 'auto' | 'square' | '16:9' | '4:3';
export type TextAlignment = 'left' | 'center' | 'right';

/** Supported field types for micro-apps */
export type FieldType =
  | 'text' | 'number' | 'select' | 'checkbox' | 'textarea' | 'date'
  | 'file' | 'slider' | 'toggle'
  | 'heading' | 'paragraph' | 'divider' | 'spacer' | 'image' | 'card' | 'button'
  | 'color' | 'email' | 'phone' | 'url' | 'rating';

/** Style sub-object used by runner components */
export interface FieldStyleConfig {
  borderRadius?: BorderRadius | string;
  shadow?: ShadowSize | string;
  bgColor?: string;
  textColor?: string;
  border?: boolean;
  animation?: AnimationType;
  color?: string;
  size?: FieldSize;
}

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
  // Content / display fields
  content?: string; // for heading/paragraph text content
  src?: string; // for image URL
  alt?: string; // for image alt text
  variant?: ButtonVariant; // for button
  icon?: string; // for button icon
  action?: ButtonAction; // for button action type
  actionType?: ButtonAction; // alias for action
  href?: string; // for button link action
  size?: FieldSize; // general size
  headingLevel?: HeadingLevel; // for heading
  level?: HeadingLevel; // alias for headingLevel (used in FieldPreview)
  color?: string; // default color value
  width?: FieldWidth; // layout width
  widthStyle?: WidthStyle; // alias for width
  columns?: number; // grid columns (1-4)
  bgColor?: string; // background color
  textColor?: string; // text color
  border?: boolean; // border toggle
  borderRadius?: BorderRadius;
  shadow?: ShadowSize;
  animation?: AnimationType;
  alignment?: TextAlignment; // text alignment for heading/paragraph
  aspectRatio?: AspectRatio; // image aspect ratio
  cssClass?: string; // custom CSS class
  helpText?: string; // help text displayed below field
  /** Style sub-object used by runner components */
  style?: FieldStyleConfig;
}

/** Layout arrangement for fields */
export type LayoutType = 'vertical' | 'horizontal' | 'grid' | 'tabs';

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
  /** Denormalized lowercase name used as an indexed search key (see lib/searchIndex.ts) */
  nameLower?: string;
  description: string;
  prompt: string; // original prompt that generated this
  fields: FieldSchema[];
  logicNodes: LogicNode[];
  layout: FieldLayout[];
  createdAt: number;
  updatedAt: number;
  version: number;
  settings?: {
    layout?: LayoutType;
    theme?: string;
  };
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
