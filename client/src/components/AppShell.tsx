import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { CommandPalette } from "./CommandPalette";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <main className="workspace-shell">
      <Sidebar />
      <section className="workspace-main">
        <Topbar onOpenPalette={() => setPaletteOpen(true)} />
        <Outlet />
      </section>
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </main>
  );
}
