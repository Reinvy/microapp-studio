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

export interface CatalogComponent {
  readonly id: string;
  readonly name: string;
  readonly category: ComponentCategory;
  /** First host version that MUST render the component (U-02/U-12). */
  readonly introducedIn: string;
}

export const COMPONENT_CATALOG: readonly CatalogComponent[] = [
  { id: 'MADS-LAY-01', name: 'AppShell', category: 'layout', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-02', name: 'Stack', category: 'layout', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-03', name: 'Grid', category: 'layout', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-04', name: 'SplitPane', category: 'layout', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-05', name: 'Card', category: 'layout', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-06', name: 'Sheet', category: 'layout', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-07', name: 'Drawer', category: 'layout', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-08', name: 'Modal', category: 'layout', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-09', name: 'Popover', category: 'layout', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-10', name: 'Toolbar', category: 'layout', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-11', name: 'SafeArea', category: 'layout', introducedIn: '2.0.0' },
  { id: 'MADS-LAY-12', name: 'ScrollArea', category: 'layout', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-01', name: 'Sidebar', category: 'navigation', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-02', name: 'TabBar', category: 'navigation', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-03', name: 'Breadcrumb', category: 'navigation', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-04', name: 'CommandPalette', category: 'navigation', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-05', name: 'Pagination', category: 'navigation', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-06', name: 'Stepper', category: 'navigation', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-07', name: 'Menu', category: 'navigation', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-08', name: 'Dock', category: 'navigation', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-09', name: 'WorkspaceSwitcher', category: 'navigation', introducedIn: '2.0.0' },
  { id: 'MADS-NAV-10', name: 'BackButton', category: 'navigation', introducedIn: '2.0.0' },
  { id: 'MADS-INP-01', name: 'Button', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-02', name: 'IconButton', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-03', name: 'TextField', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-04', name: 'TextArea', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-05', name: 'NumberField', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-06', name: 'SearchField', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-07', name: 'Select', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-08', name: 'Combobox', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-09', name: 'MultiSelect', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-10', name: 'Checkbox', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-11', name: 'RadioGroup', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-12', name: 'Switch', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-13', name: 'Slider', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-14', name: 'RangeSlider', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-15', name: 'DatePicker', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-16', name: 'TimePicker', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-17', name: 'ColorPicker', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-18', name: 'FilePicker', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-19', name: 'SignaturePad', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-INP-20', name: 'OTPInput', category: 'input', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-01', name: 'DataTable', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-02', name: 'VirtualList', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-03', name: 'TreeView', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-04', name: 'KanbanBoard', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-05', name: 'Calendar', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-06', name: 'Timeline', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-07', name: 'LineChart', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-08', name: 'BarChart', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-09', name: 'PieChart', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-10', name: 'AreaChart', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-11', name: 'StatCard', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-12', name: 'Badge', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-13', name: 'Tag', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-14', name: 'Avatar', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-15', name: 'Tooltip', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-16', name: 'Progress', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-17', name: 'Skeleton', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-DATA-18', name: 'EmptyState', category: 'data', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-01', name: 'Alert', category: 'feedback', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-02', name: 'Toast', category: 'feedback', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-03', name: 'Banner', category: 'feedback', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-04', name: 'FieldError', category: 'feedback', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-05', name: 'ConfirmDialog', category: 'feedback', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-06', name: 'PermissionDialog', category: 'feedback', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-07', name: 'ErrorBoundary', category: 'feedback', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-08', name: 'OfflineBanner', category: 'feedback', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-09', name: 'SyncStatus', category: 'feedback', introducedIn: '2.0.0' },
  { id: 'MADS-FBK-10', name: 'LoadingOverlay', category: 'feedback', introducedIn: '2.0.0' },
  { id: 'MADS-MED-01', name: 'Image', category: 'media', introducedIn: '2.0.0' },
  { id: 'MADS-MED-02', name: 'VideoPlayer', category: 'media', introducedIn: '2.0.0' },
  { id: 'MADS-MED-03', name: 'AudioPlayer', category: 'media', introducedIn: '2.0.0' },
  { id: 'MADS-MED-04', name: 'CameraCapture', category: 'media', introducedIn: '2.0.0' },
  { id: 'MADS-MED-05', name: 'QRScanner', category: 'media', introducedIn: '2.0.0' },
  { id: 'MADS-MED-06', name: 'BarcodeScanner', category: 'media', introducedIn: '2.0.0' },
  { id: 'MADS-MED-07', name: 'MapView', category: 'media', introducedIn: '2.0.0' },
  { id: 'MADS-MED-08', name: 'PDFViewer', category: 'media', introducedIn: '2.0.0' },
  { id: 'MADS-MED-09', name: 'MarkdownView', category: 'media', introducedIn: '2.0.0' },
  { id: 'MADS-MED-10', name: 'RichTextEditor', category: 'media', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-01', name: 'FormBuilder', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-02', name: 'SchemaForm', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-03', name: 'WorkflowNode', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-04', name: 'CodeEditor', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-05', name: 'DiffViewer', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-06', name: 'Terminal', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-07', name: 'LogViewer', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-08', name: 'ChatThread', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-09', name: 'MessageBubble', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-10', name: 'ReceiptView', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-11', name: 'InvoiceView', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-12', name: 'ContactPicker', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-13', name: 'FileTree', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-14', name: 'RecordDetail', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-15', name: 'FilterBar', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-16', name: 'SavedView', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-17', name: 'ImportWizard', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-18', name: 'ExportDialog', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-19', name: 'VaultItem', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-DOM-20', name: 'DeviceCard', category: 'domain', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-01', name: 'AppIcon', category: 'platform', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-02', name: 'WidgetFrame', category: 'platform', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-03', name: 'WindowChrome', category: 'platform', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-04', name: 'ContextMenu', category: 'platform', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-05', name: 'NotificationItem', category: 'platform', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-06', name: 'ShareSheet', category: 'platform', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-07', name: 'IntentPicker', category: 'platform', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-08', name: 'PermissionBadge', category: 'platform', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-09', name: 'StorageMeter', category: 'platform', introducedIn: '2.0.0' },
  { id: 'MADS-PLT-10', name: 'UpdateCard', category: 'platform', introducedIn: '2.0.0' },
  { id: 'MADS-AI-01', name: 'PromptInput', category: 'ai', introducedIn: '2.0.0' },
  { id: 'MADS-AI-02', name: 'ModelPicker', category: 'ai', introducedIn: '2.0.0' },
  { id: 'MADS-AI-03', name: 'AIStatus', category: 'ai', introducedIn: '2.0.0' },
  { id: 'MADS-AI-04', name: 'SuggestionChip', category: 'ai', introducedIn: '2.0.0' },
  { id: 'MADS-AI-05', name: 'DiffSuggestion', category: 'ai', introducedIn: '2.0.0' },
  { id: 'MADS-AI-06', name: 'GenerationProgress', category: 'ai', introducedIn: '2.0.0' },
  { id: 'MADS-AI-07', name: 'SourceCitation', category: 'ai', introducedIn: '2.0.0' },
  { id: 'MADS-AI-08', name: 'AIError', category: 'ai', introducedIn: '2.0.0' },
  { id: 'MADS-AI-09', name: 'TokenMeter', category: 'ai', introducedIn: '2.0.0' },
  { id: 'MADS-AI-10', name: 'AgentStep', category: 'ai', introducedIn: '2.0.0' },
];

export const CATALOG_SIZE = COMPONENT_CATALOG.length;

const BY_NAME = new Map(COMPONENT_CATALOG.map((component) => [component.name, component]));

export function catalogComponent(name: string): CatalogComponent | undefined {
  return BY_NAME.get(name);
}
