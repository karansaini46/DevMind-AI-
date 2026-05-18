import type { ReviewMode } from "../../lib/api";

const reviewModeOptions: Array<{
  value: ReviewMode;
  label: string;
  summary: string;
}> = [
  { value: "production", label: "Production Readiness", summary: "Real-world failure handling" },
  { value: "strict", label: "Brutal Review", summary: "Unsparing senior judgment" },
  { value: "security", label: "Security Focus", summary: "Unsafe paths and exposure" },
  { value: "performance", label: "Performance Focus", summary: "Latency, memory, scale" },
  { value: "beginner", label: "Learning Mode", summary: "Clear explanations" },
  { value: "interview", label: "Interview Signal", summary: "Hiring-level scrutiny" },
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
    <div className="review-mode-selector" role="radiogroup" aria-label="Review lens">
      {reviewModeOptions.map((option) => (
        <button
          aria-checked={mode === option.value}
          className={mode === option.value ? "is-active" : ""}
          disabled={disabled}
          key={option.value}
          role="radio"
          type="button"
          onClick={() => onChange(option.value)}
        >
          <strong>{option.label}</strong>
          <span>{option.summary}</span>
        </button>
      ))}
    </div>
  );
}
