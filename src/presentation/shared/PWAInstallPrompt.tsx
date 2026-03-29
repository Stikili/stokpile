import { useState, useEffect } from 'react';
import { Button } from '@/presentation/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Alert, AlertDescription } from '@/presentation/ui/alert';
import { Download, X, Share, Plus, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Detect if device is mobile
const isMobile = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod|android|mobile/.test(userAgent);
};

// Detect iOS
const isIOS = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};

// Extend Navigator to include iOS-specific standalone property
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

// Detect if running in standalone mode (already installed)
const isStandaloneMode = () => {
  const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = (window.navigator as NavigatorWithStandalone).standalone === true;
  return isDisplayStandalone || isIOSStandalone;
};

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (isStandaloneMode()) {
      return;
    }

    // Check if prompt was dismissed before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Show again after 7 days (less aggressive for better UX)
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // For iOS devices, show instructions after user has been on the site a bit
    if (isIOS() && isMobile()) {
      setTimeout(() => {
        setShowIOSInstructions(true);
        setShowPrompt(true);
      }, 5000); // Show after 5 seconds (give user time to explore)
      return;
    }

    // For Android/Chrome, wait for the install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // On mobile, show after a delay to not interrupt. On desktop, wait longer.
      const delay = isMobile() ? 5000 : 15000;
      setTimeout(() => {
        setShowPrompt(true);
      }, delay);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success('App installed successfully!');
        localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Install prompt error:', error);
      toast.error('Failed to install app');
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    setShowPrompt(false);
    setShowIOSInstructions(false);
  };

  if (!showPrompt) {
    return null;
  }

  // iOS Installation Instructions
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
        <Card className="shadow-2xl border-2 border-primary/20 w-full md:w-96 animate-slide-up rounded-t-2xl md:rounded-2xl rounded-b-none md:rounded-b-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <Smartphone className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Add Stokpile to Home Screen</CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    Install for the best experience
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mt-1 hover:bg-muted"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <Alert className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
              <Download className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                <strong>Benefits:</strong> Faster loading, offline access, and native app experience
              </AlertDescription>
            </Alert>

            <div className="space-y-4 bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium">Installation Steps:</h4>
              
              <div className="flex gap-3 items-start">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                  <span className="text-sm font-semibold">1</span>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm">
                    Tap the <Share className="h-4 w-4 inline mx-1 text-primary align-middle" /> <strong>Share button</strong> in your browser
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    (Usually at the top or bottom of Safari)
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                  <span className="text-sm font-semibold">2</span>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm">
                    Scroll and tap <Plus className="h-4 w-4 inline mx-1 text-primary align-middle" /> <strong>Add to Home Screen</strong>
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                  <span className="text-sm font-semibold">3</span>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm">
                    Tap <strong>Add</strong> to confirm
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The app icon will appear on your home screen
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleDismiss} className="flex-1" size="lg">
                Got it!
              </Button>
              <Button onClick={handleDismiss} variant="outline" size="lg">
                Maybe later
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Android/Chrome Installation Prompt
  if (!deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in md:bg-transparent md:backdrop-blur-none">
      <Card className="shadow-2xl border-2 border-primary/20 w-full md:w-96 animate-slide-up rounded-t-2xl md:rounded-2xl rounded-b-none md:rounded-b-2xl md:mr-4 md:mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <Smartphone className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Install Stokpile</CardTitle>
                <CardDescription className="mt-1 text-xs">
                  Add to your home screen
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mt-1 hover:bg-muted"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          <Alert className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <Download className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <strong>Why install?</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>✓ Works offline - Access anytime</li>
                <li>✓ Faster loading - Native performance</li>
                <li>✓ Quick access - From your home screen</li>
                <li>✓ Push notifications - Stay updated</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2">
            <Button onClick={handleInstall} className="flex-1" size="lg">
              <Download className="h-4 w-4 mr-2" />
              Install Now
            </Button>
            <Button variant="outline" onClick={handleDismiss} size="lg">
              Later
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Free • No app store required • Install instantly
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
