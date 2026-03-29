import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { CheckCircle2, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  action?: string;
  tip?: string;
}

interface OnboardingTourProps {
  show: boolean;
  onComplete: () => void;
  onSkip: () => void;
  hasGroups: boolean;
}

export function OnboardingTour({ show, onComplete, onSkip, hasGroups }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(show);

  useEffect(() => {
    setIsOpen(show);
  }, [show]);

  const steps: TourStep[] = hasGroups ? [
    {
      title: "Welcome to Stokpile! 🎉",
      description: "Let's take a quick tour to help you get started with managing your group savings.",
      tip: "This tour takes about 2 minutes. You can skip it anytime."
    },
    {
      title: "Dashboard Overview",
      description: "Your dashboard shows key metrics like total contributions, upcoming payouts, and recent activity. It's your central hub for monitoring group finances.",
      action: "View your group's financial summary at a glance"
    },
    {
      title: "Track Contributions",
      description: "Record member contributions easily. You can log payments, view contribution history, and export reports. Members can also mark their own payments.",
      action: "Keep accurate records of all financial transactions"
    },
    {
      title: "Schedule Meetings",
      description: "Create meetings with agendas, track attendance, take notes, and conduct votes. Everything is organized by meeting for easy reference.",
      action: "Stay organized with meeting management tools"
    },
    {
      title: "Group Information",
      description: "View member details, manage settings, upload constitutions, and invite new members. Admins have full control over group configuration.",
      action: "Manage your group settings and membership"
    },
    {
      title: "Quick Actions (Bottom Right)",
      description: "Use the floating action button to quickly add contributions, schedule payouts, or create meetings without navigating through tabs.",
      tip: "Keyboard shortcut: Press '?' to see all shortcuts",
      action: "Access common actions with one click"
    },
    {
      title: "You're All Set! ✨",
      description: "You now know the basics! Explore the app at your own pace. You can always access help by clicking the question mark icon in the header.",
      action: "Start managing your group savings"
    }
  ] : [
    {
      title: "Welcome to Stokpile! 🎉",
      description: "Stokpile helps you manage group savings, track contributions, and organize meetings. Let's get you started!",
      tip: "First, you'll need to create or join a group"
    },
    {
      title: "Create Your First Group",
      description: "Click 'Create Group' to start a new savings group. You'll be the admin and can invite members to join.",
      action: "Set up your group name, description, and contribution frequency"
    },
    {
      title: "Or Join an Existing Group",
      description: "If someone invited you, check your email for an invite link. You can also search for public groups or request to join with a group code.",
      action: "Join groups via invite link, search, or group code"
    },
    {
      title: "After Joining a Group",
      description: "You'll be able to track contributions, attend meetings, participate in votes, and view financial reports. Admins can manage payouts and settings.",
      action: "Start contributing and participating in group activities"
    },
    {
      title: "Ready to Start! ✨",
      description: "Create or join a group to unlock all features. Need help? Click the question mark icon in the header anytime.",
      action: "Get started with your savings group"
    }
  ];

  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsOpen(false);
    onComplete();
  };

  const handleSkip = () => {
    setIsOpen(false);
    onSkip();
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <DialogTitle>{currentStepData.title}</DialogTitle>
            </div>
            <Badge variant="secondary">
              Step {currentStep + 1} of {totalSteps}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </DialogHeader>

        <div className="py-6">
          <DialogDescription className="text-base mb-4">
            {currentStepData.description}
          </DialogDescription>

          {currentStepData.action && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{currentStepData.action}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStepData.tip && (
            <div className="mt-4 p-3 bg-muted rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">💡 Tip:</span> {currentStepData.tip}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Skip Tour
          </Button>

          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="outline" onClick={handlePrevious}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
            <Button onClick={handleNext}>
              {isLastStep ? (
                <>
                  Get Started
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
