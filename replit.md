# FUTODAMA - AI-Powered Job Description Digester

## Overview

FUTODAMA is a full-stack application that extracts and normalizes job descriptions into structured "Job Cards" using AI. The system processes uploaded documents (PDF, DOCX) or plain text input, extracts relevant information using OpenAI's API, and presents it in a standardized format. The application features a configurable "codex" system that defines extraction schemas and normalization rules, making it adaptable for different job description formats and requirements.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool and development server.

**UI Components**: Built with shadcn/ui component library based on Radix UI primitives and styled with Tailwind CSS. The design system uses CSS custom properties for theming with a dark mode color scheme.

**State Management**: Uses React Query (@tanstack/react-query) for server state management, caching, and API interactions. Local component state is managed with React hooks.

**Routing**: Simple client-side routing implemented with Wouter library for lightweight navigation.

**File Structure**: Clean separation with components in `/client/src/components`, pages in `/client/src/pages`, and utility functions in `/client/src/lib`.

### Backend Architecture

**Server Framework**: Express.js with TypeScript running in ESM mode.

**API Design**: RESTful API with endpoints for job processing, codex management, and status polling. File uploads handled via multer middleware.

**Document Processing**: Supports PDF and DOCX parsing with dedicated service modules. Text extraction is handled by document-specific parsers.

**AI Integration**: OpenAI GPT integration for job description extraction and validation using structured JSON responses and custom prompts.

**Storage Layer**: Abstracted storage interface with in-memory implementation for development. Designed to be easily swapped with database implementations.

### Data Architecture

**Database**: PostgreSQL with Drizzle ORM for type-safe database operations and migrations.

**Schema Design**: 
- Jobs table stores processing status, original text, extracted job cards, and metadata
- Codexes table stores AI extraction configurations, schemas, and normalization rules
- JSON columns used for flexible storage of job cards and codex configurations

**Type Safety**: Shared TypeScript schemas between frontend and backend using Zod for validation and type inference.

### AI Processing Pipeline

**Codex System**: Configurable extraction templates that define:
- JSON schemas for structured output
- System and user prompts for AI models
- Field normalization rules (e.g., work mode mapping)
- Missing field validation rules

**Processing Flow**:
1. Document upload and parsing
2. Text extraction and preprocessing  
3. AI-powered information extraction using codex prompts
4. Data validation and normalization
5. Structured job card generation

**Error Handling**: Comprehensive error tracking throughout the pipeline with status updates and user feedback.

### External Dependencies

**OpenAI API**: Core dependency for job description extraction using GPT models. The system uses structured JSON responses and custom prompts defined in codex configurations.

**Neon Database**: Serverless PostgreSQL hosting for production database with connection pooling.

**Document Processing**: 
- PDF parsing capabilities (pdf-parse library)
- DOCX document processing (docx-parser library)

**Development Tools**:
- Replit-specific plugins for development environment integration
- ESBuild for server-side bundling in production
- PostCSS with Tailwind for CSS processing

**UI Libraries**:
- Radix UI primitives for accessible components
- Lucide React for consistent iconography
- React Hook Form with Zod resolvers for form validation
- Date-fns for date manipulation utilities