import { useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/review": "Review Cockpit",
  "/snippets": "Snippets",
  "/github": "GitHub",
  "/search": "Search",
  "/settings": "Settings",
};

export function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const title = location.pathname.startsWith("/reviews/")
    ? "Review Report"
    : titles[location.pathname] ?? "Review Cockpit";

  return (
    <header className="workspace-header">
      <div>
        <p className="eyebrow">DevMind</p>
        <strong>{title}</strong>
      </div>

      <div className="navbar-actions">
        <button className="palette-trigger" type="button" onClick={onOpenPalette}>
          <span>Search commands</span>
          <kbd>⌘K</kbd>
        </button>
        <button className="ghost-button" type="button" onClick={() => void logout()}>
          Log out
        </button>
      </div>
    </header>
  );
}
