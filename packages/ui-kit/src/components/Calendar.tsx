import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Glyph } from './icons';
import { cx } from './utils';

export interface CalendarProps {
  /** BCP-47 locale; every month and weekday name comes from `Intl`. */
  locale: string;
  /** Selected day as `YYYY-MM-DD` (local calendar day). */
  value?: string;
  onChange?: (isoDate: string) => void;
  /** Controlled month anchor. Defaults to the selected day's month. */
  month?: Date;
  onMonthChange?: (month: Date) => void;
  isDateDisabled?: (date: Date) => boolean;
  label?: string;
  previousLabel?: string;
  nextLabel?: string;
  className?: string;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const day = Math.min(date.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate());
  return new Date(target.getFullYear(), target.getMonth(), day);
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIso(value: string | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Locale week start: 0 = Sunday … 6 = Saturday. */
function weekStartFor(locale: string): number {
  try {
    const info = (new Intl.Locale(locale) as Intl.Locale & { weekInfo?: { firstDay: number } })
      .weekInfo;
    if (info && typeof info.firstDay === 'number') return info.firstDay % 7;
  } catch {
    /* older runtimes: fall through to the region default */
  }
  return locale.toLowerCase().startsWith('en') ? 0 : 1;
}

/**
 * Month grid (`role="grid"`) with full keyboard navigation. Month and weekday
 * names are always produced by `Intl.DateTimeFormat`, so `id-ID` reads
 * "November 2026" / "Sen" and `en-US` reads "November 2026" / "Mon".
 */
export function Calendar({
  locale,
  value,
  onChange,
  month,
  onMonthChange,
  isDateDisabled,
  label = 'Kalender',
  previousLabel = 'Bulan sebelumnya',
  nextLabel = 'Bulan berikutnya',
  className,
}: CalendarProps) {
  const monthLabelId = useId();
  const selectedDate = parseIso(value);
  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(month ?? selectedDate ?? new Date()));
  const [focusedDate, setFocusedDate] = useState<Date>(() => selectedDate ?? new Date());
  const gridRef = useRef<HTMLTableElement>(null);
  const pendingFocus = useRef(false);
  const weekStart = weekStartFor(locale);
  const shownAnchor = month ? startOfMonth(month) : anchor;

  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    const target = gridRef.current?.querySelector<HTMLElement>(
      `[data-date="${toIso(focusedDate)}"]`,
    );
    target?.focus();
  }, [focusedDate, shownAnchor]);

  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    shownAnchor,
  );
  const weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  const weekdayNames = Array.from({ length: 7 }, (_, index) =>
    weekdayFormat.format(new Date(Date.UTC(2024, 0, 7 + ((weekStart + index) % 7)))),
  );

  const firstOfMonth = startOfMonth(shownAnchor);
  const leading = (firstOfMonth.getDay() - weekStart + 7) % 7;
  const daysInMonth = new Date(shownAnchor.getFullYear(), shownAnchor.getMonth() + 1, 0).getDate();
  const weekCount = Math.ceil((leading + daysInMonth) / 7);
  const todayIso = toIso(new Date());

  const changeMonth = (next: Date) => {
    const normalized = startOfMonth(next);
    if (!month) setAnchor(normalized);
    onMonthChange?.(normalized);
  };

  const moveTo = (next: Date) => {
    if (
      next.getMonth() !== shownAnchor.getMonth() ||
      next.getFullYear() !== shownAnchor.getFullYear()
    ) {
      changeMonth(next);
    }
    pendingFocus.current = true;
    setFocusedDate(next);
  };

  const select = (date: Date) => {
    if (isDateDisabled?.(date)) return;
    setFocusedDate(date);
    if (date.getMonth() !== shownAnchor.getMonth()) changeMonth(date);
    onChange?.(toIso(date));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const key = event.key;
    let next: Date | null = null;
    if (key === 'ArrowLeft') next = addDays(focusedDate, -1);
    else if (key === 'ArrowRight') next = addDays(focusedDate, 1);
    else if (key === 'ArrowUp') next = addDays(focusedDate, -7);
    else if (key === 'ArrowDown') next = addDays(focusedDate, 7);
    else if (key === 'Home') {
      next = addDays(focusedDate, -((focusedDate.getDay() - weekStart + 7) % 7));
    } else if (key === 'End') {
      next = addDays(focusedDate, 6 - ((focusedDate.getDay() - weekStart + 7) % 7));
    } else if (key === 'PageUp') next = addMonths(focusedDate, -1);
    else if (key === 'PageDown') next = addMonths(focusedDate, 1);
    else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      select(focusedDate);
      return;
    }
    if (!next) return;
    event.preventDefault();
    moveTo(next);
  };

  return (
    <div className={cx('mads-calendar', className)}>
      <div className="mads-calendar__header">
        <button
          type="button"
          className="mads-icon-button mads-icon-button--ghost"
          aria-label={previousLabel}
          onClick={() => changeMonth(addMonths(shownAnchor, -1))}
        >
          <Glyph name="chevron-left" />
        </button>
        <p className="mads-calendar__month" id={monthLabelId} aria-live="polite">
          {monthLabel}
        </p>
        <button
          type="button"
          className="mads-icon-button mads-icon-button--ghost"
          aria-label={nextLabel}
          onClick={() => changeMonth(addMonths(shownAnchor, 1))}
        >
          <Glyph name="chevron-right" />
        </button>
      </div>
      <table
        ref={gridRef}
        className="mads-calendar__grid"
        role="grid"
        aria-label={label}
        onKeyDown={handleKeyDown}
      >
        <thead>
          <tr role="row">
            {weekdayNames.map((weekday, index) => (
              <th key={`${weekday}-${index}`} role="columnheader" scope="col" abbr={weekday}>
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: weekCount }, (_, weekIndex) => (
            <tr key={weekIndex} role="row">
              {Array.from({ length: 7 }, (_, dayIndex) => {
                const dayNumber = weekIndex * 7 + dayIndex - leading + 1;
                if (dayNumber < 1 || dayNumber > daysInMonth) {
                  return (
                    <td
                      key={dayIndex}
                      role="gridcell"
                      aria-disabled="true"
                      className="mads-calendar__cell mads-calendar__cell--empty"
                    />
                  );
                }
                const date = new Date(shownAnchor.getFullYear(), shownAnchor.getMonth(), dayNumber);
                const iso = toIso(date);
                const isSelected = iso === value;
                const isDisabled = isDateDisabled?.(date) ?? false;
                const isFocusTarget = iso === toIso(focusedDate);
                return (
                  <td
                    key={dayIndex}
                    role="gridcell"
                    aria-selected={isSelected}
                    aria-disabled={isDisabled || undefined}
                    aria-current={iso === todayIso ? 'date' : undefined}
                    className="mads-calendar__cell"
                  >
                    <button
                      type="button"
                      className={cx(
                        'mads-calendar__day',
                        isSelected && 'mads-calendar__day--selected',
                        isDisabled && 'mads-calendar__day--disabled',
                      )}
                      data-date={iso}
                      tabIndex={isFocusTarget ? 0 : -1}
                      disabled={isDisabled}
                      aria-label={new Intl.DateTimeFormat(locale, {
                        dateStyle: 'full',
                      }).format(date)}
                      onClick={() => select(date)}
                    >
                      {dayNumber}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
