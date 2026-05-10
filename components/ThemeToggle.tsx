"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem("valora-theme");
  return saved === "light" ? "light" : "dark";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("valora-theme", next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle inline-flex items-center justify-between gap-3 rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] transition"
      aria-label="Toggle dark or light theme"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full text-sm shadow-inner">
        {theme === "dark" ? "☾" : "☀"}
      </span>
      <span>{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}
