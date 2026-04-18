import { useState } from 'react';
import { Button } from '@/presentation/ui/button';
import { Sparkles, X, Trash2, Loader2 } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface DemoBannerProps {
  groupId: string;
  onDeleted: () => void;
}

export function DemoBanner({ groupId, onDeleted }: DemoBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (dismissed) return null;

  const handleDelete = async () => {
    if (!confirm('Delete the demo group and all its sample data? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.deleteGroup(groupId);
      toast.success('Demo group removed');
      onDeleted();
    } catch {
      toast.error('Failed to delete demo group');
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 text-sm bg-primary/5 border border-primary/20">
      <Sparkles className="h-4 w-4 text-primary shrink-0" />
      <span className="flex-1 text-muted-foreground">
        This is a demo group with sample data. <span className="hidden sm:inline">Create your own group when you're ready.</span>
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-destructive hover:text-destructive shrink-0"
        onClick={handleDelete}
        disabled={deleting}
      >
        {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
        {deleting ? '' : 'Remove'}
      </Button>
      <button onClick={() => setDismissed(true)} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
