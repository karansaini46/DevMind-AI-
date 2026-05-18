import type { ReactNode } from "react";

export function EmptyState({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <section className="empty-state">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      <p>{body}</p>
      {action ? <div>{action}</div> : null}
    </section>
  );
}
