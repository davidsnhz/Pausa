// services/native.js
// ----------------------------------------------------------------------------
// Capa fina sobre los plugins de Capacitor. Todo se importa con dynamic import
// dentro de try/catch para que la app siga funcionando como web pura (sin
// Capacitor instalado, en el navegador, los métodos son no-ops silenciosos).
// ----------------------------------------------------------------------------

// ¿Estamos dentro del contenedor nativo de Capacitor?
export async function isNative() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// Ajusta la StatusBar al tema (claro/oscuro) para que el texto se lea bien.
export async function syncStatusBar(dark) {
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    // En Android además podríamos fijar color de fondo; en iOS no aplica.
  } catch {
    /* web: no-op */
  }
}

// Oculta el splash nativo cuando la app ya está lista para pintarse.
export async function hideSplash() {
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* web: no-op */
  }
}

// Cierra el teclado (p. ej. al enviar un mensaje en el chat).
export async function hideKeyboard() {
  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    await Keyboard.hide();
  } catch {
    /* web: no-op */
  }
}

// Suscribe cambios de altura del teclado (por si se quiere ajustar la UI).
export async function onKeyboard(show, hide) {
  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    Keyboard.addListener("keyboardWillShow", (info) => show?.(info.keyboardHeight));
    Keyboard.addListener("keyboardWillHide", () => hide?.());
  } catch {
    /* web: no-op */
  }
}
