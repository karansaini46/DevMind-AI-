import { NavLink } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";

const navigation = [
  { to: "/review", label: "Review" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/snippets", label: "Snippets" },
  { to: "/github", label: "GitHub" },
  { to: "/search", label: "Search" },
  { to: "", label: "Reports", disabled: true },
  { to: "/settings", label: "Settings" },
] as const;

export function Sidebar() {
  const user = useAuthStore((state) => state.user);

  return (
    <aside className="workspace-sidebar">
      <div className="brand-lockup">
        <span />
        <div>
          <p className="eyebrow">DevMind</p>
          <strong>Review Cockpit</strong>
        </div>
      </div>

      <nav className="workspace-nav" aria-label="Primary navigation">
        {navigation.map((item) =>
          "disabled" in item && item.disabled ? (
            <span className="workspace-link is-disabled" key={item.label}>
              {item.label}
              <small>Soon</small>
            </span>
          ) : (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                isActive ? "workspace-link is-active" : "workspace-link"
              }
              to={item.to}
            >
              {item.label}
            </NavLink>
          ),
        )}
      </nav>

      <div className="sidebar-profile">
        {user?.githubAvatarUrl ? (
          <img className="avatar" src={user.githubAvatarUrl} alt="" />
        ) : (
          <span className="avatar-fallback">{user?.name?.[0] ?? "D"}</span>
        )}
        <div>
          <strong>{user?.name}</strong>
          <span>{user?.githubUsername ? `@${user.githubUsername}` : "Workspace member"}</span>
        </div>
      </div>
    </aside>
  );
}
