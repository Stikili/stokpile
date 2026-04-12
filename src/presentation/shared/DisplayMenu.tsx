import { Button } from '@/presentation/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/presentation/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import { Settings2, Sun, Moon, Gauge, Check } from 'lucide-react';
import { useTheme, type AppTheme } from '@/presentation/shared/ThemeProvider';
import { useLiteMode } from '@/application/context/LiteModeContext';

const THEMES: { id: AppTheme; icon: typeof Sun; label: string }[] = [
  { id: 'light', icon: Sun,  label: 'Light' },
  { id: 'navy',  icon: Moon, label: 'Navy'  },
];

interface DisplayMenuProps {
  className?: string;
}

export function DisplayMenu({ className }: DisplayMenuProps) {
  const { theme, setTheme } = useTheme();
  const { liteMode, toggleLiteMode } = useLiteMode();

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={className} aria-label="Display settings">
              <Settings2 className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Display settings</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">Theme</DropdownMenuLabel>
        {THEMES.map(({ id, icon: Icon, label }) => (
          <DropdownMenuItem
            key={id}
            onClick={() => setTheme(id)}
            className={theme === id ? 'font-medium bg-primary/5' : ''}
          >
            <Icon className="h-4 w-4 mr-2" />
            {label}
            {theme === id && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={toggleLiteMode}>
          <Gauge className={`h-4 w-4 mr-2 ${liteMode ? 'text-green-500' : ''}`} />
          Lite Mode
          {liteMode && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
