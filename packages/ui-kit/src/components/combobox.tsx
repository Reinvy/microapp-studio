import { useRef, useState, type KeyboardEvent } from 'react';
import { Glyph } from './icons';
import { cx, describedBy, useFieldIds } from './utils';

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyMessage?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Type-to-filter combobox. The input keeps text-entry semantics and drives a
 * `role="listbox"` popup through `aria-activedescendant`; Arrow keys move the
 * active option, Enter commits, Escape closes without changing the value.
 */
export function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder,
  emptyMessage = 'Tidak ada hasil.',
  description,
  error,
  disabled,
  id,
  className,
}: ComboboxProps) {
  const { fieldId, descriptionId, errorId } = useFieldIds(id);
  const listId = `${fieldId}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const selected = options.find((option) => option.value === value);
  const normalized = query.trim().toLowerCase();
  const filtered =
    normalized === ''
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(normalized));
  const activeIndexSafe =
    filtered.length === 0 ? -1 : Math.min(Math.max(activeIndex, 0), filtered.length - 1);
  const activeOption = activeIndexSafe >= 0 ? filtered[activeIndexSafe] : undefined;
  const optionId = (index: number) => `${fieldId}-option-${index}`;

  const openList = () => {
    setOpen(true);
    setActiveIndex(filtered.length > 0 ? 0 : -1);
  };

  const closeList = () => {
    setOpen(false);
    setActiveIndex(-1);
    setQuery('');
  };

  const commit = (option: ComboboxOption | undefined) => {
    if (!option) return;
    onChange(option.value);
    closeList();
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      setActiveIndex(filtered.length === 0 ? -1 : (activeIndex + 1) % filtered.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      setActiveIndex(
        filtered.length === 0 ? -1 : (activeIndex - 1 + filtered.length) % filtered.length,
      );
    } else if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(filtered.length === 0 ? -1 : 0);
    } else if (event.key === 'End' && open) {
      event.preventDefault();
      setActiveIndex(filtered.length === 0 ? -1 : filtered.length - 1);
    } else if (event.key === 'Enter') {
      if (open && activeOption) {
        event.preventDefault();
        commit(activeOption);
      }
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        closeList();
      }
    } else if (event.key === 'Tab') {
      closeList();
    }
  };

  return (
    <div className={cx('mads-combobox', className)}>
      <label className="mads-field__label" htmlFor={fieldId}>
        {label}
      </label>
      <div className="mads-combobox__control">
        <input
          ref={inputRef}
          id={fieldId}
          className="mads-field__control mads-combobox__input"
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          value={open ? query : (selected?.label ?? '')}
          placeholder={placeholder}
          disabled={disabled}
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={open && activeOption ? optionId(activeIndex) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(
            description ? descriptionId : undefined,
            error ? errorId : undefined,
          )}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) openList();
          }}
          onFocus={() => {
            if (!open && filtered.length > 0) openList();
          }}
          onBlur={() => closeList()}
          onKeyDown={handleKeyDown}
        />
        <span className="mads-combobox__chevron" aria-hidden="true">
          <Glyph name="chevron-down" />
        </span>
        {open ? (
          <ul
            className="mads-combobox__list"
            id={listId}
            role="listbox"
            aria-label={`${label} — pilihan`}
          >
            {filtered.length === 0 ? (
              <li className="mads-combobox__empty" role="presentation">
                {emptyMessage}
              </li>
            ) : (
              filtered.map((option, index) => (
                <li
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={option.value === value}
                  className={cx(
                    'mads-combobox__option',
                    index === activeIndex && 'mads-combobox__option--active',
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commit(option);
                  }}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
      {description ? (
        <p className="mads-field__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className="mads-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
