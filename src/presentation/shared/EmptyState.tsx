import { LucideIcon } from 'lucide-react';
import { Button } from '@/presentation/ui/button';
import { Card, CardContent } from '@/presentation/ui/card';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

export function EmptyState({ icon: Icon, title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-10 px-4">
        <div className="rounded-full bg-primary/10 p-3 mb-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-base font-semibold mb-1.5">{title}</h3>
        <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
          {description}
        </p>
        {(action || secondaryAction) && (
          <div className="flex flex-wrap gap-2 justify-center">
            {action && (
              <Button onClick={action.onClick} size="sm">
                {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button onClick={secondaryAction.onClick} size="sm" variant="outline">
                {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4 mr-2" />}
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
