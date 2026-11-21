import {
  useId,
  useRef,
  type KeyboardEvent,
} from 'react';
import { cx, describedBy, useFieldIds } from './utils';

/* ---------- RadioGroup (MADS-INP-15) ---------- */

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  name?: string;
  description?: string;
  error?: string;
  id?: string;
  className?: string;
}

/**
 * Native radio inputs inside a `role="radiogroup"`. Arrow keys move the
 * selection (including a real focus move) so the group behaves the same in
 * every browser, not just the ones that implement radio roving natively.
 */
export function RadioGroup({
  label,
  value,
  onChange,
  options,
  name,
  description,
  error,
  id,
  className,
}: RadioGroupProps) {
  const { fieldId, descriptionId, errorId } = useFieldIds(id);
  const labelId = `${fieldId}-label`;
  const groupName = name ?? fieldId;
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const move = (from: number, step: number) => {
    if (options.length === 0) return;
    let next = from;
    for (let attempt = 0; attempt < options.length; attempt += 1) {
      next = (next + step + options.length) % options.length;
      const option = options[next];
      if (option && !option.disabled) {
        onChange(option.value);
        inputRefs.current[next]?.focus();
        return;
      }
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(index, 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
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
    <div
      className={cx('mads-radio-group', className)}
      role="radiogroup"
      aria-labelledby={labelId}
      aria-describedby={describedBy(
        description ? descriptionId : undefined,
        error ? errorId : undefined,
      )}
      aria-invalid={error ? true : undefined}
    >
      <span className="mads-field__label" id={labelId}>
        {label}
      </span>
      {description ? (
        <p className="mads-field__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      <div className="mads-radio-group__options">
        {options.map((option, index) => {
          const optionId = `${fieldId}-${option.value}`;
          const optionDescriptionId = option.description ? `${optionId}-description` : undefined;
          return (
            <label
              key={option.value}
              className={cx(
                'mads-radio',
                option.disabled && 'mads-radio--disabled',
                option.value === value && 'mads-radio--checked',
              )}
              htmlFor={optionId}
            >
              <input
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                id={optionId}
                className="mads-radio__input"
                type="radio"
                name={groupName}
                value={option.value}
                checked={option.value === value}
                disabled={option.disabled}
                onChange={() => onChange(option.value)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                aria-describedby={optionDescriptionId}
              />
              <span className="mads-radio__text">
                <span className="mads-radio__label">{option.label}</span>
                {option.description ? (
                  <span className="mads-radio__description" id={optionDescriptionId}>
                    {option.description}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p className="mads-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- Slider (MADS-INP-16) ---------- */

export interface SliderTick {
  value: number;
  label: string;
}

export interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Spoken value, for example "1.125 kali" instead of a bare number. */
  valueText?: string;
  ticks?: SliderTick[];
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  valueText,
  ticks,
  description,
  disabled,
  id,
  className,
}: SliderProps) {
  const { fieldId, descriptionId } = useFieldIds(id);
  return (
    <div className={cx('mads-slider', className)}>
      <div className="mads-slider__header">
        <label className="mads-field__label" htmlFor={fieldId}>
          {label}
        </label>
        <output className="mads-slider__output" htmlFor={fieldId}>
          {valueText ?? value}
        </output>
      </div>
      <input
        id={fieldId}
        className="mads-slider__input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={valueText ?? String(value)}
        aria-describedby={description ? descriptionId : undefined}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {ticks && ticks.length > 0 ? (
        <div className="mads-slider__ticks" aria-hidden="true">
          {ticks.map((tick) => (
            <span
              key={tick.value}
              className={cx(
                'mads-slider__tick',
                tick.value === value && 'mads-slider__tick--active',
              )}
            >
              {tick.label}
            </span>
          ))}
        </div>
      ) : null}
      {description ? (
        <p className="mads-field__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- PromptInput (MADS-INP-17) ---------- */

export interface PromptInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Cmd/Ctrl+Enter runs this. */
  onSubmit: () => void;
  maxLength?: number;
  placeholder?: string;
  description?: string;
  error?: string;
  rows?: number;
  disabled?: boolean;
  /** Hint shown next to the counter, defaults to the shortcut. */
  shortcutHint?: string;
  id?: string;
  className?: string;
}

export function PromptInput({
  label,
  value,
  onChange,
  onSubmit,
  maxLength = 2000,
  placeholder,
  description,
  error,
  rows = 6,
  disabled,
  shortcutHint = 'Ctrl/Cmd + Enter untuk mengirim',
  id,
  className,
}: PromptInputProps) {
  const { fieldId, descriptionId, errorId } = useFieldIds(id);
  const counterId = `${fieldId}-counter`;
  const overLimit = value.length > maxLength;
  const describedByIds = [
    description ? descriptionId : undefined,
    error ? errorId : undefined,
    counterId,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cx('mads-prompt', className)}>
      <label className="mads-field__label" htmlFor={fieldId}>
        {label}
      </label>
      <textarea
        id={fieldId}
        className="mads-field__control mads-prompt__input"
        value={value}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error || overLimit ? true : undefined}
        aria-describedby={describedByIds}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            if (!disabled) onSubmit();
          }
        }}
      />
      <div className="mads-prompt__footer">
        <span className="mads-prompt__hint">{shortcutHint}</span>
        <span
          className={cx('mads-prompt__counter', overLimit && 'mads-prompt__counter--over')}
          id={counterId}
        >
          {value.length} / {maxLength}
        </span>
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

/* ---------- FilePicker (MADS-INP-18) ---------- */

export interface FilePickerProps {
  label: string;
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Button-plus-hidden-input picker. Only the visible button is a tab stop; the
 * input is programmatically clicked, so keyboard users get one clean stop.
 */
export function FilePicker({
  label,
  onFiles,
  accept,
  multiple,
  hint,
  disabled,
  className,
}: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const inputId = useId();

  const open = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div className={cx('mads-file-picker', className)}>
      <button
        type="button"
        className="mads-button mads-button--secondary mads-button--md mads-file-picker__button"
        onClick={open}
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
      >
        <span className="mads-button__label">{label}</span>
      </button>
      {hint ? (
        <p className="mads-field__description" id={hintId}>
          {hint}
        </p>
      ) : null}
      <input
        ref={inputRef}
        id={inputId}
        className="mads-file-picker__input"
        type="file"
        tabIndex={-1}
        aria-hidden="true"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          const list = event.target.files;
          if (list && list.length > 0) onFiles(Array.from(list));
          event.target.value = '';
        }}
      />
    </div>
  );
}
