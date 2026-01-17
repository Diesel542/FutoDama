# CLAUDE.md - AI Assistant Context for FUTODAMA

## Project Overview

FUTODAMA is an AI-powered recruitment data processor that extracts and normalizes information from job descriptions and resumes into structured data. It uses OpenAI's API with a configurable "codex" system for defining extraction schemas.

## Tech Stack

- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix UI), React Query, Wouter (routing)
- **Backend**: Express.js + TypeScript (ESM), Drizzle ORM
- **Database**: PostgreSQL (Neon serverless)
- **AI**: OpenAI GPT (structured JSON extraction)
- **Document Processing**: pdf-parse, docx-parser, PDF.js

## Project Structure

```
├── client/src/           # React frontend
│   ├── components/       # UI components (shadcn/ui based)
│   ├── pages/            # Route pages
│   └── lib/              # Utilities
├── server/               # Express backend
│   ├── services/         # Business logic (thin-routes pattern)
│   │   ├── jobFlows.ts       # Job creation & extraction
│   │   ├── resumeFlows.ts    # Resume processing
│   │   ├── matchFlows.ts     # Candidate matching
│   │   ├── tailorFlows.ts    # Resume tailoring pipeline
│   │   └── processingFlows.ts # Core extraction
│   ├── utils/            # Error handling & logging
│   ├── routes.ts         # API routes
│   └── storage.ts        # Database access layer
├── shared/               # Shared types
│   └── schema.ts         # Drizzle schemas + Zod types (SINGLE SOURCE OF TRUTH)
├── codex/                # AI extraction templates
└── test/                 # Vitest tests
```

## Key Commands

```bash
npm run dev          # Start development server (tsx)
npm run build        # Build for production (vite + esbuild)
npm run check        # TypeScript type check
npm run start        # Run production build
npm run db:push      # Push schema changes to database (drizzle-kit)
npx vitest           # Run tests
```

## Path Aliases

```typescript
@/*       → ./client/src/*
@shared/* → ./shared/*
```

## Architecture Principles

1. **Single Source of Truth**: All domain types defined in `/shared/schema.ts` using Drizzle + Zod
2. **Storage Layer**: ALL database access through `/server/storage.ts` - no direct DB calls elsewhere
3. **Thin Routes**: Routes delegate to service modules for business logic
4. **Codex-Driven Extraction**: AI prompts and schemas defined in `/codex/*.json` files

## Error Handling

- **AppError class** in `server/utils/errors.ts` with factories: `notFound()`, `badRequest()`, `forbidden()`, `unprocessable()`
- **Logger** in `server/utils/logger.ts`: `info()`, `warn()`, `error()`, `debug()` with context support

## Key Schemas

- **JobCard** (`jobCardSchema`): Structured job description data
- **ResumeCard** (`resumeCardSchema`): Structured resume data
- **TailoringOptions** (`tailoringOptionsSchema`): Resume tailoring configuration

## Testing

Tests use Vitest located in `/test/**/*.test.ts`. Run with `npx vitest`.

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key

## Important Conventions

- Dark mode UI with Linear-inspired design (see `design_guidelines.md`)
- Strict TypeScript with Zod validation at boundaries
- ESM modules throughout (`"type": "module"` in package.json)
- File uploads handled by Multer with strict type restrictions

## AI Processing

- **Two-Pass v2.1 System**: Separates verbatim extraction from intelligent classification
- **Step 1 Matching**: Semantic skill-based matching with fuzzy comparison
- **Resume Tailor Agent**: 3-pass pipeline for tailored resume generation
- **Anti-hallucination safeguards**: Evidence tracking with strict adherence policies
