import type { SeverityGroup } from "../../lib/reviews";
import { severityGroups } from "../../lib/reviews";

export function SeverityTabs({
  activeGroup,
  counts,
  onChange,
}: {
  activeGroup: SeverityGroup;
  counts: Record<SeverityGroup, number>;
  onChange: (group: SeverityGroup) => void;
}) {
  return (
    <div className="severity-tabs" role="tablist" aria-label="Issue severity">
      {severityGroups.map((group) => (
        <button
          aria-selected={activeGroup === group}
          className={activeGroup === group ? "is-active" : ""}
          key={group}
          role="tab"
          type="button"
          onClick={() => onChange(group)}
        >
          <span>{group}</span>
          <strong>{counts[group]}</strong>
        </button>
      ))}
    </div>
  );
}
