# CallOS

Sales Call Orchestration & Objection Flow App - A standardized, integrity-based sales call operating system.

## Quick Start

### Prerequisites

- Node.js 18.x or higher
- Docker and Docker Compose
- npm (comes with Node.js)

### Setup (< 5 minutes)

```bash
# 1. Clone the repository
git clone <repo-url>
cd Sales-OS

# 2. Install dependencies
npm install

# 3. Start the database
docker-compose up -d

# 4. Set up environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# 5. Generate Prisma client
npm run db:generate

# 6. Run database migrations
npm run db:migrate

# 7. Seed the database with initial data
npm run db:seed

# 8. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env` file based on `.env.example`:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key | Yes |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook verification | Yes |
| `NEXT_PUBLIC_APP_URL` | Application base URL | Yes |

For local development with Docker:
```
DATABASE_URL=postgresql://callos:callos_dev_password@localhost:5432/callos_dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | Run TypeScript type check |
| `npm test` | Run tests |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npm run db:seed` | Seed database with initial data |

## Project Structure

```
Sales-OS/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (agent)/           # Agent dashboard & call UI
│   ├── (manager)/         # Manager analytics
│   ├── (admin)/           # Admin configuration
│   └── api/               # API route handlers
├── src/
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Zustand state stores
│   ├── services/          # Business logic layer
│   └── lib/               # Utilities and types
├── prisma/                # Database schema
├── docs/                  # Project documentation
└── .claude/               # AI agent instructions
```

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: Clerk
- **State**: Zustand
- **Styling**: Tailwind CSS

## Documentation

- [Project Context](./PROJECT_CONTEXT.md) - Business overview
- [Backend Architecture](./.claude/rules/backend-architecture.md) - API patterns
- [Frontend Architecture](./.claude/rules/frontend-architecture.md) - Component patterns
- [Design System](./.claude/rules/design-system.md) - UI guidelines

## License

Private - All rights reserved
