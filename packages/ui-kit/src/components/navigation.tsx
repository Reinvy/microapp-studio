import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cx, useDialogFocus } from './utils';

/* ---------- Sidebar (MADS-NAV-01) ---------- */

export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  onSelect: () => void;
}

export interface SidebarProps {
  items: SidebarItem[];
  label: string;
  className?: string;
}

export function Sidebar({ items, label, className }: SidebarProps) {
  return (
    <nav className={cx('mads-sidebar', className)} aria-label={label}>
      <ul className="mads-sidebar__list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="mads-sidebar__item"
              aria-current={item.active ? 'page' : undefined}
              onClick={item.onSelect}
            >
              {item.icon ? (
                <span className="mads-sidebar__icon" aria-hidden="true">
                  {item.icon}
                </span>
              ) : null}
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ---------- Dock (MADS-NAV-08) ---------- */

export interface DockItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
}

export interface DockProps {
  items: DockItem[];
  label: string;
  className?: string;
}

export function Dock({ items, label, className }: DockProps) {
  return (
    <nav className={cx('mads-dock', className)} aria-label={label}>
      <ul className="mads-dock__list">
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" className="mads-dock__item" onClick={item.onSelect}>
              {item.icon ? (
                <span className="mads-dock__icon" aria-hidden="true">
                  {item.icon}
                </span>
              ) : null}
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ---------- WorkspaceSwitcher (MADS-NAV-09) ---------- */

export interface Workspace {
  id: string;
  name: string;
}

export interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function WorkspaceSwitcher({
  workspaces,
  activeId,
  onSelect,
  className,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeId);

  const focusOption = (index: number) => {
    optionRefs.current[index]?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const initial = Math.max(
      0,
      workspaces.findIndex((workspace) => workspace.id === activeId),
    );
    optionRefs.current[initial]?.focus();
    // Focus only when the list opens; workspace arrays may be recreated.
  }, [open]);

  const closeList = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const selectWorkspace = (id: string) => {
    onSelect(id);
    closeList();
  };

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLLIElement>, index: number) => {
    if (workspaces.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption((index + 1) % workspaces.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption((index - 1 + workspaces.length) % workspaces.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOption(workspaces.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const workspace = workspaces[index];
      if (workspace) selectWorkspace(workspace.id);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeList();
    }
  };

  return (
    <div className={cx('mads-workspace-switcher', className)}>
      <button
        ref={buttonRef}
        type="button"
        className="mads-workspace-switcher__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? closeList() : setOpen(true))}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>{activeWorkspace ? activeWorkspace.name : 'Pilih workspace'}</span>
        <span aria-hidden="true">&#9662;</span>
      </button>
      {open ? (
        <ul
          id={listId}
          className="mads-workspace-switcher__list"
          role="listbox"
          aria-label="Daftar workspace"
        >
          {workspaces.map((workspace, index) => (
            <li
              key={workspace.id}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              role="option"
              aria-selected={workspace.id === activeId}
              tabIndex={-1}
              className="mads-workspace-switcher__option"
              onClick={() => selectWorkspace(workspace.id)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
            >
              {workspace.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ---------- CommandPalette (MADS-NAV-04) ---------- */

export interface Command {
  id: string;
  label: string;
  run: () => void;
  keywords?: string[];
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useDialogFocus(open, onClose, 'first');
  const baseId = useId();
  const listId = `${baseId}-list`;
  const titleId = `${baseId}-title`;

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
  }, [open]);

  if (!open) return null;

  const normalized = query.trim().toLowerCase();
  const filtered =
    normalized === ''
      ? commands
      : commands.filter(
          (command) =>
            command.label.toLowerCase().includes(normalized) ||
            (command.keywords ?? []).some((keyword) =>
              keyword.toLowerCase().includes(normalized),
            ),
        );
  const safeIndex =
    filtered.length === 0 ? -1 : Math.min(activeIndex, filtered.length - 1);
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const execute = (command: Command) => {
    command.run();
    onClose();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(filtered.length === 0 ? 0 : (safeIndex + 1) % filtered.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(
        filtered.length === 0
          ? 0
          : (safeIndex - 1 + filtered.length) % filtered.length,
      );
    } else if (event.key === 'Enter') {
      const command = filtered[safeIndex];
      if (command) {
        event.preventDefault();
        execute(command);
      }
    }
  };

  return (
    <div
      className="mads-palette-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className="mads-palette"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="mads-palette__header">
          <h2 id={titleId} className="mads-visually-hidden">
            Palet perintah
          </h2>
          <input
            className="mads-palette__input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={safeIndex >= 0 ? optionId(safeIndex) : undefined}
            aria-label="Cari perintah"
            placeholder="Cari perintah…"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
          />
        </div>
        <ul id={listId} className="mads-palette__list" role="listbox" aria-label="Perintah">
          {filtered.map((command, index) => (
            <li
              key={command.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === safeIndex}
              className="mads-palette__option"
              onMouseDown={(event) => {
                event.preventDefault();
                execute(command);
              }}
            >
              {command.label}
            </li>
          ))}
        </ul>
        {filtered.length === 0 ? (
          <p className="mads-palette__empty">Tidak ada perintah yang cocok.</p>
        ) : null}
        <p className="mads-visually-hidden" aria-live="polite">
          {filtered.length} perintah tersedia
        </p>
      </div>
    </div>
  );
}
