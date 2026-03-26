# Stok-pile Developer Guide

> Technical documentation for developers working on Stok-pile

---

## 📖 Table of Contents

1. [Tech Stack](#tech-stack)
2. [Setup](#setup)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Routes](#api-routes)
6. [Deployment](#deployment)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS v4** - Styling
- **Shadcn/ui** - Component library
- **Lucide React** - Icons
- **Recharts** - Data visualization

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Storage
  - Edge Functions (Deno)
- **Row Level Security** - Data isolation

### Deployment
- **Vercel** or **Netlify** - Frontend hosting
- **Supabase Cloud** - Backend hosting

---

## Setup

### Prerequisites

```bash
- Node.js 18+ 
- npm or yarn
- Supabase account
- Git
```

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd stok-pile
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create `.env.local`:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Run development server**
```bash
npm run dev
```

Visit `http://localhost:5173`

---

## Architecture

### Project Structure

```
/
├── components/           # React components
│   ├── ui/              # Shadcn UI components
│   └── *.tsx            # Feature components
├── docs/                # Documentation
├── utils/               # Utilities and hooks
│   ├── hooks/          # Custom React hooks
│   └── supabase/       # Supabase utilities
├── styles/             # Global styles
├── supabase/           # Backend code
│   └── functions/      # Edge functions
└── public/             # Static assets
```

### Key Concepts

**Multi-Group Architecture:**
- Users can belong to multiple groups
- Each group has isolated data
- Row-level security enforces access control

**Role-Based Permissions:**
- **Admin** - Full control of group
- **Member** - Limited permissions

**Meeting-Specific Features:**
- Voting, Notes, and Chat are tied to specific meetings
- Not global group features

---

## Database Schema

### Key Tables

**Key-Value Store:**
```typescript
kv_store_34d0b231 {
  key: string (PK)
  value: jsonb
  created_at: timestamp
  updated_at: timestamp
}
```

**Data stored in KV:**
- `user:{userId}` - User profile
- `group:{groupId}` - Group details
- `member:{groupId}:{userId}` - Membership
- `contribution:{groupId}:{id}` - Contributions
- `payout:{groupId}:{id}` - Payouts
- `meeting:{groupId}:{id}` - Meetings
- `vote:{meetingId}:{id}` - Meeting votes
- `note:{meetingId}:{id}` - Meeting notes
- `message:{meetingId}:{id}` - Meeting chat
- `constitution:{groupId}` - Group constitution metadata

### Key Utilities

Import KV utilities:
```typescript
import * as kv from './supabase/functions/server/kv_store.tsx';
```

Available functions:
```typescript
kv.get(key: string)           // Get single value
kv.set(key: string, value)    // Set value
kv.del(key: string)           // Delete value
kv.mget(keys: string[])       // Get multiple values
kv.mset(entries)              // Set multiple values
kv.mdel(keys: string[])       // Delete multiple values
kv.getByPrefix(prefix: string) // Get all with prefix
```

---

## API Routes

### Frontend API (`/utils/api.ts`)

All frontend API calls go through the centralized API utility.

**Base URL:**
```typescript
https://{projectId}.supabase.co/functions/v1/make-server-34d0b231
```

**Authentication:**
```typescript
Authorization: Bearer {publicAnonKey}
```

### Backend Routes (`/supabase/functions/server/index.tsx`)

All routes are prefixed with `/make-server-34d0b231/`

**Example Routes:**
- `GET /health` - Health check
- `POST /groups/create` - Create group
- `GET /groups/{groupId}` - Get group
- `POST /contributions/add` - Add contribution
- etc.

---

## Deployment

### Frontend Deployment (Vercel)

1. **Connect repository to Vercel**
2. **Set environment variables:**
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   ```
3. **Deploy**
   ```bash
   npm run build
   vercel --prod
   ```

### Frontend Deployment (Netlify)

1. **Connect repository to Netlify**
2. **Set build command:** `npm run build`
3. **Set publish directory:** `dist`
4. **Set environment variables**
5. **Deploy**

### Backend Deployment (Supabase)

1. **Initialize Supabase CLI**
```bash
supabase init
supabase login
supabase link --project-ref your-project-ref
```

2. **Deploy Edge Functions**
```bash
supabase functions deploy make-server-34d0b231
```

3. **Set secrets**
```bash
supabase secrets set SUPABASE_URL="your-url"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-key"
```

---

## Testing

### Manual Testing Checklist

- [ ] Sign up / Sign in
- [ ] Create group
- [ ] Join group
- [ ] Add contribution
- [ ] Schedule payout (admin)
- [ ] Schedule meeting (admin)
- [ ] Add vote, note, chat to meeting
- [ ] Upload constitution (admin)
- [ ] Invite members (admin)
- [ ] Switch between groups
- [ ] Mobile navigation
- [ ] Dark mode toggle
- [ ] Profile update
- [ ] Sign out

### Testing Edge Functions

```bash
# Invoke function locally
supabase functions serve

# Test endpoint
curl http://localhost:54321/functions/v1/make-server-34d0b231/health
```

---

## Troubleshooting

### Common Issues

**1. "Failed to fetch" errors**
- Check Supabase URL and keys
- Verify CORS settings
- Check network tab for errors

**2. "Row level security" errors**
- Verify RLS policies on tables
- Check user authentication
- Ensure proper group membership

**3. "Function not found" errors**
- Redeploy edge functions
- Check function name
- Verify route prefix

**4. Build errors**
- Clear node_modules and reinstall
- Check TypeScript errors
- Verify all imports

### Debug Mode

Enable console logging:
```typescript
console.log('Debug:', data);
```

Check Supabase logs:
```bash
supabase functions logs make-server-34d0b231
```

---

## Best Practices

### Code Style
- Use TypeScript for type safety
- Follow React best practices
- Use functional components
- Implement error boundaries

### Security
- Never expose service role key in frontend
- Always validate user input
- Use RLS for data access
- Sanitize user data

### Performance
- Lazy load components
- Optimize images
- Use React.memo for expensive components
- Implement proper loading states

---

## 🔧 Development Tools

- **VS Code** - Recommended editor
- **React Developer Tools** - Browser extension
- **Supabase CLI** - Backend management
- **Postman** - API testing

---

## 📚 Resources

- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Shadcn/ui](https://ui.shadcn.com)

---

**Need help?** Check the troubleshooting section or reach out to the team.

**Last Updated:** October 2025
