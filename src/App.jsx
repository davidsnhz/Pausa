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
const Chat = lazy(() => import("./pages/Chat"));
const Relax = lazy(() => import("./pages/Relax"));
const Stats = lazy(() => import("./pages/Stats"));
const Profile = lazy(() => import("./pages/Profile"));
const Legal = lazy(() => import("./pages/Legal"));

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

  // Mientras Firebase resuelve la sesión inicial: Splash a pantalla completa.
  if (loading) {
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
        <Suspense fallback={<Splash />}>
        <Routes location={location}>
          {/* Público */}
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <Login />}
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
