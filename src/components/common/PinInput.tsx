import React, { useRef } from 'react';

interface PinInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Number of boxes to render; the wallet code is six digits. */
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  /** Accessible label for the group of boxes. */
  label: string;
}

/**
 * Six separate boxes for the wallet code. Each box holds a single digit and
 * focus moves forward as digits are typed, so the code is entered the way it is
 * on a phone lock screen.
 */
const PinInput: React.FC<PinInputProps> = ({
  id,
  value,
  onChange,
  length = 6,
  autoFocus = false,
  disabled = false,
  label,
}) => {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? '');

  const focusBox = (index: number) => {
    const target = inputs.current[Math.max(0, Math.min(index, length - 1))];
    target?.focus();
    target?.select();
  };

  const setDigit = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join('').slice(0, length));
  };

  const handleChange = (index: number, raw: string) => {
    const typed = raw.replace(/\D/g, '');
    if (!typed) {
      setDigit(index, '');
      return;
    }
    // Pasting or typing quickly can deliver several digits at once.
    const next = digits.slice();
    for (let offset = 0; offset < typed.length && index + offset < length; offset += 1) {
      next[index + offset] = typed[offset];
    }
    onChange(next.join('').slice(0, length));
    focusBox(index + typed.length);
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      setDigit(index - 1, '');
      focusBox(index - 1);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusBox(index - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  return (
    <div
      aria-label={label}
      className="mt-2 flex justify-between gap-2"
      role="group"
    >
      {digits.map((digit, index) => (
        <input
          aria-label={`${label} digit ${index + 1}`}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && index === 0}
          className="h-14 w-full rounded-xl border border-white/10 bg-surface-container-low text-center text-lg text-on-surface focus:border-primary focus:outline-none"
          disabled={disabled}
          id={index === 0 ? id : `${id}-${index + 1}`}
          inputMode="numeric"
          key={index}
          maxLength={1}
          onChange={(event) => handleChange(index, event.target.value)}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => handleKeyDown(index, event)}
          ref={(element) => { inputs.current[index] = element; }}
          type="password"
          value={digit}
        />
      ))}
    </div>
  );
};

export default PinInput;
