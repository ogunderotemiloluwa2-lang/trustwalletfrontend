import React, { useState } from 'react';

interface PasswordFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  autoFocus?: boolean;
  className?: string;
  inputMode?: 'numeric' | 'text';
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  required?: boolean;
  /** Extra classes for the input itself, e.g. centred PIN styling. */
  inputClassName?: string;
  /** Accessible label for the visibility toggle, e.g. "wallet password". */
  label: string;
}

/**
 * Password input with a show/hide toggle so users can verify what they typed
 * before submitting a wallet password or account credential.
 */
const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  value,
  onChange,
  autoComplete,
  autoFocus,
  className = 'mt-2 w-full rounded-xl border border-white/10 bg-surface-container-low p-3 text-sm text-on-surface',
  inputMode,
  maxLength,
  minLength,
  pattern,
  required,
  inputClassName = '',
  label,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        className={`${className} pr-12 ${inputClassName}`.trim()}
        id={id}
        inputMode={inputMode}
        maxLength={maxLength}
        minLength={minLength}
        onChange={(event) => onChange(event.target.value)}
        pattern={pattern}
        required={required}
        type={visible ? 'text' : 'password'}
        value={value}
      />
      <button
        aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        <span className="material-symbols-outlined text-xl">
          {visible ? 'visibility_off' : 'visibility'}
        </span>
      </button>
    </div>
  );
};

export default PasswordField;
