import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Glyph } from './icons';
import { cx } from './utils';

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** Destructive entries are announced and styled as such. */
  danger?: boolean;
  onSelect: () => void;
}

export interface MenuProps {
  /** Accessible name for the trigger button. */
  label: string;
  items: MenuItem[];
  /** Trigger glyph; defaults to the "more" dots. */
  icon?: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

/**
 * Application menu (`role="menu"`). Opens on click or `Shift+F10` from its
 * trigger, roves with Arrow/Home/End, closes on Escape, outside click, or
 * selection, and always restores focus to the trigger.
 */
export function Menu({ label, items, icon, align = 'end', className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const firstEnabled = items.findIndex((item) => !item.disabled);

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    itemRefs.current[firstEnabled]?.focus();
    const handlePointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, [open, firstEnabled]);

  const focusItem = (index: number) => {
    itemRefs.current[index]?.focus();
  };

  const move = (from: number, step: number) => {
    if (items.length === 0) return;
    let next = from;
    for (let attempt = 0; attempt < items.length; attempt += 1) {
      next = (next + step + items.length) % items.length;
      if (!items[next]?.disabled) {
        focusItem(next);
        return;
      }
    }
  };

  const handleItemKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const key = event.key;
    if (key === 'ArrowDown') {
      event.preventDefault();
      move(index, 1);
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      move(index, -1);
    } else if (key === 'Home') {
      event.preventDefault();
      move(-1, 1);
    } else if (key === 'End') {
      event.preventDefault();
      move(0, -1);
    } else if (key === 'Escape') {
      event.preventDefault();
      close();
    } else if (key === 'Tab') {
      close(false);
    }
  };

  const select = (item: MenuItem) => {
    if (item.disabled) return;
    item.onSelect();
    close();
  };

  return (
    <div className={cx('mads-menu', className)} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="mads-icon-button mads-icon-button--ghost mads-menu__trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(event) => {
          if (event.shiftKey && event.key === 'F10') {
            event.preventDefault();
            setOpen(true);
          } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            close();
          }
        }}
      >
        <span className="mads-icon-button__icon" aria-hidden="true">
          {icon ?? <Glyph name="more" size={18} />}
        </span>
      </button>
      {open ? (
        <ul
          className={cx('mads-menu__list', `mads-menu__list--${align}`)}
          id={menuId}
          role="menu"
          aria-label={label}
        >
          {items.map((item, index) => (
            <li key={item.id} role="none">
              <button
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={cx('mads-menu__item', item.danger && 'mads-menu__item--danger')}
                disabled={item.disabled}
                onClick={() => select(item)}
                onKeyDown={(event) => handleItemKeyDown(event, index)}
              >
                {item.icon ? (
                  <span className="mads-menu__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
