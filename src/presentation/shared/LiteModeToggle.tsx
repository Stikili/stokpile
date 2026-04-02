import { useLiteMode } from '@/application/context/LiteModeContext';
import { Button } from '@/presentation/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import { Gauge } from 'lucide-react';

interface LiteModeToggleProps {
  className?: string;
}

export function LiteModeToggle({ className }: LiteModeToggleProps) {
  const { liteMode, toggleLiteMode } = useLiteMode();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLiteMode}
          className={className}
          aria-label={liteMode ? 'Disable Lite Mode' : 'Enable Lite Mode'}
          aria-pressed={liteMode}
        >
          <Gauge className={`h-5 w-5 ${liteMode ? 'text-green-500' : ''}`} aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {liteMode ? 'Lite Mode ON — tap to disable (saves data)' : 'Enable Lite Mode (reduces data usage)'}
      </TooltipContent>
    </Tooltip>
  );
}
