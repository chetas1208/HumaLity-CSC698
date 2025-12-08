import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MonitorSmartphone, Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className={cn(
        "relative h-10 w-10 rounded-full border border-border/50 bg-white/50 text-foreground shadow-sm backdrop-blur-sm transition-all hover:bg-white/80 hover:shadow-md dark:bg-white/10 dark:hover:bg-white/20",
        className
      )}
      title="Toggle theme"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 text-amber-500 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 text-blue-400 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export function ThemeFab({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className={cn("fixed bottom-6 right-6 z-50 hidden lg:block", className)}>
      <div className="flex items-center gap-1 rounded-full border border-border/40 bg-white/80 p-1 shadow-xl backdrop-blur-xl dark:bg-black/80 dark:border-white/10">
        <button
          onClick={() => setTheme('light')}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-all",
            theme === 'light' 
              ? "bg-white text-amber-500 shadow-sm dark:bg-brand-500 dark:text-white" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sun className="h-4 w-4" />
        </button>
        <button
          onClick={() => setTheme('system')}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-all",
            theme === 'system'
              ? "bg-white text-foreground shadow-sm dark:bg-brand-500 dark:text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MonitorSmartphone className="h-4 w-4" />
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-all",
            theme === 'dark'
              ? "bg-white text-blue-500 shadow-sm dark:bg-brand-500 dark:text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Moon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
