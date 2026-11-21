import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './utils';

/* ---------- TabBar (MADS-NAV-10) ---------- */

export interface Tab {
  id: string;
  label: string;
  badge?: ReactNode;
  disabled?: boolean;
}

export interface TabBarProps {
  tabs: Tab[];
  activeId: string;
  onChange: (id: string) => void;
  label: string;
  /**
   * Prefix for the tab and panel ids: `tab-<id>` / `panel-<id>`. Consumers wire
   * their panel with `id={`${idPrefix}-panel-${tab.id}`}` and
   * `aria-labelledby={`${idPrefix}-tab-${tab.id}`}`.
   */
  idPrefix?: string;
  className?: string;
}

/**
 * Tab list with roving focus and automatic activation. Only the selected tab
 * is in the tab order; Arrow/Home/End move the selection and focus together.
 */
export function TabBar({ tabs, activeId, onChange, label, idPrefix, className }: TabBarProps) {
  const generated = useId();
  const prefix = idPrefix ?? `mads-tabs-${generated.replace(/:/g, '')}`;
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeId),
  );

  const focusTab = (index: number) => {
    tabRefs.current[index]?.focus();
  };

  const move = (from: number, step: number) => {
    if (tabs.length === 0) return;
    let next = from;
    for (let attempt = 0; attempt < tabs.length; attempt += 1) {
      next = (next + step + tabs.length) % tabs.length;
      const tab = tabs[next];
      if (tab && !tab.disabled) {
        onChange(tab.id);
        focusTab(next);
        return;
      }
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      move(index, 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(index, -1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      move(-1, 1);
    } else if (event.key === 'End') {
      event.preventDefault();
      move(0, -1);
    }
  };

  return (
    <div className={cx('mads-tab-bar', className)}>
      <div role="tablist" aria-label={label} className="mads-tab-bar__list">
        {tabs.map((tab, index) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${prefix}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${prefix}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              disabled={tab.disabled}
              className={cx('mads-tab', selected && 'mads-tab--selected')}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span className="mads-tab__label">{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== null ? (
                <span className="mads-tab__badge">{tab.badge}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="mads-visually-hidden" aria-live="polite">
        {tabs[activeIndex]?.label ?? ''}
      </p>
    </div>
  );
}

/* ---------- Breadcrumb (MADS-NAV-11) ---------- */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  label?: string;
  className?: string;
}

export function Breadcrumb({ items, label = 'Remah roti', className }: BreadcrumbProps) {
  return (
    <nav className={cx('mads-breadcrumb', className)} aria-label={label}>
      <ol className="mads-breadcrumb__list">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="mads-breadcrumb__item">
              {last ? (
                <span className="mads-breadcrumb__current" aria-current="page">
                  {item.label}
                </span>
              ) : item.href ? (
                <a className="mads-breadcrumb__link" href={item.href}>
                  {item.label}
                </a>
              ) : (
                <span className="mads-breadcrumb__text">{item.label}</span>
              )}
              {!last ? (
                <span className="mads-breadcrumb__separator" aria-hidden="true">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ---------- Stepper (MADS-NAV-12) ---------- */

export interface Step {
  id: string;
  label: string;
}

export interface StepperProps {
  steps: Step[];
  activeIndex: number;
  label: string;
  className?: string;
}

export function Stepper({ steps, activeIndex, label, className }: StepperProps) {
  return (
    <nav className={cx('mads-stepper', className)} aria-label={label}>
      <ol className="mads-stepper__list">
        {steps.map((step, index) => {
          const current = index === activeIndex;
          const completed = index < activeIndex;
          return (
            <li
              key={step.id}
              className={cx(
                'mads-stepper__step',
                current && 'mads-stepper__step--current',
                completed && 'mads-stepper__step--completed',
              )}
              aria-current={current ? 'step' : undefined}
            >
              <span className="mads-stepper__marker" aria-hidden="true">
                {completed ? '\u2713' : index + 1}
              </span>
              <span className="mads-stepper__label">{step.label}</span>
              {completed ? <span className="mads-visually-hidden"> (selesai)</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
