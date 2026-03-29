# Stokpile - Group Financial Management Platform

> A mobile-first, accessible platform for managing Stokvel groups and savings clubs with Supabase backend.

[![TypeScript](https://img.shields.io/badge/typescript-100%25-blue.svg)](https://github.com)
[![Mobile](https://img.shields.io/badge/mobile-first-green.svg)](https://github.com)
[![Accessibility](https://img.shields.io/badge/WCAG-AA-purple.svg)](https://github.com)

---

## 🎯 What is Stokpile?

Stokpile is a comprehensive financial group management application designed for Stokvels, ROSCAs, savings clubs, and community savings groups. It provides robust tools for tracking contributions, managing payouts, scheduling meetings, and coordinating group activities.

### Key Features

- 💰 **Contributions Tracking** - Record and monitor member contributions
- 📊 **Financial Dashboard** - Real-time overview of group finances
- 💸 **Payout Management** - Schedule and track group payouts
- 📅 **Meeting Management** - Schedule meetings with voting, notes, and chat
- 👥 **Member Management** - Invite members, manage roles, and permissions
- 🔐 **Multi-Group Support** - Manage multiple groups from one account
- 📱 **Mobile-First Design** - Native app experience on any device
- 🌙 **Dark Mode** - Modern dark theme with vibrant accents
- ♿ **Accessible** - WCAG AA compliant with screen reader support

---

## 🚀 Quick Start

### For Users

**Getting Started:**
1. Sign up or sign in
2. Create your first group or join an existing one
3. Start adding contributions
4. Schedule meetings and payouts (admins only)

**Mobile Navigation:**
- Tap ☰ (top left) to access menu and settings
- Use bottom nav for quick access to main features
- Tap + button for quick actions

### For Developers

**Setup:**
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

**Environment Variables:**
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Tech Stack:**
- React + TypeScript
- Tailwind CSS v4
- Supabase (Database, Auth, Storage)
- Vite
- Shadcn/ui Components

---

## 📚 Documentation

Detailed documentation is available in the `/docs` folder:

- **[User Guide](./docs/USER_GUIDE.md)** - Complete user documentation
- **[Developer Guide](./docs/DEVELOPER_GUIDE.md)** - Development and deployment guide
- **[Monetization Strategy](./docs/MONETIZATION_STRATEGY.md)** - Business model and pricing
- **[Monetization Implementation](./docs/MONETIZATION_IMPLEMENTATION.md)** - Technical implementation

---

## 🏗️ Architecture

### Frontend
- **React** - Component-based UI
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Shadcn/ui** - Beautiful, accessible components

### Backend
- **Supabase** - PostgreSQL database
- **Edge Functions** - Serverless API
- **Row Level Security** - Data isolation
- **Real-time subscriptions** - Live updates

### Key Design Decisions
- Mobile-first responsive design
- Multi-group architecture with complete data isolation
- Role-based permissions (admin/member)
- Meeting-specific features (voting, notes, chat)
- Constitution management with secure storage

---

## 🔐 Security

- Row-level security on all database tables
- User authentication via Supabase Auth
- Group-level data isolation
- Role-based access control
- Secure file storage for constitutions

---

## 📱 PWA Support

Stokpile is installable as a Progressive Web App:
- Works offline (basic functionality)
- Install on mobile home screen
- Native app-like experience

---

## 🌍 Deployment

**Platforms:**
- Vercel (recommended)
- Netlify
- Any static hosting platform

**Supabase Setup:**
1. Create Supabase project
2. Run database migrations
3. Configure environment variables
4. Deploy edge functions

See [Developer Guide](./docs/DEVELOPER_GUIDE.md) for detailed deployment instructions.

---

## 🤝 Contributing

This is a private project, but contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

All rights reserved. This is proprietary software.

---

## 🆘 Support

For support, please contact the development team or refer to the documentation.

---

## 🎉 Acknowledgments

Built with modern web technologies and best practices for accessibility, performance, and user experience.

---

**Made with ❤️ for financial communities**
