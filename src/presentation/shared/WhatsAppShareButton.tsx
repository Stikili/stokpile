import { Button } from '@/presentation/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import { MessageCircle } from 'lucide-react';
import { shareContent } from '@/lib/whatsapp';

interface WhatsAppShareButtonProps {
  title?: string;
  text: string;
  url?: string;
  size?: 'sm' | 'icon' | 'default';
  variant?: 'default' | 'outline' | 'ghost';
  label?: string;
  className?: string;
}

export function WhatsAppShareButton({
  title,
  text,
  url,
  size = 'sm',
  variant = 'outline',
  label,
  className,
}: WhatsAppShareButtonProps) {
  const handleClick = async () => {
    await shareContent({ title, text, url });
  };

  if (size === 'icon') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size="icon"
            onClick={handleClick}
            className={className}
            aria-label="Share to WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Share to WhatsApp</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button variant={variant} size={size} onClick={handleClick} className={className}>
      <MessageCircle className="h-4 w-4 mr-2" />
      {label || 'Share'}
    </Button>
  );
}
