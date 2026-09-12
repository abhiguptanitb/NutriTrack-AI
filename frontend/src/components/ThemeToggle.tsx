import { Check, Laptop, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";

const options = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
  { value: "system" as const, label: "System", icon: Laptop }
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switcher" aria-label="Choose appearance">
      {options.map((option) => {
        const Icon = option.icon;
        const selected = theme === option.value;
        return (
          <Button
            aria-pressed={selected}
            className="h-8 flex-1 gap-1.5 px-2 text-xs"
            key={option.value}
            onClick={() => setTheme(option.value)}
            size="sm"
            title={`${option.label} theme`}
            type="button"
            variant={selected ? "secondary" : "ghost"}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">{option.label}</span>
            {selected ? <Check className="hidden h-3 w-3 xl:inline" /> : null}
          </Button>
        );
      })}
    </div>
  );
}
