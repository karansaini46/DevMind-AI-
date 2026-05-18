import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Command {
  label: string;
  hint: string;
  run: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const commands = useMemo<Command[]>(
    () => [
      { label: "Start a review", hint: "Review", run: () => navigate("/review") },
      { label: "Open dashboard", hint: "Dashboard", run: () => navigate("/dashboard") },
      { label: "Search snippets", hint: "Search", run: () => navigate("/search") },
      { label: "Browse snippets", hint: "Snippets", run: () => navigate("/snippets") },
      { label: "GitHub setup", hint: "GitHub", run: () => navigate("/github") },
      { label: "Open settings", hint: "Settings", run: () => navigate("/settings") },
    ],
    [navigate],
  );

  const visibleCommands = commands.filter((command) =>
    command.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="palette-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-label="Command palette"
        aria-modal="true"
        className="command-palette"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="palette-input-row">
          <span>⌘K</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Jump to a page or action"
          />
        </div>

        <div className="palette-results">
          {visibleCommands.length ? (
            visibleCommands.map((command) => (
              <button
                key={command.label}
                type="button"
                onClick={() => {
                  command.run();
                  onClose();
                }}
              >
                <strong>{command.label}</strong>
                <span>{command.hint}</span>
              </button>
            ))
          ) : (
            <p>No matching command.</p>
          )}
        </div>
      </section>
    </div>
  );
}
