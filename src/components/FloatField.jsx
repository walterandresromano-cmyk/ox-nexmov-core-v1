export default function FloatField({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  inputMode,
  minLength,
  min,
  placeholder,
  ...props
}) {
  return (
    <div className="float-field">
      <input
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        inputMode={inputMode}
        minLength={minLength}
        min={min}
        placeholder=" "
        className="float-field__input"
        {...props}
      />
      <label className="float-field__label">{label}</label>
    </div>
  );
}
