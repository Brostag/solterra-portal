"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/components/portal/ThemeProvider";

interface Option {
  value: Theme;
  icon: typeof Sun;
  label: string;
}

const OPTIONS: Option[] = [
  { value: "light",  icon: Sun,     label: "Claro" },
  { value: "dark",   icon: Moon,    label: "Oscuro" },
  { value: "system", icon: Monitor, label: "Sistema" },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
        Tema
      </p>
      <div
        role="radiogroup"
        aria-label="Seleccionar tema"
        className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-800 rounded-md p-1"
      >
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(opt.value)}
              className={`flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded text-[10px] font-medium transition-colors ${
                active
                  ? "bg-white dark:bg-gray-700 text-[#253158] dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
