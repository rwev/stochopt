interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
  /** Render custom content after the input (e.g. lock toggle) */
  adornment?: React.ReactNode;
}

export function NumberInput({
  label,
  value,
  onChange,
  step,
  min,
  max,
  suffix,
  disabled,
  adornment,
}: NumberInputProps) {
  return (
    <div className={`num-input${disabled ? ' disabled' : ''}`}>
      <span className="num-input-label">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(+e.target.value)}
      />
      {suffix && <span className="num-input-suffix">{suffix}</span>}
      {adornment}
    </div>
  );
}
