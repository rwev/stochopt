interface SelectOption {
  value: string;
  label: string;
}

interface SelectInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}

export function SelectInput({
  label,
  value,
  onChange,
  options,
  disabled,
}: SelectInputProps) {
  return (
    <div className={`sel-input${disabled ? ' disabled' : ''}`}>
      <span className="sel-input-label">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
