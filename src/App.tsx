import { useState, useCallback, lazy, Suspense } from "react";
import { AuthForm } from "./components/AuthForm";
import { GroupSelector } from "./components/GroupSelector";
import { JoinRequestsView } from "./components/JoinRequestsView";

// Lazy load heavy tab components for code splitting
const Dashboard = lazy(() => import("./components/Dashboard").then(m => ({ default: m.Dashboard })));
const ActivityFeed = lazy(() => import("./components/ActivityFeed").then(m => ({ default: m.ActivityFeed })));
const ContributionsView = lazy(() => import("./components/ContributionsView").then(m => ({ default: m.ContributionsView })));
const PayoutsView = lazy(() => import("./components/PayoutsView").then(m => ({ default: m.PayoutsView })));
const MeetingsView = lazy(() => import("./components/MeetingsView").then(m => ({ default: m.MeetingsView })));
const GroupInfoView = lazy(() => import("./components/GroupInfoView").then(m => ({ default: m.GroupInfoView })));
import { GroupActionsButtons } from "./components/GroupActionsButtons";
import { PendingInvitesView } from "./components/PendingInvitesView";
import { PublicJoinView } from "./components/PublicJoinView";
import { ProfileMenu } from "./components/ProfileMenu";
import { MobileNav } from "./components/MobileNav";
import { QuickActions } from "./components/QuickActions";
import {
  KeyboardShortcuts,
  useKeyboardShortcuts,
} from "./components/KeyboardShortcuts";
import { LoadingProgress } from "./components/LoadingProgress";
import { NotificationBell } from "./components/NotificationBell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OfflineDetector } from "./components/OfflineDetector";
import { ConfirmationDialog } from "./components/ConfirmationDialog";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeToggle } from "./components/ThemeToggle";
import { Logo } from "./components/Logo";
import { OnboardingTour } from "./components/OnboardingTour";
import { ContextualTips } from "./components/ContextualTips";
import { Button } from "./components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import {
  PieChart,
  DollarSign,
  TrendingUp,
  Users,
  Info,
  Keyboard,
  Calendar,
} from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { useSession } from "./utils/hooks/useSession";
import { useGroups } from "./utils/hooks/useGroups";
import { useInviteToken } from "./utils/hooks/useInviteToken";

export default function App() {
  const { session, loading: sessionLoading, checkSession, signOut } = useSession();
  const {
    groups,
    selectedGroup,
    loading: groupLoading,
    groupsLoading,
    selectGroup,
    refreshGroups,
  } = useGroups(session);
  const { inviteToken, showAuthForInvite, clearInviteToken, requireAuth } =
    useInviteToken();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem("onboardingCompleted")
  );

  // Handlers (stabilized with useCallback to prevent unnecessary child re-renders)
  const handleSignOut = useCallback(async () => {
    setSignOutLoading(true);
    try {
      await signOut();
      setShowSignOutDialog(false);
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setSignOutLoading(false);
    }
  }, [signOut]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem("onboardingCompleted", "true");
  }, []);

  const handleQuickAction = useCallback((action: string) => {
    const tabMap: Record<string, string> = {
      contribution: "contributions",
      payout: "payouts",
      meeting: "meetings",
      members: "info",
      info: "info",
    };
    if (tabMap[action]) setActiveTab(tabMap[action]);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    checkSession();
    if (inviteToken) setTimeout(clearInviteToken, 500);
  }, [checkSession, inviteToken, clearInviteToken]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewContribution: () => handleQuickAction("contribution"),
    onNewPayout: () => handleQuickAction("payout"),
    onNewMeeting: () => handleQuickAction("meeting"),
    onShowShortcuts: () => setShowShortcuts(true),
  });

  const isAdmin = selectedGroup?.userRole === "admin";

  // Loading state
  if (sessionLoading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-blue-50/40 dark:bg-transparent dark:bg-none dark:from-transparent dark:to-transparent">
          <LoadingProgress message="Loading Stokpile..." />
        </div>
      </ThemeProvider>
    );
  }

  // Public join view
  if (inviteToken && !showAuthForInvite) {
    return (
      <ThemeProvider>
        <PublicJoinView
          inviteToken={inviteToken}
          isAuthenticated={!!session}
          onJoinSuccess={() => {
            clearInviteToken();
            checkSession();
          }}
          onNeedAuth={requireAuth}
        />
        <Toaster />
      </ThemeProvider>
    );
  }

  // Auth form
  if (!session) {
    return (
      <ThemeProvider>
        <AuthForm onSuccess={handleAuthSuccess} />
        <Toaster />
      </ThemeProvider>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-50/80 to-blue-50/30 dark:bg-transparent dark:bg-none dark:from-transparent dark:to-transparent">
            {/* Skip to main content for accessibility */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg"
            >
              Skip to main content
            </a>
            
            <Toaster />
            <OfflineDetector />
            <PWAInstallPrompt />
            <KeyboardShortcuts open={showShortcuts} onOpenChange={setShowShortcuts} />
            <OnboardingTour
              show={showOnboarding && !!session}
              onComplete={handleOnboardingComplete}
              onSkip={handleOnboardingComplete}
              hasGroups={groups.length > 0}
            />
            
            {/* Sign Out Confirmation Dialog */}
            <ConfirmationDialog
              open={showSignOutDialog}
              onOpenChange={setShowSignOutDialog}
              title="Sign Out"
              description="Are you sure you want to sign out? Any unsaved changes will be lost."
              onConfirm={handleSignOut}
              confirmText="Sign Out"
              variant="warning"
              loading={signOutLoading}
            />
          
            {/* Header */}
            <header role="banner" className="bg-white/70 dark:bg-[#050e1c]/80 border-b border-border dark:border-white/[0.06] sticky top-0 z-50 backdrop-blur-xl backdrop-saturate-150">
              <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Mobile: Hamburger menu on the left */}
                  <div className="lg:hidden">
                    <MobileNav
                      session={session}
                      selectedGroup={selectedGroup}
                      activeTab={activeTab}
                      onTabChange={setActiveTab}
                      onSignOut={() => setShowSignOutDialog(true)}
                      onGroupsChanged={refreshGroups}
                      onProfileUpdate={() => checkSession()}
                      hasGroups={groups.length > 0}
                      renderAsHamburger
                    />
                  </div>
                  <Logo showText={true} />
                </div>
                <div className="flex items-center gap-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setShowShortcuts(true)} className="hidden lg:flex">
                        <Keyboard className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Keyboard shortcuts (Press ?)</TooltipContent>
                  </Tooltip>
                  <NotificationBell
                    groupId={selectedGroup?.id}
                    userEmail={session?.user?.email}
                  />
                  <ThemeToggle className="hidden lg:flex" />
                  <ProfileMenu 
                    session={session}
                    onProfileUpdate={() => checkSession()}
                    onGroupsChanged={refreshGroups}
                    onSignOut={() => setShowSignOutDialog(true)}
                    hasGroups={groups.length > 0}
                  />
                </div>
              </div>
            </header>

            {/* Group Selector with loading state */}
            {groupsLoading ? (
              <div className="max-w-7xl mx-auto px-4 py-2">
                <div className="animate-pulse flex gap-2">
                  <div className="h-8 bg-muted rounded-lg w-28"></div>
                  <div className="h-8 bg-muted rounded-lg w-28"></div>
                  <div className="h-8 bg-muted rounded-lg w-28"></div>
                </div>
              </div>
            ) : groups.length > 0 && (
              <GroupSelector
                groups={groups}
                selectedGroupId={selectedGroup?.id ?? null}
                onSelectGroup={selectGroup}
              />
            )}

            {/* Main Content */}
            <main id="main-content" role="main" className="max-w-7xl mx-auto px-4 py-3 pb-20 lg:pb-3">
              {/* Show pending invites */}
              <div className="mb-3">
                <PendingInvitesView onInviteAccepted={refreshGroups} />
              </div>

              {groupLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingProgress message="Loading group..." />
                </div>
              ) : !selectedGroup ? (
                <div className="text-center py-8 animate-fade-in">
                  <div className="bg-white dark:bg-card rounded-lg p-6 max-w-md mx-auto shadow-lg border border-border">
                    <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <h2 className="text-lg mb-1.5">No Groups Yet</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first group or join an existing one to get started.
                    </p>
                    <GroupActionsButtons onSuccess={refreshGroups} />
                  </div>
                </div>
              ) : (
                <div className="animate-slide-up">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-white dark:bg-card mb-3 hidden lg:flex border border-border h-9">
                      <TabsTrigger value="dashboard" className="text-sm">
                        <PieChart className="h-3.5 w-3.5 mr-1.5" />
                        Dashboard
                      </TabsTrigger>
                      <TabsTrigger value="contributions" className="text-sm">
                        <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                        Contributions
                      </TabsTrigger>
                      {selectedGroup.payoutsAllowed && (
                        <TabsTrigger value="payouts" className="text-sm">
                          <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                          Payouts
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="meetings" className="text-sm">
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
                        Meetings
                      </TabsTrigger>
                      <TabsTrigger value="info" className="text-sm">
                        <Info className="h-3.5 w-3.5 mr-1.5" />
                        Group Settings
                      </TabsTrigger>
                    </TabsList>

                    <Suspense fallback={<LoadingProgress message="Loading..." />}>
                      <TabsContent value="dashboard" className="space-y-4">
                        <ContextualTips context="dashboard" isAdmin={isAdmin} hasData />
                        <Dashboard
                          groupId={selectedGroup.id}
                          isAdmin={isAdmin}
                          userEmail={session.user.email}
                        />
                        {isAdmin && <JoinRequestsView groupId={selectedGroup.id} />}
                        <ActivityFeed groupId={selectedGroup.id} />
                      </TabsContent>

                      <TabsContent value="contributions" className="space-y-3">
                        <ContextualTips context="contributions" isAdmin={isAdmin} hasData />
                        <ContributionsView
                          groupId={selectedGroup.id}
                          userEmail={session.user.email}
                          isAdmin={isAdmin}
                        />
                      </TabsContent>

                      {selectedGroup.payoutsAllowed && (
                        <TabsContent value="payouts" className="space-y-3">
                          <ContextualTips context="payouts" isAdmin={isAdmin} hasData />
                          <PayoutsView groupId={selectedGroup.id} isAdmin={isAdmin} />
                        </TabsContent>
                      )}

                      <TabsContent value="meetings" className="space-y-3">
                        <ContextualTips context="meetings" isAdmin={isAdmin} hasData />
                        <MeetingsView
                          groupId={selectedGroup.id}
                          isAdmin={isAdmin}
                          userEmail={session.user.email}
                        />
                      </TabsContent>

                      <TabsContent value="info" className="space-y-3">
                        <ContextualTips context="info" isAdmin={isAdmin} hasData />
                        <GroupInfoView group={selectedGroup} onGroupUpdate={refreshGroups} />
                      </TabsContent>
                    </Suspense>
                  </Tabs>
                  
                  {/* Quick Actions FAB */}
                  <QuickActions
                    onAction={handleQuickAction}
                    isAdmin={isAdmin}
                    payoutsAllowed={selectedGroup.payoutsAllowed}
                  />
                </div>
              )}
            </main>

            {/* Mobile Bottom Navigation - Only visible on mobile, 5 items max */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
              <MobileNav
                session={session}
                selectedGroup={selectedGroup}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onSignOut={() => setShowSignOutDialog(true)}
                onGroupsChanged={refreshGroups}
                onProfileUpdate={() => checkSession()}
                hasGroups={groups.length > 0}
                renderAsBottomNav
              />
            </div>
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
