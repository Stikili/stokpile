# 🚀 Stok-pile Quick Reference

> Essential commands and information for developers

---

## 📦 Development Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check

# Lint code
npm run lint
```

---

## 🌍 Environment Variables

Create `.env.local`:

```bash
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...

# Optional: Stripe (for monetization)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx...
```

Backend secrets (set via Supabase CLI):
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SUPABASE_ANON_KEY=eyJxxx...

# Optional
STRIPE_SECRET_KEY=sk_test_xxx...
STRIPE_WEBHOOK_SECRET=whsec_xxx...
```

---

## 🗂️ Project Structure

```
stok-pile/
├── components/          # React components
│   ├── ui/             # Shadcn components (don't modify)
│   ├── AuthForm.tsx    # Authentication
│   ├── Dashboard.tsx   # Main dashboard
│   ├── *View.tsx       # Tab views
│   └── *.tsx           # Other components
├── docs/               # Documentation
├── utils/              # Utilities
│   ├── api.ts         # API client
│   ├── hooks/         # Custom hooks
│   └── supabase/      # Supabase config
├── styles/            # Global CSS
├── supabase/          # Backend
│   └── functions/     # Edge functions
└── App.tsx            # Main app component
```

---

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `/App.tsx` | Main application component |
| `/utils/api.ts` | All API calls |
| `/utils/hooks/useSession.ts` | Auth state |
| `/utils/hooks/useGroups.ts` | Group management |
| `/supabase/functions/server/index.tsx` | Backend API |
| `/supabase/functions/server/kv_store.tsx` | Database utilities |
| `/styles/globals.css` | Tailwind v4 config |

---

## 🗄️ Database (KV Store)

### Key Patterns

```typescript
// User data
user:{userId}

// Groups
group:{groupId}
member:{groupId}:{userId}

// Contributions
contribution:{groupId}:{contributionId}

// Payouts
payout:{groupId}:{payoutId}

// Meetings
meeting:{groupId}:{meetingId}
vote:{meetingId}:{voteId}
note:{meetingId}:{noteId}
message:{meetingId}:{messageId}

// Invites
invite:{inviteToken}
pendingInvite:{userId}:{inviteId}

// Constitution
constitution:{groupId}
```

### KV Functions

```typescript
import * as kv from './kv_store.tsx';

// Single operations
await kv.get('user:123')
await kv.set('user:123', data)
await kv.del('user:123')

// Multiple operations
await kv.mget(['user:1', 'user:2'])
await kv.mset({ 'user:1': data1, 'user:2': data2 })
await kv.mdel(['user:1', 'user:2'])

// Prefix search
await kv.getByPrefix('contribution:group123:')
```

---

## 🎨 UI Components

### Shadcn Components Available

```tsx
import { Button } from "./components/ui/button"
import { Card, CardContent, CardHeader } from "./components/ui/card"
import { Dialog, DialogContent } from "./components/ui/dialog"
import { Input } from "./components/ui/input"
import { Label } from "./components/ui/label"
import { Select } from "./components/ui/select"
import { Tabs, TabsContent, TabsList } from "./components/ui/tabs"
import { Badge } from "./components/ui/badge"
import { Avatar } from "./components/ui/avatar"
// ... and many more in /components/ui/
```

### Icons (Lucide React)

```tsx
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Users,
  Info,
  // ... 1000+ icons available
} from "lucide-react"
```

---

## 🎯 Common Tasks

### Add a New Feature Component

1. Create `/components/MyFeature.tsx`
2. Import in `App.tsx`
3. Add to appropriate tab/view
4. Style with Tailwind classes

### Add a New API Endpoint

1. Add route in `/supabase/functions/server/index.tsx`
2. Add function in `/utils/api.ts`
3. Call from component

### Add a New Database Entity

1. Define key pattern (e.g., `myEntity:{groupId}:{id}`)
2. Use KV functions to CRUD
3. Add TypeScript interface

---

## 🔐 Authentication

### Check if User is Logged In

```tsx
import { useSession } from "./utils/hooks/useSession"

function MyComponent() {
  const { session, loading } = useSession()
  
  if (loading) return <LoadingProgress />
  if (!session) return <AuthForm />
  
  return <div>Welcome {session.user.email}</div>
}
```

### Get Current User

```tsx
const { session } = useSession()
const userId = session?.user?.id
const email = session?.user?.email
```

---

## 🏢 Group Management

### Get Selected Group

```tsx
import { useGroups } from "./utils/hooks/useGroups"

function MyComponent() {
  const { selectedGroup, groups, selectGroup } = useGroups(session)
  
  return (
    <div>
      <p>Current: {selectedGroup?.name}</p>
      <p>Total groups: {groups.length}</p>
    </div>
  )
}
```

### Check if Admin

```tsx
const isAdmin = selectedGroup?.userRole === "admin"

{isAdmin && <AdminOnlyButton />}
```

---

## 🎨 Styling

### Tailwind Classes

```tsx
// Colors
className="bg-primary text-primary-foreground"
className="bg-card text-card-foreground"
className="bg-muted text-muted-foreground"

// Dark mode
className="bg-white dark:bg-card"
className="text-black dark:text-white"

// Responsive
className="flex-col lg:flex-row"
className="hidden lg:block"
className="text-sm lg:text-base"

// Animations
className="animate-fade-in"
className="animate-slide-up"
```

### Custom CSS Variables

```css
/* In styles/globals.css */
var(--primary)
var(--background)
var(--foreground)
var(--card)
var(--border)
var(--radius)
```

---

## 📱 Mobile Navigation

### Bottom Nav (Mobile Only)

5 items maximum:
1. Home (Dashboard)
2. Money (Contributions)
3. Payouts/Info (Dynamic)
4. Meetings
5. More (Sheet menu)

### Hamburger Menu (Mobile Only)

- Top left corner
- Full app navigation
- Profile & settings access

---

## 🚀 Deployment

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Backend (Supabase)

```bash
# Login
supabase login

# Link project
supabase link --project-ref xxxxx

# Deploy functions
supabase functions deploy make-server-34d0b231

# Set secrets
supabase secrets set KEY=value
```

---

## 🐛 Debugging

### Frontend Errors

```tsx
// Check console
console.log('Debug:', data)

// Use React DevTools
// Install: https://react.dev/learn/react-developer-tools
```

### Backend Errors

```bash
# View function logs
supabase functions logs make-server-34d0b231

# Test locally
supabase functions serve

# Test endpoint
curl http://localhost:54321/functions/v1/make-server-34d0b231/health
```

### Network Errors

1. Open browser DevTools
2. Go to Network tab
3. Check failed requests
4. Verify URL and headers

---

## 📊 Useful Snippets

### Create Loading State

```tsx
const [loading, setLoading] = useState(false)

try {
  setLoading(true)
  await doSomething()
} finally {
  setLoading(false)
}

return loading ? <LoadingProgress /> : <Content />
```

### Show Toast Notification

```tsx
import { toast } from "sonner@2.0.3"

toast.success("Success!")
toast.error("Error occurred")
toast.info("FYI...")
```

### Confirm Before Action

```tsx
const [showConfirm, setShowConfirm] = useState(false)

<ConfirmationDialog
  open={showConfirm}
  onOpenChange={setShowConfirm}
  title="Delete Item?"
  description="This cannot be undone."
  onConfirm={handleDelete}
  variant="destructive"
/>
```

---

## 📚 Documentation Links

- **React**: https://react.dev
- **TypeScript**: https://typescriptlang.org
- **Tailwind**: https://tailwindcss.com
- **Shadcn/ui**: https://ui.shadcn.com
- **Supabase**: https://supabase.com/docs
- **Lucide Icons**: https://lucide.dev

---

## ✅ Pre-Deploy Checklist

- [ ] All features tested
- [ ] Environment variables set
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] TypeScript compiles
- [ ] Build succeeds
- [ ] Lighthouse score > 90

---

**Quick tip:** Bookmark this page for fast reference! 🔖

**Last Updated:** October 2025
