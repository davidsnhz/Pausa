/** @type {import('tailwindcss').Config} */
export default {
  // Modo oscuro controlado por la clase `dark` en <html> (toggle en Perfil).
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Inter para cuerpo, Space Grotesk para títulos.
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
