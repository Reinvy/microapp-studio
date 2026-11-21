import {
  Children,
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cx } from './utils';

/* ---------- ScrollArea (MADS-LAY-11) ---------- */

export interface ScrollAreaProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'aria-label' | 'tabIndex'> {
  /** Accessible name; applied only when the region actually scrolls. */
  label: string;
  maxHeight?: number | string;
  /** Force the scrollable affordance (useful in tests and previews). */
  scrollable?: boolean;
  children: ReactNode;
}

/**
 * Scroll container. When content overflows it becomes a keyboard-focusable
 * labelled region, because an overflowing box is useless without a tab stop.
 */
export function ScrollArea({
  label,
  maxHeight,
  scrollable,
  children,
  className,
  style,
  ...rest
}: ScrollAreaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(scrollable ?? false);

  useEffect(() => {
    if (scrollable !== undefined) {
      setOverflowing(scrollable);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const measure = () => setOverflowing(node.scrollHeight > node.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [scrollable]);

  return (
    <div
      {...rest}
      ref={ref}
      className={cx('mads-scroll-area', overflowing && 'mads-scroll-area--scrollable', className)}
      style={{
        ...style,
        ...(maxHeight !== undefined
          ? { maxBlockSize: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }
          : null),
      }}
      role={overflowing ? 'region' : undefined}
      aria-label={overflowing ? label : undefined}
      tabIndex={overflowing ? 0 : undefined}
    >
      {children}
    </div>
  );
}

/* ---------- Avatar (MADS-DATA-20) ---------- */

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
}

function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '?';
  const second = words.length > 1 ? (words[1]?.[0] ?? '') : '';
  return `${first}${second}`.toUpperCase();
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <span className={cx('mads-avatar', `mads-avatar--${size}`, className)}>
      {src ? (
        <img className="mads-avatar__image" src={src} alt={name} />
      ) : (
        <span className="mads-avatar__initials" role="img" aria-label={name}>
          {initialsFrom(name)}
        </span>
      )}
    </span>
  );
}

/* ---------- AppIcon (MADS-DATA-21) ---------- */

export type AppIconSize = 'sm' | 'md' | 'lg';
export type ClayTint = 'mint' | 'lilac' | 'peach' | 'butter' | 'sky';

const CLAY_TINTS: ClayTint[] = ['mint', 'lilac', 'peach', 'butter', 'sky'];

/** Deterministic, dependency-free hash so an app always gets the same tint. */
export function clayTintFor(appId: string): ClayTint {
  let hash = 5381;
  for (let index = 0; index < appId.length; index += 1) {
    hash = ((hash << 5) + hash + appId.charCodeAt(index)) >>> 0;
  }
  return CLAY_TINTS[hash % CLAY_TINTS.length] as ClayTint;
}

export interface AppIconProps {
  appId: string;
  name: string;
  size?: AppIconSize;
  className?: string;
}

/**
 * Local, generated app icon: a clay tint chosen from the app id plus the app's
 * initial. No image leaves the device.
 */
export function AppIcon({ appId, name, size = 'md', className }: AppIconProps) {
  const tint = clayTintFor(appId);
  const initial = (name.trim()[0] ?? appId[0] ?? '?').toUpperCase();
  return (
    <span
      className={cx('mads-app-icon', `mads-app-icon--${size}`, className)}
      data-tint={tint}
      role="img"
      aria-label={name}
    >
      <span className="mads-app-icon__initial" aria-hidden="true">
        {initial}
      </span>
    </span>
  );
}

/* ---------- Tooltip (MADS-FBK-06) ---------- */

interface TooltipTriggerProps {
  'aria-describedby'?: string;
}

export interface TooltipProps {
  content: ReactNode;
  /** Exactly one focusable element. */
  children: ReactElement;
  className?: string;
}

/**
 * Tooltip on hover *and* focus. The bubble is a real `role="tooltip"` node and
 * the trigger gains `aria-describedby` while it is open; Escape dismisses it.
 */
export function Tooltip({ content, children, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const trigger = Children.only(children) as ReactElement<TooltipTriggerProps>;

  return (
    <span
      className={cx('mads-tooltip', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      {cloneElement(trigger, {
        'aria-describedby': open ? tooltipId : trigger.props['aria-describedby'],
      })}
      {open ? (
        <span className="mads-tooltip__bubble" role="tooltip" id={tooltipId}>
          {content}
        </span>
      ) : null}
    </span>
  );
}

/* ---------- FieldError (MADS-INP-13) ---------- */

export interface FieldErrorProps {
  /** Id the control points at through `aria-describedby`. */
  id: string;
  children: ReactNode;
  className?: string;
}

export function FieldError({ id, children, className }: FieldErrorProps) {
  return (
    <p className={cx('mads-field-error', className)} id={id} role="alert">
      {children}
    </p>
  );
}
