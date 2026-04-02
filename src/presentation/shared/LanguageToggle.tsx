import { Button } from '@/presentation/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/presentation/ui/dropdown-menu';
import { Languages } from 'lucide-react';
import { useLanguage } from '@/application/context/LanguageContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'xh', label: 'IsiXhosa' },
  { code: 'zu', label: 'IsiZulu' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'pt', label: 'Português' },
  { code: 'st', label: 'Sesotho' },
  { code: 'tn', label: 'Setswana' },
  { code: 'sn', label: 'Shona' },
] as const;

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Change language">
              <Languages className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Change language</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={language === lang.code ? 'font-semibold' : ''}
          >
            {lang.label}
            {language === lang.code && <span className="ml-auto text-xs text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
