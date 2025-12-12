# ForexAI - AI-Powered Trading Intelligence Platform

## Overview

ForexAI is a full-stack web application that provides AI-powered forex chart analysis. Users can upload trading charts and receive institutional-grade analysis including trend detection, entry/exit points, stop-loss levels, and trading recommendations. The platform uses a credit-based model where admins manually manage user credits.

## Recent Changes

- **December 12, 2025**: Removed Stripe integration (not available in South Africa). Credits are now managed manually by admins via the admin panel. Users contact admin to purchase credits.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme variables
- **Animations**: Framer Motion for transitions and effects
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints under `/api/*` prefix
- **Authentication**: Replit Auth via OpenID Connect with Passport.js
- **Session Management**: Express sessions stored in PostgreSQL via connect-pg-simple

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Key Tables**:
  - `users`: User accounts with roles (user/admin) and subscription plans
  - `sessions`: Authentication session storage
  - `analyses`: Stored chart analysis results
  - `systemConfig`: Application-wide settings
  - `usageTracking`: Daily usage limits per user

### AI Integration
- **Primary**: Replit AI integration via OpenAI-compatible API
- **Alternatives**: Support for Groq and OpenAI direct APIs
- **Purpose**: Forex chart image analysis with structured trading recommendations
- **Configuration**: Dynamic provider selection via system config

### Authentication Flow
- Replit Auth handles user authentication via OIDC
- Users are automatically created/updated on first login (upsert pattern)
- Role-based access control (user vs admin)
- Protected routes redirect to `/api/login` when unauthorized

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Route pages (Landing, Dashboard, Admin)
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and query client
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database access layer
│   ├── openai.ts     # AI integration
│   └── replitAuth.ts # Authentication setup
├── shared/           # Shared code
│   └── schema.ts     # Drizzle database schema
└── migrations/       # Database migrations
```

### Build System
- Development: Vite dev server with HMR
- Production: Custom build script using esbuild for server, Vite for client
- Output: Bundled to `dist/` directory

## External Dependencies

### Database
- PostgreSQL (required, connection via DATABASE_URL environment variable)
- Drizzle ORM for type-safe database queries
- Drizzle Kit for schema migrations (`npm run db:push`)

### Authentication
- Replit Auth (OIDC provider)
- Required environment variables: `REPL_ID`, `ISSUER_URL`, `SESSION_SECRET`

### AI Services
- Replit AI (default): `AI_INTEGRATIONS_OPENAI_BASE_URL`
- Groq (optional): `GROQ_API_KEY`
- OpenAI (optional): `CUSTOM_OPENAI_API_KEY`

### Third-Party Libraries
- Radix UI: Accessible component primitives
- TanStack Query: Data fetching and caching
- Framer Motion: Animation library
- date-fns: Date formatting utilities
- Zod: Runtime type validation (with drizzle-zod for schema integration)