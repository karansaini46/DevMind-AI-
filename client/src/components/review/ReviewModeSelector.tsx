import type { ReviewMode } from "../../lib/api";

const primaryOptions: Array<{
  value: ReviewMode;
  label: string;
  summary: string;
}> = [
  { value: "production", label: "Production", summary: "Readiness" },
  { value: "strict", label: "Brutal", summary: "Hard judgment" },
  { value: "security", label: "Security", summary: "Exposure" },
  { value: "performance", label: "Performance", summary: "Scale" },
];

const secondaryOptions: Array<{
  value: ReviewMode;
  label: string;
  summary: string;
}> = [
  { value: "beginner", label: "Learning", summary: "Clear explanations" },
  { value: "interview", label: "Interview", summary: "Hiring signal" },
];

export function ReviewModeSelector({
  mode,
  disabled,
  onChange,
}: {
  mode: ReviewMode;
  disabled?: boolean;
  onChange: (mode: ReviewMode) => void;
}) {
  return (
    <div className="review-mode-stack" role="radiogroup" aria-label="Review lens">
      <div className="review-mode-selector">
        {primaryOptions.map((option) => (
          <ModeButton
            disabled={disabled}
            key={option.value}
            option={option}
            selected={mode === option.value}
            onChange={onChange}
          />
        ))}
      </div>

      <div className="secondary-mode-row">
        <span>Other lenses</span>
        {secondaryOptions.map((option) => (
          <ModeButton
            disabled={disabled}
            key={option.value}
            option={option}
            selected={mode === option.value}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

function ModeButton({
  option,
  selected,
  disabled,
  onChange,
}: {
  option: { value: ReviewMode; label: string; summary: string };
  selected: boolean;
  disabled?: boolean;
  onChange: (mode: ReviewMode) => void;
}) {
  return (
    <button
      aria-checked={selected}
      className={selected ? "is-active" : ""}
      disabled={disabled}
      role="radio"
      type="button"
      onClick={() => onChange(option.value)}
    >
      <strong>{option.label}</strong>
      <span>{option.summary}</span>
    </button>
  );
}
