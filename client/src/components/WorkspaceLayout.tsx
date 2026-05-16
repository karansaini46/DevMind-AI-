import { NavLink, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";

const navigation = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/review", label: "Review" },
  { to: "/search", label: "Search" },
  { to: "/settings", label: "Settings" },
] as const;

export function WorkspaceLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <main className="workspace-shell">
      <aside className="workspace-sidebar">
        <div>
          <p className="eyebrow">DevMind</p>
          <strong>Workspace</strong>
        </div>

        <nav className="workspace-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                isActive ? "workspace-link is-active" : "workspace-link"
              }
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="workspace-main">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Signed in</p>
            <strong>{user?.name}</strong>
          </div>

          <div className="navbar-actions">
            {user?.githubAvatarUrl ? (
              <img
                className="avatar"
                src={user.githubAvatarUrl}
                alt={`${user.name}'s GitHub avatar`}
              />
            ) : null}
            <button className="ghost-button" type="button" onClick={() => void logout()}>
              Log out
            </button>
          </div>
        </header>

        <Outlet />
      </section>
    </main>
  );
}
