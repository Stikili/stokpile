import { Moon, Sparkles, Sun, type LucideIcon } from 'lucide-react';
import { cn } from '@/presentation/ui/utils';
import { useTheme, type AppTheme } from '@/presentation/shared/ThemeProvider';

const THEMES: { id: AppTheme; icon: LucideIcon; label: string }[] = [
  { id: 'light',  icon: Sun,       label: 'Light'  },
  { id: 'navy',   icon: Moon,      label: 'Navy'   },
  { id: 'aurora', icon: Sparkles,  label: 'Aurora' },
];

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Select theme"
      className={cn(
        'flex items-center gap-0.5 rounded-full border border-border bg-muted/40 p-0.5 backdrop-blur-sm',
        className
      )}
    >
      {THEMES.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setTheme(id)}
          aria-label={`${label} theme`}
          aria-pressed={theme === id}
          title={label}
          className={cn(
            'relative rounded-full p-1.5 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring',
            theme === id
              ? 'bg-primary text-primary-foreground shadow-sm scale-110'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
