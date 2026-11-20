// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axe, { type AxeResults } from 'axe-core';
import {
  Alert,
  AppShell,
  Badge,
  Button,
  Card,
  Checkbox,
  CommandPalette,
  DataTable,
  Dock,
  EmptyState,
  ErrorBoundary,
  ErrorSurface,
  Grid,
  IconButton,
  Image,
  List,
  Modal,
  OfflineBanner,
  Progress,
  SearchField,
  Select,
  Sheet,
  Sidebar,
  Skeleton,
  Stack,
  StatCard,
  Switch,
  TextArea,
  TextField,
  Toast,
  Toolbar,
  WorkspaceSwitcher,
  tokens,
} from '../index';

afterEach(cleanup);

function blockingViolations(results: AxeResults): string[] {
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.help}`);
}

describe('tokens', () => {
  it('exposes MADS tokens as CSS custom property references', () => {
    expect(tokens.color.primary).toBe('var(--mads-color-primary)');
    expect(tokens.space[16]).toBe('var(--mads-space-16)');
    expect(tokens.radius.full).toBe('var(--mads-radius-full)');
    expect(tokens.font.size[16]).toBe('var(--mads-font-size-16)');
    expect(tokens.motion[180]).toBe('var(--mads-motion-180)');
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
    fireEvent.submit(input.closest('form')!);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onChange).toHaveBeenCalledWith('');

    fireEvent.click(screen.getByRole('button', { name: 'Bersihkan pencarian' }));
    expect(onChange).toHaveBeenCalledTimes(2);
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
  it('Modal moves focus inside and closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Hapus catatan" onClose={onClose} footer={<Button variant="danger">Hapus</Button>}>
        Tindakan ini tidak dapat dibatalkan.
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Hapus catatan' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Sheet renders on the requested side, takes focus, and closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <Sheet open title="Panel properti" side="left" onClose={onClose}>
        Isi panel
      </Sheet>,
    );

    const sheet = screen.getByRole('dialog', { name: 'Panel properti' });
    expect(sheet).toHaveClass('mads-sheet--left');
    await waitFor(() => expect(sheet).toContainElement(document.activeElement as HTMLElement));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
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
        code="E-SBX-005"
        title="Izin ditolak"
        description="Aplikasi meminta kamera tanpa izin."
        actions={<Button>Tinjau izin</Button>}
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('E-SBX-005');
    expect(alert).toHaveTextContent('Izin ditolak');
    expect(screen.getByRole('button', { name: 'Tinjau izin' })).toBeInTheDocument();
  });

  it('renders Alert tones with matching live roles', () => {
    render(
      <>
        <Alert tone="danger" title="Gagal menyimpan">
          Data tidak tersimpan.
        </Alert>
        <Alert tone="success">Berhasil dipasang.</Alert>
      </>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Gagal menyimpan');
    expect(screen.getByRole('status')).toHaveTextContent('Berhasil dipasang.');
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
  it('AppShell exposes landmarks, skip link, and main target', () => {
    const onSelect = vi.fn();
    render(
      <AppShell
        header={<span>MicroApp Studio</span>}
        sidebar={
          <Sidebar
            label="Navigasi utama"
            items={[{ id: 'home', label: 'Beranda', active: true, onSelect }]}
          />
        }
        dock={<Dock label="Dock aplikasi" items={[{ id: 'notes', label: 'Catatan', onSelect }]} />}
      >
        <h1>Beranda</h1>
      </AppShell>,
    );

    expect(screen.getByRole('banner')).toHaveTextContent('MicroApp Studio');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'mads-main');
    expect(screen.getByRole('link', { name: 'Lewati ke konten utama' })).toHaveAttribute(
      'href',
      '#mads-main',
    );
    expect(screen.getByRole('navigation', { name: 'Navigasi utama' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Dock aplikasi' })).toBeInTheDocument();

    const current = screen.getByRole('button', { name: 'Beranda' });
    expect(current).toHaveAttribute('aria-current', 'page');
    fireEvent.click(current);
    expect(onSelect).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Catatan' }));
    expect(onSelect).toHaveBeenCalledTimes(2);
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
    const stack = container.firstElementChild!;
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
    buttons[0]!.focus();
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
              items={[{ id: 'home', label: 'Beranda', active: true, onSelect: () => {} }]}
            />
          }
          dock={<Dock label="Dock aplikasi" items={[{ id: 'apps', label: 'Aplikasi', onSelect: () => {} }]} />}
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
});
