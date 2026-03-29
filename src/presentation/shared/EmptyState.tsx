import { LucideIcon } from 'lucide-react';
import { Button } from '@/presentation/ui/button';
import { Card, CardContent } from '@/presentation/ui/card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-8">
        <div className="rounded-full bg-muted p-3 mb-3">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-base mb-1.5">{title}</h3>
        <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
          {description}
        </p>
        {action && (
          <Button onClick={action.onClick} size="sm">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
