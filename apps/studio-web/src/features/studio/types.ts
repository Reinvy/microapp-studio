/**
 * Builder document contract.
 *
 * A project document is one MUIP root plus builder metadata: a monotonic
 * revision (for optimistic autosave), the device frame the user is editing, a
 * sample data bag for preview, and the permission set the draft will declare.
 *
 * Responsive overrides are stored per device and merged into node props by
 * `applyResponsive`; the base props always represent desktop.
 */

import type { MuipNode } from '@microapp/runtime-web';

export const STUDIO_SCHEMA_VERSION = 1 as const;

export type StudioDevice = 'mobile' | 'tablet' | 'desktop';

export const STUDIO_DEVICES: readonly { id: StudioDevice; width: number; labelKey: string }[] = [
  { id: 'mobile', width: 390, labelKey: 'studio.deviceMobile' },
  { id: 'tablet', width: 834, labelKey: 'studio.deviceTablet' },
  { id: 'desktop', width: 1280, labelKey: 'studio.deviceDesktop' },
];

/** `responsive[device][nodeId] = props to override for that device`. */
export type ResponsiveOverrides = Partial<
  Record<StudioDevice, Record<string, Record<string, unknown>>>
>;

export interface StudioDocument {
  schemaVersion: typeof STUDIO_SCHEMA_VERSION;
  id: string;
  name: string;
  version: number;
  device: StudioDevice;
  /** Exactly one root node. */
  nodes: [MuipNode];
  dataSample: Record<string, unknown>;
  permissions: string[];
  responsive?: ResponsiveOverrides;
}

export type BlankLayout = 'form' | 'list' | 'dashboard';

export const BLANK_LAYOUTS: readonly BlankLayout[] = ['form', 'list', 'dashboard'];

export function isStudioDevice(value: unknown): value is StudioDevice {
  return value === 'mobile' || value === 'tablet' || value === 'desktop';
}

export function isBlankLayout(value: unknown): value is BlankLayout {
  return value === 'form' || value === 'list' || value === 'dashboard';
}
