// @vitest-environment jsdom
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axe, { type AxeResults } from 'axe-core';
import {
  AIError,
  AIStatus,
  Alert,
  AppIcon,
  AppShell,
  Avatar,
  Badge,
  Banner,
  Breadcrumb,
  Button,
  Calendar,
  Card,
  Checkbox,
  Combobox,
  CommandPalette,
  ConfirmDialog,
  DataTable,
  Dock,
  EmptyState,
  ErrorBoundary,
  ErrorSurface,
  FieldError,
  FilePicker,
  Grid,
  IconButton,
  Image,
  List,
  Menu,
  Modal,
  OfflineBanner,
  PermissionBadge,
  Progress,
  PromptInput,
  RadioGroup,
  ScrollArea,
  SearchField,
  Select,
  ShareSheet,
  Sheet,
  Sidebar,
  Skeleton,
  Slider,
  Stack,
  StatCard,
  Stepper,
  StorageMeter,
  SuggestionChip,
  Switch,
  TabBar,
  TextArea,
  TextField,
  Toast,
  Toolbar,
  Tooltip,
  WorkspaceSwitcher,
  clayTintFor,
  madsThemes,
  tokens,
} from '../index';

afterEach(cleanup);

function blockingViolations(results: AxeResults): string[] {
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.help}`);
}

describe('tokens', () => {
  it('mirrors the clay token names from DESIGN.md §2', () => {
    expect(tokens.color.primary).toBe('var(--mads-color-primary)');
    expect(tokens.color.borderSubtle).toBe('var(--mads-color-border-subtle)');
    expect(tokens.space[16]).toBe('var(--mads-space-16)');
    expect(tokens.space[2]).toBe('var(--mads-space-2)');
    expect(tokens.radius.full).toBe('var(--mads-radius-full)');
    expect(tokens.radius.md).toBe('var(--mads-radius-clay-md)');
    expect(tokens.text[16]).toBe('var(--mads-text-16)');
    expect(tokens.leading[24]).toBe('var(--mads-leading-24)');
    expect(tokens.shadow[2]).toBe('var(--mads-clay-shadow-2)');
    expect(tokens.motion.control).toBe('var(--mads-duration-control)');
    expect(tokens.font.ui).toBe('var(--mads-font-ui)');
    expect(tokens.layout.sidebarWidth).toBe('var(--mads-sidebar-width)');
    expect(tokens.control.heightMd).toBe('var(--mads-control-height-md)');
  });

  it('offers exactly the three documented themes', () => {
    expect([...madsThemes]).toEqual(['light', 'dark', 'high-contrast']);
  });
});

/* ---------- contrast invariants ---------- */

function colorBlock(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    else if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }
  const body = css.slice(open + 1, end);
  const colors = new Map<string, string>();
  for (const match of body.matchAll(/--mads-color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    colors.set(match[1] as string, match[2] as string);
  }
  return colors;
}

function linearChannel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const numeric = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * linearChannel((numeric >> 16) & 0xff) +
    0.7152 * linearChannel((numeric >> 8) & 0xff) +
    0.0722 * linearChannel(numeric & 0xff)
  );
}

function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return ((lighter as number) + 0.05) / ((darker as number) + 0.05);
}

describe('contrast invariants', () => {
  const tokensPath = [
    join(process.cwd(), 'src/tokens.css'),
    join(process.cwd(), 'packages/ui-kit/src/tokens.css'),
  ].find((candidate) => existsSync(candidate));
  if (!tokensPath) throw new Error('tokens.css not found from the test workspace root');
  const css = readFileSync(tokensPath, 'utf8');
  const light = colorBlock(css, ':root');
  const dark = new Map([...light, ...colorBlock(css, '[data-theme="dark"]')]);
  const pairs: Array<[string, string]> = [
    ['fg', 'bg'],
    ['fg', 'surface'],
    ['on-primary', 'primary'],
    ['muted', 'surface'],
  ];

  it.each(pairs)('light %s on %s reaches 4.5:1', (foreground, background) => {
    const ratio = contrastRatio(light.get(foreground) as string, light.get(background) as string);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it.each(pairs)('dark %s on %s reaches 4.5:1', (foreground, background) => {
    const ratio = contrastRatio(dark.get(foreground) as string, dark.get(background) as string);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Button', () => {
  it('fires onClick, exposes variants, and marks loading buttons busy', () => {
    const onClick = vi.fn();
    render(
      <>
        <Button onClick={onClick}>Simpan</Button>
        <Button loading>Menyimpan</Button>
        <Button variant="danger" size="lg" disabled>
          Hapus
        </Button>
      </>,
    );

    const save = screen.getByRole('button', { name: 'Simpan' });
    expect(save).toHaveClass('mads-button--primary', 'mads-button--md');
    fireEvent.click(save);
    expect(onClick).toHaveBeenCalledTimes(1);

    const loading = screen.getByRole('button', { name: 'Menyimpan' });
    expect(loading).toHaveAttribute('aria-busy', 'true');
    expect(loading).toBeDisabled();

    const danger = screen.getByRole('button', { name: 'Hapus' });
    expect(danger).toBeDisabled();
    expect(danger).toHaveClass('mads-button--danger', 'mads-button--lg');
  });
});

describe('IconButton', () => {
  it('always exposes a descriptive aria-label', () => {
    const onClick = vi.fn();
    render(<IconButton label="Pengaturan" icon={<span>gear</span>} onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Pengaturan' });
    expect(button).toHaveAttribute('aria-label', 'Pengaturan');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('form fields', () => {
  it('links TextField descriptions and errors through aria-describedby', () => {
    const onChange = vi.fn();
    render(
      <TextField
        label="Nama workspace"
        value="Pribadi"
        onChange={onChange}
        description="Nama ini terlihat oleh anggota lain."
        error="Nama sudah dipakai."
        required
      />,
    );

    const input = screen.getByLabelText(/Nama workspace/);
    expect(input).toHaveValue('Pribadi');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('required');

    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(describedBy?.split(' ')).toHaveLength(2);

    fireEvent.change(input, { target: { value: 'Kerja' } });
    expect(onChange).toHaveBeenCalledWith('Kerja');
  });

  it('renders TextArea with rows and propagates changes', () => {
    const onChange = vi.fn();
    render(<TextArea label="Catatan" value="" onChange={onChange} rows={6} />);
    const textarea = screen.getByLabelText(/Catatan/);
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveAttribute('rows', '6');
    fireEvent.change(textarea, { target: { value: 'catatan baru' } });
    expect(onChange).toHaveBeenCalledWith('catatan baru');
  });

  it('renders Select options and reports the chosen value', () => {
    const onChange = vi.fn();
    render(
      <Select
        label="Peran"
        value="viewer"
        onChange={onChange}
        options={[
          { value: 'owner', label: 'Owner' },
          { value: 'viewer', label: 'Viewer' },
        ]}
      />,
    );

    const select = screen.getByLabelText(/Peran/);
    expect(select).toHaveValue('viewer');
    expect(within(select).getByRole('option', { name: 'Owner' })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'owner' } });
    expect(onChange).toHaveBeenCalledWith('owner');
  });

  it('toggles Checkbox and Switch with accessible state', () => {
    const onCheck = vi.fn();
    const onSwitch = vi.fn();
    render(
      <>
        <Checkbox label="Setuju" checked={false} onChange={onCheck} />
        <Switch label="Sinkronisasi" checked onChange={onSwitch} />
      </>,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Setuju' }));
    expect(onCheck).toHaveBeenCalledWith(true);

    const toggle = screen.getByRole('switch', { name: 'Sinkronisasi' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(onSwitch).toHaveBeenCalledWith(false);
  });

  it('submits and clears SearchField', () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <SearchField label="Cari aplikasi" value="catatan" onChange={onChange} onSubmit={onSubmit} />,
    );

    const input = screen.getByRole('searchbox', { name: 'Cari aplikasi' });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onChange).toHaveBeenCalledWith('');

    fireEvent.click(screen.getByRole('button', { name: 'Bersihkan pencarian' }));
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe('RadioGroup', () => {
  it('exposes a radiogroup and moves the selection with arrow keys', () => {
    const onChange = vi.fn();
    render(
      <RadioGroup
        label="Tema"
        value="light"
        onChange={onChange}
        options={[
          { value: 'light', label: 'Terang' },
          { value: 'dark', label: 'Gelap', description: 'Kontras rendah di malam hari.' },
          { value: 'high-contrast', label: 'Kontras tinggi' },
        ]}
      />,
    );

    const group = screen.getByRole('radiogroup', { name: 'Tema' });
    expect(group).toBeInTheDocument();
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(radios[0]).toBeChecked();

    radios[0]?.focus();
    fireEvent.keyDown(radios[0] as HTMLElement, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenCalledWith('dark');
    expect(radios[1]).toHaveFocus();

    fireEvent.keyDown(radios[1] as HTMLElement, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith('light');
    expect(radios[0]).toHaveFocus();
  });
});

describe('Slider', () => {
  it('renders a range input with aria-valuetext and tick labels', () => {
    const onChange = vi.fn();
    render(
      <Slider
        label="Skala teks"
        value={1125}
        min={1000}
        max={1250}
        step={125}
        valueText="1.125 kali"
        ticks={[
          { value: 1000, label: '100%' },
          { value: 1125, label: '112%' },
          { value: 1250, label: '125%' },
        ]}
        onChange={onChange}
      />,
    );

    const slider = screen.getByRole('slider', { name: 'Skala teks' });
    expect(slider).toHaveAttribute('aria-valuetext', '1.125 kali');
    expect(slider).toHaveValue('1125');
    fireEvent.change(slider, { target: { value: '1250' } });
    expect(onChange).toHaveBeenCalledWith(1250);
    expect(screen.getByText('125%')).toBeInTheDocument();
  });
});

describe('Combobox', () => {
  it('filters options and commits the highlighted one on Enter', () => {
    const onChange = vi.fn();
    render(
      <Combobox
        label="Kategori"
        value=""
        onChange={onChange}
        options={[
          { value: 'kasir', label: 'Kasir' },
          { value: 'produktivitas', label: 'Produktivitas' },
          { value: 'inventaris', label: 'Inventaris' },
        ]}
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Kategori' });
    expect(input).toHaveAttribute('aria-expanded', 'false');

    fireEvent.focus(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    fireEvent.change(input, { target: { value: 'inv' } });

    const listbox = screen.getByRole('listbox', { name: /Kategori/ });
    expect(within(listbox).getAllByRole('option')).toHaveLength(1);
    expect(within(listbox).getByRole('option', { name: 'Inventaris' })).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-activedescendant');
    expect(input).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('inventaris');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the empty message when nothing matches', () => {
    render(
      <Combobox
        label="Kategori"
        value=""
        onChange={() => {}}
        options={[{ value: 'kasir', label: 'Kasir' }]}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Kategori' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getByText('Tidak ada hasil.')).toBeInTheDocument();
  });
});

describe('PromptInput', () => {
  it('counts characters, describes the counter, and submits on Ctrl+Enter', () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <PromptInput
        label="Prompt"
        value="kasir"
        onChange={onChange}
        onSubmit={onSubmit}
        maxLength={20}
        error="Prompt terlalu pendek."
      />,
    );

    const textarea = screen.getByLabelText('Prompt');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    const describedBy = textarea.getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(describedBy.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('5 / 20')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Prompt terlalu pendek.');

    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(1);

    fireEvent.change(textarea, { target: { value: 'kasir warung' } });
    expect(onChange).toHaveBeenCalledWith('kasir warung');
  });
});

describe('FilePicker', () => {
  it('keeps the button as the only tab stop and reports chosen files', () => {
    const onFiles = vi.fn();
    const { container } = render(<FilePicker label="Pilih paket" accept=".mapp" onFiles={onFiles} />);

    const button = screen.getByRole('button', { name: 'Pilih paket' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('accept', '.mapp');
    expect(input.tabIndex).toBe(-1);
    expect(button.tabIndex).toBe(0);

    const file = new File(['data'], 'paket.mapp');
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles.mock.calls[0]?.[0]?.[0]?.name).toBe('paket.mapp');
  });
});

describe('Calendar', () => {
  const month = new Date(2027, 0, 1);

  it('formats the month with Intl for id-ID', () => {
    render(<Calendar locale="id-ID" month={month} value="2027-01-15" onChange={() => {}} />);
    expect(screen.getByText('Januari 2027')).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'Kalender' })).toBeInTheDocument();
  });

  it('formats the month with Intl for en-US', () => {
    render(<Calendar locale="en-US" month={month} value="2027-01-15" onChange={() => {}} />);
    expect(screen.getByText('January 2027')).toBeInTheDocument();
  });

  it('marks the selected day and moves focus with arrow keys', async () => {
    const onChange = vi.fn();
    render(<Calendar locale="id-ID" month={month} value="2027-01-15" onChange={onChange} />);

    const selected = screen.getByRole('gridcell', { selected: true });
    expect(within(selected).getByText('15')).toBeInTheDocument();

    const grid = screen.getByRole('grid');
    fireEvent.keyDown(grid, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByRole('button', { name: /16 Januari 2027/ })).toHaveFocus());

    fireEvent.keyDown(grid, { key: 'Home' });
    await waitFor(() => expect(screen.getByRole('button', { name: /10 Januari 2027/ })).toHaveFocus());

    fireEvent.click(screen.getByRole('button', { name: /16 Januari 2027/ }));
    expect(onChange).toHaveBeenCalledWith('2027-01-16');
  });
});

describe('CommandPalette', () => {
  it('filters, navigates with arrows, enters a command, and closes on Escape', async () => {
    const runSettings = vi.fn();
    const runClose = vi.fn();
    const onClose = vi.fn();
    render(
      <CommandPalette
        open
        onClose={onClose}
        commands={[
          { id: 'settings', label: 'Buka Pengaturan', run: runSettings },
          { id: 'close', label: 'Tutup Sesi', run: runClose, keywords: ['keluar'] },
        ]}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Palet perintah' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const input = screen.getByRole('combobox', { name: 'Cari perintah' });
    await waitFor(() => expect(input).toHaveFocus());

    fireEvent.change(input, { target: { value: 'keluar' } });
    expect(screen.getByRole('option', { name: 'Tutup Sesi' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Buka Pengaturan' })).not.toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(runClose).toHaveBeenCalledTimes(1);
    expect(runSettings).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('dialogs', () => {
  it('Modal traps Tab inside, closes on Escape, and restores focus', async () => {
    const onClose = vi.fn();
    const dialog = (open: boolean) => (
      <>
        <button type="button">Pemicu</button>
        <Modal open={open} title="Hapus catatan" onClose={onClose} footer={<Button>Hapus</Button>}>
          <p>Tindakan ini tidak dapat dibatalkan.</p>
        </Modal>
      </>
    );
    const { rerender } = render(dialog(false));
    const trigger = screen.getByRole('button', { name: 'Pemicu' });
    trigger.focus();

    rerender(dialog(true));
    const panel = screen.getByRole('dialog', { name: 'Hapus catatan' });
    expect(panel).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true));
    expect(document.body.style.overflow).toBe('hidden');

    const focusables = within(panel).getAllByRole('button');
    const first = focusables[0] as HTMLElement;
    const last = focusables[focusables.length - 1] as HTMLElement;
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(dialog(false));
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('Sheet keeps the side, traps Tab, and takes focus', async () => {
    const onClose = vi.fn();
    render(
      <Sheet open title="Panel properti" side="left" onClose={onClose} footer={<Button>Terapkan</Button>}>
        <p>Isi panel</p>
      </Sheet>,
    );

    const sheet = screen.getByRole('dialog', { name: 'Panel properti' });
    expect(sheet).toHaveClass('mads-sheet--left');
    expect(sheet).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true));

    const focusables = within(sheet).getAllByRole('button');
    const first = focusables[0] as HTMLElement;
    const last = focusables[focusables.length - 1] as HTMLElement;
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ConfirmDialog focuses Cancel by default and confirms on demand', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        tone="danger"
        title="Hapus aplikasi"
        description="Data lokal akan dihapus."
        confirmLabel="Hapus"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Hapus aplikasi' });
    const cancel = within(dialog).getByRole('button', { name: 'Batal' });
    await waitFor(() => expect(cancel).toHaveFocus());
    expect(within(dialog).getByRole('button', { name: 'Hapus' })).toHaveClass('mads-button--danger');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Hapus' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(cancel);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ShareSheet renders summary, permissions, and a disabled copy link', async () => {
    render(
      <ShareSheet
        open
        onClose={() => {}}
        summary={[
          { label: 'Nama', value: 'Kasir Warung' },
          { label: 'Versi', value: '1.0.0' },
        ]}
        permissions={[
          { id: 'storage.app', label: 'Penyimpanan app', granted: 'declared' },
        ]}
        primaryAction={<Button>Unduh .mapp</Button>}
        copyLink
        copyLinkDisabledReason="Belum ada sumber paket."
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Bagikan aplikasi' });
    expect(within(dialog).getByText('Kasir Warung')).toBeInTheDocument();
    expect(within(dialog).getByText('1.0.0')).toBeInTheDocument();
    expect(within(dialog).getByText('Penyimpanan app')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Unduh .mapp' })).toBeInTheDocument();

    const copy = within(dialog).getByRole('button', { name: 'Salin link index' });
    expect(copy).toBeDisabled();
    expect(copy).toHaveAttribute('title', 'Belum ada sumber paket.');
    expect(within(dialog).getByText('Belum ada sumber paket.')).toBeInTheDocument();
  });
});

describe('data display', () => {
  it('renders DataTable caption and column headers', () => {
    render(
      <DataTable
        caption="Aplikasi terpasang"
        columns={[
          { key: 'name', label: 'Nama' },
          { key: 'size', label: 'Ukuran' },
        ]}
        rows={[{ name: 'Catatan', size: '2 MB' }]}
      />,
    );

    const table = screen.getByRole('table', { name: 'Aplikasi terpasang' });
    const header = within(table).getByRole('columnheader', { name: 'Nama' });
    expect(header).toHaveAttribute('scope', 'col');
    expect(within(table).getByText('Catatan')).toBeInTheDocument();
    expect(within(table).getByText('2 MB')).toBeInTheDocument();
  });

  it('renders DataTable empty content', () => {
    render(
      <DataTable
        columns={[{ key: 'name', label: 'Nama' }]}
        rows={[]}
        empty="Belum ada aplikasi terpasang."
      />,
    );
    expect(screen.getByText('Belum ada aplikasi terpasang.')).toBeInTheDocument();
  });

  it('requires Image alt text', () => {
    render(<Image src="/icon.png" alt="Ikon MicroApp" width={64} height={64} />);
    const image = screen.getByRole('img', { name: 'Ikon MicroApp' });
    expect(image).toHaveAttribute('alt', 'Ikon MicroApp');
    expect(image).toHaveStyle({ width: '64px', height: '64px' });
  });

  it('renders StatCard label, value, and delta direction', () => {
    const { container } = render(
      <>
        <StatCard label="Aplikasi" value="12" delta="+3" />
        <StatCard label="Penyimpanan" value="80 MB" delta="-5 MB" />
      </>,
    );

    expect(screen.getByText('Aplikasi')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    const up = container.querySelector('.mads-stat-card__delta--up');
    const down = container.querySelector('.mads-stat-card__delta--down');
    expect(up).toHaveTextContent('Naik');
    expect(up).toHaveTextContent('+3');
    expect(down).toHaveTextContent('Turun');
  });

  it('renders List with an accessible name', () => {
    render(<List label="Langkah" items={['Pertama', <strong key="second">Kedua</strong>]} />);
    expect(screen.getByRole('list', { name: 'Langkah' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders Badge tones', () => {
    render(
      <>
        <Badge>Netral</Badge>
        <Badge tone="danger">Gagal</Badge>
      </>,
    );
    expect(screen.getByText('Gagal')).toHaveClass('mads-badge--danger');
    expect(screen.getByText('Netral')).toHaveClass('mads-badge--neutral');
  });

  it('reports Progress value and maximum', () => {
    render(<Progress value={150} max={200} label="Mengunggah" />);
    const bar = screen.getByRole('progressbar', { name: 'Mengunggah' }) as HTMLProgressElement;
    expect(bar.value).toBe(150);
    expect(bar.max).toBe(200);
    expect(screen.getByText('Mengunggah')).toBeInTheDocument();
  });

  it('marks Skeleton busy with an optional label', () => {
    render(<Skeleton width={120} height={24} label="Memuat daftar aplikasi" />);
    const skeleton = screen.getByRole('status', { name: 'Memuat daftar aplikasi' });
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(skeleton).toHaveStyle({ width: '120px', height: '24px' });
  });

  it('Avatar falls back to labelled initials', () => {
    render(<Avatar name="Budi Santoso" />);
    const avatar = screen.getByRole('img', { name: 'Budi Santoso' });
    expect(avatar).toHaveTextContent('BS');
  });

  it('AppIcon derives a stable clay tint and shows the initial', () => {
    const { container } = render(<AppIcon appId="studio.p0123456789ab" name="Kasir Warung" />);
    const icon = screen.getByRole('img', { name: 'Kasir Warung' });
    expect(icon).toHaveTextContent('K');
    expect(icon).toHaveAttribute('data-tint', clayTintFor('studio.p0123456789ab'));
    expect(clayTintFor('studio.p0123456789ab')).toBe(clayTintFor('studio.p0123456789ab'));
    expect(container.querySelectorAll('.mads-app-icon')).toHaveLength(1);
  });

  it('StorageMeter exposes a meter with value text and tone', () => {
    render(<StorageMeter label="Penyimpanan" used={85} quota={100} />);
    const meter = screen.getByRole('meter', { name: 'Penyimpanan' });
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
    expect(meter).toHaveAttribute('aria-valuenow', '85');
    expect(meter.getAttribute('aria-valuetext')).toContain('85%');
    expect(meter.closest('.mads-storage-meter')).toHaveClass('mads-storage-meter--warning');

    render(<StorageMeter label="Cadangan" used={98} quota={100} />);
    expect(screen.getByRole('meter', { name: 'Cadangan' }).closest('.mads-storage-meter')).toHaveClass(
      'mads-storage-meter--critical',
    );
  });

  it('PermissionBadge always exposes the permission label and reason', () => {
    render(
      <PermissionBadge
        permission="storage.app"
        granted="declared"
        label="Penyimpanan app"
        reason="Menyimpan data aplikasi."
      />,
    );
    const badge = screen.getByText('Penyimpanan app').closest('.mads-permission-badge');
    expect(badge).not.toBeNull();
    expect(badge).toHaveAttribute('title', 'Menyimpan data aplikasi.');
  });
});

describe('feedback', () => {
  it('Toast is a status region with a labelled dismiss action', () => {
    const onDismiss = vi.fn();
    render(<Toast message="Perubahan tersimpan" tone="success" onDismiss={onDismiss} />);
    const toast = screen.getByRole('status');
    expect(toast).toHaveTextContent('Perubahan tersimpan');
    fireEvent.click(screen.getByRole('button', { name: 'Tutup notifikasi' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('ErrorSurface is an alert with the error code', () => {
    render(
      <ErrorSurface
        code="E-RUN-003"
        title="Izin ditolak"
        description="Aplikasi meminta izin yang tidak dideklarasikan."
        actions={<Button>Tinjau izin</Button>}
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('E-RUN-003');
    expect(alert).toHaveTextContent('Izin ditolak');
    expect(screen.getByRole('button', { name: 'Tinjau izin' })).toBeInTheDocument();
  });

  it('Alert renders a block body with a trailing actions row', () => {
    render(
      <Alert
        tone="warning"
        title="Kuota penyimpanan hampir penuh"
        actions={<Button variant="secondary">Kelola data</Button>}
      >
        <p>Gunakan backup lalu hapus aplikasi yang tidak dipakai.</p>
        <ul>
          <li>Ekspor data aplikasi</li>
        </ul>
      </Alert>,
    );

    const alert = screen.getByRole('status');
    expect(alert).toHaveClass('mads-alert--warning');
    expect(within(alert).getByText('Kuota penyimpanan hampir penuh')).toBeInTheDocument();
    expect(within(alert).getByText('Gunakan backup lalu hapus aplikasi yang tidak dipakai.')).toBeInTheDocument();
    expect(within(alert).getByRole('list')).toBeInTheDocument();
    expect(within(alert).getByRole('button', { name: 'Kelola data' })).toBeInTheDocument();
    expect(alert.querySelector('.mads-alert__icon')).not.toBeNull();
    expect(alert).toHaveTextContent('Peringatan');
  });

  it('Banner carries a tone label and a labelled dismiss control', () => {
    const onDismiss = vi.fn();
    render(
      <Banner tone="error" title="Gagal menyimpan" onDismiss={onDismiss} dismissLabel="Tutup galat">
        Perubahan disimpan di perangkat.
      </Banner>,
    );
    const banner = screen.getByRole('alert');
    expect(banner).toHaveClass('mads-banner--error');
    expect(banner).toHaveTextContent('Galat');
    fireEvent.click(screen.getByRole('button', { name: 'Tutup galat' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('AIStatus announces state and AIError offers a retry', () => {
    const onRetry = vi.fn();
    render(
      <>
        <AIStatus state="thinking" />
        <AIError code="E-CREATE-003" message="Jawaban provider tidak valid." onRetry={onRetry} />
      </>,
    );
    expect(screen.getByText('Memproses…').closest('[aria-live="polite"]')).not.toBeNull();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('E-CREATE-003');
    expect(alert).toHaveTextContent('Jawaban provider tidak valid.');
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders OfflineBanner only while offline', () => {
    const { container, rerender } = render(<OfflineBanner offline={false} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<OfflineBanner offline />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent(/offline/i);
  });

  it('ErrorBoundary renders a fallback with a reset action', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Boom(): never {
      throw new Error('komponen gagal');
    }
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('komponen gagal');
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('ErrorBoundary passes the error to a custom fallback', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Boom(): never {
      throw new Error('kustom');
    }
    render(
      <ErrorBoundary fallback={(error) => <p role="alert">{error.message}</p>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('kustom');
    consoleError.mockRestore();
  });
});

describe('layout and navigation', () => {
  it('AppShell renders exactly one main with the given id and the skip link first', () => {
    const onNavigate = vi.fn();
    const { container } = render(
      <AppShell
        mainId="konten-utama"
        mainLabel="Konten halaman"
        header={<span>MicroApp Studio</span>}
        sidebar={
          <Sidebar
            label="Navigasi utama"
            items={[
              { id: 'home', label: 'Beranda', href: '/', active: true, onNavigate },
              { id: 'templates', label: 'Template', href: '/templates', onNavigate },
            ]}
          />
        }
      >
        <h1>Beranda</h1>
      </AppShell>,
    );

    expect(container.querySelectorAll('main')).toHaveLength(1);
    const main = screen.getByRole('main', { name: 'Konten halaman' });
    expect(main).toHaveAttribute('id', 'konten-utama');
    expect(main).toHaveAttribute('tabindex', '-1');

    const shell = container.querySelector('.mads-app-shell') as HTMLElement;
    const skip = shell.firstElementChild as HTMLElement;
    expect(skip.tagName).toBe('A');
    expect(skip).toHaveTextContent('Lewati ke konten');
    expect(skip).toHaveAttribute('href', '#konten-utama');
    expect(screen.getByRole('banner')).toHaveTextContent('MicroApp Studio');

    const link = screen.getByRole('link', { name: 'Beranda' });
    expect(link).toHaveAttribute('href', '/');
    expect(link).toHaveAttribute('aria-current', 'page');
    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledWith('/', expect.anything());
    expect(screen.getByRole('link', { name: 'Template' })).not.toHaveAttribute('aria-current');
  });

  it('AppShell switches navigation slots with the variant', () => {
    const { container, rerender } = render(
      <AppShell variant="mobile" dock={<Dock label="Dock aplikasi" items={[{ id: 'home', label: 'Beranda', href: '/' }]} />}>
        <p>Isi</p>
      </AppShell>,
    );
    expect(screen.getByRole('navigation', { name: 'Dock aplikasi' })).toBeInTheDocument();
    expect(container.querySelector('.mads-app-shell__sidebar')).toBeNull();

    rerender(
      <AppShell variant="rail" rail={<Sidebar label="Rel navigasi" items={[{ id: 'home', label: 'Beranda', href: '/' }]} />}>
        <p>Isi</p>
      </AppShell>,
    );
    expect(screen.getByRole('navigation', { name: 'Rel navigasi' })).toBeInTheDocument();
    expect(container.querySelector('.mads-app-shell__dock')).toBeNull();
  });

  it('WorkspaceSwitcher exposes a listbox and selects a workspace', async () => {
    const onSelect = vi.fn();
    render(
      <WorkspaceSwitcher
        workspaces={[
          { id: 'personal', name: 'Personal' },
          { id: 'work', name: 'Kerja' },
        ]}
        activeId="personal"
        onSelect={onSelect}
      />,
    );

    const trigger = screen.getByRole('button', { name: /Personal/ });
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox', { name: 'Daftar workspace' });
    await waitFor(() =>
      expect(within(listbox).getByRole('option', { name: 'Personal' })).toHaveFocus(),
    );

    fireEvent.click(within(listbox).getByRole('option', { name: 'Kerja' }));
    expect(onSelect).toHaveBeenCalledWith('work');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('Card titles its section and exposes the footer', () => {
    render(
      <Card title="Ringkasan" footer={<Button variant="ghost">Detail</Button>}>
        Isi ringkasan
      </Card>,
    );
    const region = screen.getByRole('region', { name: 'Ringkasan' });
    expect(region).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Detail' })).toBeInTheDocument();
  });

  it('Stack and Grid map props to token-based classes', () => {
    const { container } = render(
      <Stack direction="row" gap="lg" align="center">
        <span>satu</span>
      </Stack>,
    );
    const stack = container.firstElementChild as HTMLElement;
    expect(stack).toHaveClass('mads-stack--row', 'mads-stack--gap-lg', 'mads-stack--align-center');

    const { container: gridContainer } = render(
      <Grid columns={99} gap="sm">
        <span>dua</span>
      </Grid>,
    );
    expect(gridContainer.firstElementChild).toHaveClass('mads-grid--cols-12', 'mads-grid--gap-sm');
  });

  it('Toolbar supports arrow-key roving focus', () => {
    render(
      <Toolbar label="Aksi aplikasi">
        <Button>A</Button>
        <Button>B</Button>
      </Toolbar>,
    );
    const toolbar = screen.getByRole('toolbar', { name: 'Aksi aplikasi' });
    const buttons = within(toolbar).getAllByRole('button');
    (buttons[0] as HTMLElement).focus();
    fireEvent.keyDown(toolbar, { key: 'ArrowRight' });
    expect(buttons[1]).toHaveFocus();
    fireEvent.keyDown(toolbar, { key: 'ArrowRight' });
    expect(buttons[0]).toHaveFocus();
  });

  it('EmptyState renders title, description, and action', () => {
    render(
      <EmptyState
        title="Belum ada aplikasi"
        description="Pasang paket .mapp untuk memulai."
        action={<Button>Pasang aplikasi</Button>}
      />,
    );
    expect(screen.getByText('Belum ada aplikasi')).toBeInTheDocument();
    expect(screen.getByText('Pasang paket .mapp untuk memulai.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pasang aplikasi' })).toBeInTheDocument();
  });

  it('Breadcrumb marks the last item as the current page', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Beranda', href: '/' },
          { label: 'Paket', href: '/packages' },
          { label: 'Kasir Warung' },
        ]}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Remah roti' });
    expect(within(nav).getByRole('link', { name: 'Beranda' })).toHaveAttribute('href', '/');
    expect(within(nav).getByText('Kasir Warung')).toHaveAttribute('aria-current', 'page');
  });

  it('Stepper exposes the current step and marks completed steps in text', () => {
    render(
      <Stepper
        label="Langkah pemasangan"
        activeIndex={1}
        steps={[
          { id: 'verify', label: 'Verifikasi' },
          { id: 'install', label: 'Pemasangan' },
          { id: 'open', label: 'Buka' },
        ]}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Langkah pemasangan' });
    const current = within(nav).getByText('Pemasangan').closest('li') as HTMLElement;
    expect(current).toHaveAttribute('aria-current', 'step');
    expect(within(nav).getByText('Verifikasi').closest('li')).toHaveTextContent('selesai');
  });

  it('TabBar roves with arrow keys and wires tab ids', () => {
    const onChange = vi.fn();
    render(
      <TabBar
        label="Bagian paket"
        idPrefix="paket"
        activeId="installed"
        onChange={onChange}
        tabs={[
          { id: 'installed', label: 'Terpasang' },
          { id: 'sources', label: 'Sumber' },
        ]}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    const first = tabs[0] as HTMLElement;
    const second = tabs[1] as HTMLElement;
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(first).toHaveAttribute('id', 'paket-tab-installed');
    // No `aria-controls`: the bar is also used as a filter, and a reference to a
    // panel that does not exist is a serious ARIA violation (axe
    // aria-valid-attr-value). Consumers that render a panel wire it themselves.
    expect(first).not.toHaveAttribute('aria-controls');
    expect(first).toHaveAttribute('tabindex', '0');
    expect(second).toHaveAttribute('tabindex', '-1');

    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('sources');
    expect(second).toHaveFocus();
    fireEvent.keyDown(second, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith('installed');
    expect(first).toHaveFocus();
  });

  it('Menu opens with Shift+F10 and closes on Escape with focus restored', async () => {
    const onSelect = vi.fn();
    render(
      <Menu
        label="Opsi aplikasi"
        items={[
          { id: 'open', label: 'Buka', onSelect },
          { id: 'remove', label: 'Hapus', danger: true, onSelect },
        ]}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Opsi aplikasi' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'F10', shiftKey: true });
    const menu = screen.getByRole('menu', { name: 'Opsi aplikasi' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const items = within(menu).getAllByRole('menuitem');
    await waitFor(() => expect(items[0]).toHaveFocus());

    fireEvent.keyDown(items[0] as HTMLElement, { key: 'ArrowDown' });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(items[1] as HTMLElement, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('ScrollArea becomes a focusable labelled region when scrollable', () => {
    const { rerender } = render(<ScrollArea label="Daftar aplikasi">Isi</ScrollArea>);
    expect(screen.queryByRole('region', { name: 'Daftar aplikasi' })).not.toBeInTheDocument();

    rerender(
      <ScrollArea label="Daftar aplikasi" scrollable>
        Isi
      </ScrollArea>,
    );
    const region = screen.getByRole('region', { name: 'Daftar aplikasi' });
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('Tooltip shows on focus, describes the trigger, and dismisses on Escape', () => {
    render(
      <Tooltip content="Hanya tersimpan di perangkat ini.">
        <Button>Lokal</Button>
      </Tooltip>,
    );

    const trigger = screen.getByRole('button', { name: 'Lokal' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.focus(trigger);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Hanya tersimpan di perangkat ini.');
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id);

    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('FieldError is an alert linked by id', () => {
    render(<FieldError id="prompt-error">Prompt tidak boleh kosong.</FieldError>);
    const error = screen.getByRole('alert');
    expect(error).toHaveAttribute('id', 'prompt-error');
    expect(error).toHaveTextContent('Prompt tidak boleh kosong.');
  });

  it('SuggestionChip reports its pressed state', () => {
    const onClick = vi.fn();
    render(
      <>
        <SuggestionChip onClick={onClick}>Aplikasi kasir</SuggestionChip>
        <SuggestionChip pressed onClick={onClick}>
          Daftar tugas
        </SuggestionChip>
      </>,
    );
    const unpressed = screen.getByRole('button', { name: 'Aplikasi kasir' });
    expect(unpressed).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(unpressed);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Daftar tugas' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('accessibility (axe)', () => {
  it(
    'AppShell has no serious or critical violations',
    async () => {
      const { container } = render(
        <AppShell
          header={<h1>MicroApp Studio</h1>}
          sidebar={
            <Sidebar
              label="Navigasi utama"
              items={[
                { id: 'home', label: 'Beranda', href: '/', active: true },
                { id: 'templates', label: 'Template', href: '/templates', badge: 3 },
              ]}
            />
          }
        >
          <p>Konten utama</p>
        </AppShell>,
      );

      const results = await axe.run(container, {
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(blockingViolations(results)).toEqual([]);
    },
    20000,
  );

  it(
    'CommandPalette has no serious or critical violations',
    async () => {
      const { container } = render(
        <CommandPalette
          open
          onClose={() => {}}
          commands={[{ id: 'settings', label: 'Buka Pengaturan', run: () => {} }]}
        />,
      );

      const results = await axe.run(container, {
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(blockingViolations(results)).toEqual([]);
    },
    20000,
  );

  it(
    'host controls have no serious or critical violations',
    async () => {
      const { container } = render(
        <div>
          <Banner tone="info" title="Pemberitahuan">
            Pembaruan tersedia.
          </Banner>
          <RadioGroup
            label="Tema"
            value="system"
            onChange={() => {}}
            options={[
              { value: 'system', label: 'Ikuti sistem' },
              { value: 'dark', label: 'Gelap', description: 'Kontras rendah.' },
            ]}
          />
          <Slider label="Skala teks" value={100} onChange={() => {}} valueText="100%" />
          <StorageMeter label="Penyimpanan" used={40} quota={100} />
          <Breadcrumb items={[{ label: 'Beranda', href: '/' }, { label: 'Paket' }]} />
          <Stepper label="Langkah" activeIndex={0} steps={[{ id: 'a', label: 'Verifikasi' }, { id: 'b', label: 'Pasang' }]} />
          <PermissionBadge permission="storage.app" granted="granted" label="Penyimpanan app" />
          <AIStatus state="idle" />
          <SuggestionChip>Aplikasi kasir</SuggestionChip>
        </div>,
      );

      const results = await axe.run(container, {
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(blockingViolations(results)).toEqual([]);
    },
    20000,
  );
});
