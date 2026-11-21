// GENERATED FILE — do not edit by hand.
// Source: docs/02-design/component-catalog.md
// Regenerate: node scripts/generate-catalog.mjs

export type ComponentCategory =
  | 'layout'
  | 'navigation'
  | 'input'
  | 'data'
  | 'feedback'
  | 'media'
  | 'domain'
  | 'platform'
  | 'ai';

/** core is the 48-component clay palette; advanced renders a placeholder. */
export type ComponentLevel = 'core' | 'advanced';

export interface CatalogComponent {
  readonly id: string;
  readonly name: string;
  readonly category: ComponentCategory;
  readonly level: ComponentLevel;
  /** First host version that MUST render the component (U-02/U-12). */
  readonly introducedIn: string;
}

export const COMPONENT_CATALOG: readonly CatalogComponent[] = [
  { id: 'MADS-LAY-01', name: 'AppShell', category: 'layout', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-02', name: 'Stack', category: 'layout', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-03', name: 'Grid', category: 'layout', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-04', name: 'SplitPane', category: 'layout', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-05', name: 'Card', category: 'layout', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-06', name: 'Sheet', category: 'layout', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-07', name: 'Drawer', category: 'layout', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-08', name: 'Modal', category: 'layout', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-09', name: 'Popover', category: 'layout', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-10', name: 'Toolbar', category: 'layout', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-11', name: 'SafeArea', category: 'layout', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-12', name: 'ScrollArea', category: 'layout', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-01', name: 'Sidebar', category: 'navigation', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-02', name: 'TabBar', category: 'navigation', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-03', name: 'Breadcrumb', category: 'navigation', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-04', name: 'CommandPalette', category: 'navigation', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-05', name: 'Pagination', category: 'navigation', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-06', name: 'Stepper', category: 'navigation', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-07', name: 'Menu', category: 'navigation', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-08', name: 'Dock', category: 'navigation', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-09', name: 'WorkspaceSwitcher', category: 'navigation', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-10', name: 'BackButton', category: 'navigation', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-INP-01', name: 'Button', category: 'input', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-INP-02', name: 'IconButton', category: 'input', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-INP-03', name: 'TextField', category: 'input', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-INP-04', name: 'TextArea', category: 'input', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-INP-05', name: 'NumberField', category: 'input', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-INP-06', name: 'SearchField', category: 'input', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-INP-07', name: 'Select', category: 'input', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-INP-08', name: 'Combobox', category: 'input', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-INP-09', name: 'MultiSelect', category: 'input', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-INP-10', name: 'Checkbox', category: 'input', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-INP-11', name: 'RadioGroup', category: 'input', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-INP-12', name: 'Switch', category: 'input', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-INP-13', name: 'Slider', category: 'input', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-INP-14', name: 'RangeSlider', category: 'input', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-INP-15', name: 'DatePicker', category: 'input', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-INP-16', name: 'TimePicker', category: 'input', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-INP-17', name: 'ColorPicker', category: 'input', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-INP-18', name: 'FilePicker', category: 'input', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-INP-19', name: 'SignaturePad', category: 'input', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-INP-20', name: 'OTPInput', category: 'input', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-01', name: 'DataTable', category: 'data', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-02', name: 'VirtualList', category: 'data', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-03', name: 'TreeView', category: 'data', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-04', name: 'KanbanBoard', category: 'data', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-05', name: 'Calendar', category: 'data', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-06', name: 'Timeline', category: 'data', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-07', name: 'LineChart', category: 'data', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-08', name: 'BarChart', category: 'data', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-09', name: 'PieChart', category: 'data', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-10', name: 'AreaChart', category: 'data', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-11', name: 'StatCard', category: 'data', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-12', name: 'Badge', category: 'data', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-13', name: 'Tag', category: 'data', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-14', name: 'Avatar', category: 'data', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-15', name: 'Tooltip', category: 'data', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-16', name: 'Progress', category: 'data', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-17', name: 'Skeleton', category: 'data', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-18', name: 'EmptyState', category: 'data', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-01', name: 'Alert', category: 'feedback', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-02', name: 'Toast', category: 'feedback', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-03', name: 'Banner', category: 'feedback', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-04', name: 'FieldError', category: 'feedback', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-05', name: 'ConfirmDialog', category: 'feedback', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-06', name: 'PermissionDialog', category: 'feedback', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-07', name: 'ErrorBoundary', category: 'feedback', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-08', name: 'OfflineBanner', category: 'feedback', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-09', name: 'SyncStatus', category: 'feedback', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-10', name: 'LoadingOverlay', category: 'feedback', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-MED-01', name: 'Image', category: 'media', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-MED-02', name: 'VideoPlayer', category: 'media', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-MED-03', name: 'AudioPlayer', category: 'media', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-MED-04', name: 'CameraCapture', category: 'media', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-MED-05', name: 'QRScanner', category: 'media', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-MED-06', name: 'BarcodeScanner', category: 'media', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-MED-07', name: 'MapView', category: 'media', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-MED-08', name: 'PDFViewer', category: 'media', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-MED-09', name: 'MarkdownView', category: 'media', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-MED-10', name: 'RichTextEditor', category: 'media', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-01', name: 'FormBuilder', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-02', name: 'SchemaForm', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-03', name: 'WorkflowNode', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-04', name: 'CodeEditor', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-05', name: 'DiffViewer', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-06', name: 'Terminal', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-07', name: 'LogViewer', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-08', name: 'ChatThread', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-09', name: 'MessageBubble', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-10', name: 'ReceiptView', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-11', name: 'InvoiceView', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-12', name: 'ContactPicker', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-13', name: 'FileTree', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-14', name: 'RecordDetail', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-15', name: 'FilterBar', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-16', name: 'SavedView', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-17', name: 'ImportWizard', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-18', name: 'ExportDialog', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-19', name: 'VaultItem', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-20', name: 'DeviceCard', category: 'domain', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-01', name: 'AppIcon', category: 'platform', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-02', name: 'WidgetFrame', category: 'platform', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-03', name: 'WindowChrome', category: 'platform', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-04', name: 'ContextMenu', category: 'platform', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-05', name: 'NotificationItem', category: 'platform', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-06', name: 'ShareSheet', category: 'platform', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-07', name: 'IntentPicker', category: 'platform', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-08', name: 'PermissionBadge', category: 'platform', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-09', name: 'StorageMeter', category: 'platform', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-10', name: 'UpdateCard', category: 'platform', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-AI-01', name: 'PromptInput', category: 'ai', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-AI-02', name: 'ModelPicker', category: 'ai', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-AI-03', name: 'AIStatus', category: 'ai', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-AI-04', name: 'SuggestionChip', category: 'ai', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-AI-05', name: 'DiffSuggestion', category: 'ai', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-AI-06', name: 'GenerationProgress', category: 'ai', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-AI-07', name: 'SourceCitation', category: 'ai', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-AI-08', name: 'AIError', category: 'ai', level: 'core', introducedIn: '2.0.0' },
  { id: 'MADS-AI-09', name: 'TokenMeter', category: 'ai', level: 'advanced', introducedIn: '2.0.0' },
  { id: 'MADS-AI-10', name: 'AgentStep', category: 'ai', level: 'advanced', introducedIn: '2.0.0' },
];

export const CATALOG_SIZE = COMPONENT_CATALOG.length;

/** The 48 fully specified clay components used as the builder's default palette. */
export const CORE_CATALOG_SIZE = COMPONENT_CATALOG.filter((component) => component.level === 'core').length;

const BY_NAME = new Map(COMPONENT_CATALOG.map((component) => [component.name, component]));

export function catalogComponent(name: string): CatalogComponent | undefined {
  return BY_NAME.get(name);
}
