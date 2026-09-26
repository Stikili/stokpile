import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/presentation/ui/dialog';
import { AuthForm } from './AuthForm';

export type AuthMode = 'signin' | 'signup';

interface AuthDialogProps {
  /** Which tab to open on; null keeps the dialog closed. */
  mode: AuthMode | null;
  onClose: () => void;
  onSuccess: () => void;
}

/** Sign in / sign up over the landing page, so visitors never lose their place. */
export function AuthDialog({ mode, onClose, onSuccess }: AuthDialogProps) {
  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[92dvh] overflow-y-auto p-0">
        {/* The form carries its own visible heading; these name the dialog for screen readers. */}
        <DialogTitle className="sr-only">{mode === 'signup' ? 'Create account' : 'Sign in'}</DialogTitle>
        <DialogDescription className="sr-only">Stokpile account</DialogDescription>
        {/* key remounts the form so reopening in the other mode starts clean. */}
        {mode && <AuthForm key={mode} variant="dialog" initialMode={mode} onSuccess={onSuccess} />}
      </DialogContent>
    </Dialog>
  );
}
