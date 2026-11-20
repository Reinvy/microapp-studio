import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { closeGlyph, cx, describedBy, useFieldIds } from './utils';

/* ---------- Button (MADS-INP-01) ---------- */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    type = 'button',
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      className={cx(
        'mads-button',
        `mads-button--${variant}`,
        `mads-button--${size}`,
        loading ? 'mads-button--loading' : undefined,
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="mads-spinner" aria-hidden="true" /> : null}
      {icon ? (
        <span className="mads-button__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="mads-button__label">{children}</span>
    </button>
  );
});

/* ---------- IconButton (MADS-INP-02) ---------- */

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children' | 'aria-label'> {
  label: string;
  icon: ReactNode;
  variant?: 'ghost' | 'tonal' | 'filled';
  type?: 'button' | 'submit';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'ghost', type = 'button', className, ...rest },
  ref,
) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      aria-label={label}
      className={cx('mads-icon-button', `mads-icon-button--${variant}`, className)}
    >
      <span className="mads-icon-button__icon" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
});

/* ---------- TextField (MADS-INP-03) ---------- */

export type TextFieldType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';
export type InputMode = 'text' | 'email' | 'numeric' | 'tel' | 'search' | 'url' | 'decimal';

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  type?: TextFieldType;
  id?: string;
  name?: string;
  autoComplete?: string;
  inputMode?: InputMode;
  className?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    value,
    onChange,
    placeholder,
    error,
    description,
    required,
    disabled,
    type = 'text',
    id,
    name,
    autoComplete,
    inputMode,
    className,
  },
  ref,
) {
  const { fieldId, descriptionId, errorId } = useFieldIds(id);
  return (
    <div className={cx('mads-field', className)}>
      <label className="mads-field__label" htmlFor={fieldId}>
        {label}
        {required ? (
          <span className="mads-field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <input
        ref={ref}
        id={fieldId}
        className="mads-field__control"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        name={name}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(
          description ? descriptionId : undefined,
          error ? errorId : undefined,
        )}
      />
      {description ? (
        <p className="mads-field__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className="mads-field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
});

/* ---------- TextArea (MADS-INP-04) ---------- */

export interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  id?: string;
  name?: string;
  className?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  {
    label,
    value,
    onChange,
    placeholder,
    error,
    description,
    required,
    disabled,
    rows = 4,
    id,
    name,
    className,
  },
  ref,
) {
  const { fieldId, descriptionId, errorId } = useFieldIds(id);
  return (
    <div className={cx('mads-field', className)}>
      <label className="mads-field__label" htmlFor={fieldId}>
        {label}
        {required ? (
          <span className="mads-field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <textarea
        ref={ref}
        id={fieldId}
        className="mads-field__control"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(
          description ? descriptionId : undefined,
          error ? errorId : undefined,
        )}
      />
      {description ? (
        <p className="mads-field__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className="mads-field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
});

/* ---------- Select (MADS-INP-07) ---------- */

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    value,
    onChange,
    options,
    description,
    error,
    required,
    disabled,
    id,
    name,
    className,
  },
  ref,
) {
  const { fieldId, descriptionId, errorId } = useFieldIds(id);
  return (
    <div className={cx('mads-field', className)}>
      <label className="mads-field__label" htmlFor={fieldId}>
        {label}
        {required ? (
          <span className="mads-field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <select
        ref={ref}
        id={fieldId}
        className="mads-field__control"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(
          description ? descriptionId : undefined,
          error ? errorId : undefined,
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {description ? (
        <p className="mads-field__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className="mads-field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
});

/* ---------- Checkbox (MADS-INP-10) ---------- */

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, checked, onChange, disabled, id, name, className },
  ref,
) {
  const { fieldId } = useFieldIds(id);
  return (
    <label className={cx('mads-checkbox', className)} htmlFor={fieldId}>
      <input
        ref={ref}
        id={fieldId}
        className="mads-checkbox__input"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        name={name}
      />
      <span className="mads-checkbox__label">{label}</span>
    </label>
  );
});

/* ---------- Switch (MADS-INP-12) ---------- */

export interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, checked, onChange, disabled, id, name, className },
  ref,
) {
  const { fieldId } = useFieldIds(id);
  return (
    <label className={cx('mads-switch', className)} htmlFor={fieldId}>
      <input
        ref={ref}
        id={fieldId}
        className="mads-switch__input"
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        name={name}
      />
      <span className="mads-switch__label">{label}</span>
    </label>
  );
});

/* ---------- SearchField (MADS-INP-06) ---------- */

export interface SearchFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  className?: string;
  id?: string;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { label, value, onChange, placeholder, onSubmit, className, id },
  ref,
) {
  const { fieldId } = useFieldIds(id);
  return (
    <form
      className={cx('mads-search', className)}
      role="search"
      aria-label={label}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <label className="mads-visually-hidden" htmlFor={fieldId}>
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        className="mads-search__input"
        type="search"
        role="searchbox"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value !== '') {
            event.preventDefault();
            onChange('');
          }
        }}
        placeholder={placeholder}
      />
      {value !== '' ? (
        <button
          type="button"
          className="mads-search__clear"
          aria-label="Bersihkan pencarian"
          onClick={() => onChange('')}
        >
          <span aria-hidden="true">{closeGlyph()}</span>
        </button>
      ) : null}
    </form>
  );
});
