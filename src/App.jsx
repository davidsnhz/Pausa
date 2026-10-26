// App.jsx
// ----------------------------------------------------------------------------
// Shell de la app: tema (dark mode), enrutado con transiciones, rutas
// protegidas por AuthContext y navbar flotante visible solo donde toca.
// Mientras la sesión se resuelve (loading), se muestra el Splash.
// ----------------------------------------------------------------------------
import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./context/AuthContext";
import { hideSplash, syncStatusBar } from "./services/native";

import BottomNav from "./components/BottomNav";
import ErrorBoundary from "./components/ErrorBoundary";
// Splash, Login y Dashboard van en el bundle inicial (lo primero que se ve).
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
// El resto se cargan bajo demanda (code-splitting) para acelerar el arranque.
// Con v7_startTransition activo, la navegación mantiene la pantalla actual
// mientras carga el trozo, así que no hay parpadeo al cambiar de sección.
const LAZY_PAGES = {
  Chat: () => import("./pages/Chat"),
  Relax: () => import("./pages/Relax"),
  Stats: () => import("./pages/Stats"),
  Profile: () => import("./pages/Profile"),
  Legal: () => import("./pages/Legal"),
};
const Chat = lazy(LAZY_PAGES.Chat);
const Relax = lazy(LAZY_PAGES.Relax);
const Stats = lazy(LAZY_PAGES.Stats);
const Profile = lazy(LAZY_PAGES.Profile);
const Legal = lazy(LAZY_PAGES.Legal);

// Rutas donde SÍ aparece el navbar inferior flotante.
const NAV_ROUTES = ["/", "/relax", "/stats"];

// Envoltura de ruta protegida: exige sesión; si no, va a /login.
function Protected({ user, loading, children }) {
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Sincroniza la StatusBar nativa con el tema actual y oculta el splash nativo.
  useEffect(() => {
    const dark = document.documentElement.classList.contains("dark");
    syncStatusBar(dark);
    hideSplash();
  }, []);

  // Con sesión, precarga en segundo plano el resto de pantallas: la primera vez
  // que se abren ya no hay espera.
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => Object.values(LAZY_PAGES).forEach((load) => load()), 1000);
    return () => clearTimeout(t);
  }, [user]);

  // Mientras se resuelve la sesión inicial (y el perfil): Splash a pantalla
  // completa. Justo tras iniciar sesión, en cambio, el Login sigue visible con
  // su "Un momento…" hasta tener el perfil, sin pantallazo intermedio.
  const loggingIn = !!user && location.pathname === "/login";
  if (loading && !loggingIn) {
    return (
      <div className="flex h-full w-full flex-col bg-white text-black dark:bg-black dark:text-white">
        <Splash />
      </div>
    );
  }

  const showNav = NAV_ROUTES.includes(location.pathname) && !!user;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white text-black dark:bg-black dark:text-white">
      <ErrorBoundary key={location.pathname}>
        {/* Fallback sin animación de entrada: continúa el Splash de arranque. */}
        <Suspense fallback={<Splash still />}>
        <Routes location={location}>
          {/* Público */}
          <Route
            path="/login"
            element={user && !loading ? <Navigate to="/" replace /> : <Login />}
          />
          {/* Legal: accesible siempre (requisito de Apple, 5.1.1) */}
          <Route path="/privacy" element={<Legal doc="privacy" />} />
          <Route path="/terms" element={<Legal doc="terms" />} />

          {/* Protegido */}
          <Route
            path="/"
            element={
              <Protected user={user} loading={loading}>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/chat"
            element={
              <Protected user={user} loading={loading}>
                <Chat />
              </Protected>
            }
          />
          <Route
            path="/relax"
            element={
              <Protected user={user} loading={loading}>
                <Relax />
              </Protected>
            }
          />
          <Route
            path="/stats"
            element={
              <Protected user={user} loading={loading}>
                <Stats />
              </Protected>
            }
          />
          <Route
            path="/profile"
            element={
              <Protected user={user} loading={loading}>
                <Profile />
              </Protected>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </ErrorBoundary>

      {showNav && <BottomNav />}
    </div>
  );
}
