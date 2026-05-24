import { useEffect, useState } from "react";

export default function useTheme() {
  // Essaie d'abord localStorage, sinon le thème système
  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem("theme-mode") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );

  useEffect(() => {
    // Enlève toute ancienne classe
    document.documentElement.classList.remove("dark", "light");
    // Applique la classe choisie globalement sur html
    document.documentElement.classList.add(theme);
    // Persiste
    localStorage.setItem("theme-mode", theme);
  }, [theme]);

  return [theme, setTheme];
}