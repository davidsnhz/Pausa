// components/BottomNav.jsx
// ----------------------------------------------------------------------------
// Navbar inferior flotante tipo píldora (Relax / Inicio / Stats).
// Visible SOLO en Dashboard, Relax y Stats. Respeta la safe-area inferior.
// ----------------------------------------------------------------------------
import { useLocation, useNavigate } from "react-router";
import { Wind, House, ChartColumn } from "lucide-react";

const ITEMS = [
  { id: "relax", label: "Relax", Icon: Wind, path: "/relax" },
  { id: "home", label: "Inicio", Icon: House, path: "/" },
  { id: "stats", label: "Stats", Icon: ChartColumn, path: "/stats" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const activeId =
    pathname.startsWith("/relax") ? "relax" : pathname.startsWith("/stats") ? "stats" : "home";

  return (
    <nav className="bottom-safe-4 absolute left-1/2 z-20 flex h-16 w-[calc(100%-2.5rem)] -translate-x-1/2 items-center justify-evenly rounded-full border border-neutral-200 bg-white/90 shadow-xl backdrop-blur-md dark:border-neutral-800 dark:bg-black/80">
      {ITEMS.map(({ id, label, Icon, path }) => {
        const active = activeId === id;
        return (
          <button
            key={id}
            onClick={() => navigate(path)}
            className={`flex flex-col items-center gap-0.5 ${
              active ? "" : "text-neutral-400 dark:text-neutral-600"
            }`}
          >
            <Icon size={22} strokeWidth={2.2} />
            <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
