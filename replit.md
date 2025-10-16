# FUTODAMA - AI-Powered Job Description & Resume Processor

## Overview

FUTODAMA is a full-stack application that extracts and normalizes both job descriptions and resumes into structured data using AI. The system processes uploaded documents (PDF, DOCX) or plain text input, extracts relevant information using OpenAI's API, and presents it in a standardized format. The application features a configurable "codex" system that defines extraction schemas and normalization rules, making it adaptable for different document formats and requirements.

**Key Features** (October 2025):
- **Job Description Processing**: Extract job requirements, project details, skills, and contact information
- **Resume Processing**: Extract personal info, work experience, education, portfolio, skills, certifications, and reviews  
- **Split-View Interface**: Canvas-based PDF viewer alongside tabbed AI-extracted information with centralized view mode controls
- **Real-time Processing Logs**: WebSocket-based live updates during extraction
- **Five Navigation Tabs**: 
  - Job Description Upload: Upload and process single job descriptions
  - Resume Upload: Upload and process single resumes
  - Batch Processing: Upload and process multiple documents at once
  - Job Descriptions: Browse and manage stored job descriptions (placeholder - coming soon)
  - Profiles: Browse and manage stored candidate profiles (placeholder - coming soon)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool and development server.

**UI Components**: Built with shadcn/ui component library based on Radix UI primitives and styled with Tailwind CSS. The design system uses CSS custom properties for theming with a dark mode color scheme.

**State Management**: Uses React Query (@tanstack/react-query) for server state management, caching, and API interactions. Local component state is managed with React hooks.

**Routing**: Simple client-side routing implemented with Wouter library for lightweight navigation.

**File Structure**: Clean separation with components in `/client/src/components`, pages in `/client/src/pages`, and utility functions in `/client/src/lib`.

**Resume Upload & Viewer Architecture** (October 2025): Split layout with real-time processing feedback
- **ResumeUploadSection**: Inline upload interface matching Job Description Upload pattern
  - Left card: Drag & drop file upload (PDF/DOCX/TXT) or text paste area
  - Right card: AI Agent Status and real-time WebSocket processing logs
  - Form data persists after upload to enable reprocessing and editing
  - Button state management: disabled during processing, re-enabled on completion via onResumeCompleted callback
- **ResumeViewer**: Results display component with view mode management
  - Appears below upload section when processing completes
  - Owns view mode state ('split' or 'extracted')
  - Auto-switches to split view when document is available
  - Renders PDFViewer and ResumeCard in split layout
  - Calls onResumeCompleted callback to notify parent when processing finishes
- **ResumeCard**: Pure presentation component displaying extracted information in tabs
  - No view mode logic or state
  - Single source of truth architecture
- **PDFViewer Fix** (October 2025): Resolved "Failed to load PDF document" error
  - Root cause: In development mode, PDF.js was fetching from Vite dev server origin instead of Express API origin, resulting in 404 errors
  - Solution: Convert relative URLs to absolute URLs using `window.location.origin` to ensure PDF.js fetches from correct origin
  - Backward compatibility: Magic number detection serves old PDFs (no extension) with proper MIME types

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
- Resumes table stores processing status, original text, extracted resume cards, document paths, and optional job associations
- Codexes table stores AI extraction configurations, schemas, and normalization rules
- JSON columns used for flexible storage of job cards, resume cards, and codex configurations

**Type Safety**: Shared TypeScript schemas between frontend and backend using Zod for validation and type inference.

### AI Processing Pipeline

**Codex System**: Configurable extraction templates that define:
- JSON schemas for structured output
- System and user prompts for AI models
- Field normalization rules (e.g., work mode mapping)
- Missing field validation rules

**Two-Pass v2.1 System** (September 2025): Enhanced extraction to solve experience vs. skills miscategorization:
- **Pass 1 (extractRawRequirements)**: Verbatim extraction with source quotes - NO interpretation allowed
- **Pass 2 (classifyRequirements)**: Intelligent classification into experience_required (years/seniority/background), technical_skills (tools/frameworks/languages), soft_skills (communication/leadership/teamwork)
- **Evidence Tracking**: Every classified item must cite an exact source quote from the job description
- **Anti-Hallucination Safeguards**:
  - Programmatic verification that evidence quotes exist in source text (substring validation)
  - Fields with data but no evidence are flagged as warnings in missing_fields
  - Low-confidence classifications (<0.8) are automatically flagged
  - Confidence scoring per field with programmatic enforcement

**Backend Parsers**: Normalize human text to structured data:
- Currency ranges: "$150-200k/year" → min/max/currency/unit with k-multiplier support
- ISO dates: "Q2 2025", "January 2024", "ASAP" → YYYY-MM-DD format
- Workload: "40 hours/week", "80%", "full-time" → hours_week with % conversion
- Duration: "6 months", "1 year", "contract-to-hire" → duration_days
- All parsers include confidence scoring and fallback handling

**Processing Flow**:
1. Document upload and parsing
2. Text extraction and preprocessing  
3. AI-powered two-pass extraction (v2.1) or single-pass extraction (v1)
4. Backend parser normalization (v2.1: start_date_iso, duration_days, workload_hours_week, rate_min/max)
5. Evidence validation: verify all quotes exist in source text
6. Low-confidence flagging: mark fields <0.8 confidence as warnings
7. Structured job card generation with missing_fields alerts

**Error Handling**: Comprehensive error tracking throughout the pipeline with status updates and user feedback. Hallucinations are detected and logged with warnings.

### External Dependencies

**OpenAI API**: Core dependency for job description extraction using GPT models. The system uses structured JSON responses and custom prompts defined in codex configurations.
- **Critical GPT-5 Bug** (October 2025): NEVER use `max_completion_tokens` parameter with GPT-5 - it causes empty responses. Let the model use safe defaults.

**Neon Database**: Serverless PostgreSQL hosting for production database with connection pooling.

**Document Processing**: 
- PDF parsing capabilities (pdf-parse library)
- DOCX document processing (docx-parser library)
- PDF.js for image-based PDF conversion (worker loaded via Vite's `?url` import)
- **Canvas-based PDF Viewer** (October 2025): Custom PDF.js viewer component replaces browser iframes
  - Renders PDFs on HTML5 canvas to bypass browser security restrictions
  - Includes page navigation (prev/next) and zoom controls (50-300%)
  - Automatically resets to page 1 when loading new documents
  - Proper cleanup prevents memory leaks when switching between PDFs

**Development Tools**:
- Replit-specific plugins for development environment integration
- ESBuild for server-side bundling in production
- PostCSS with Tailwind for CSS processing

**UI Libraries**:
- Radix UI primitives for accessible components
- Lucide React for consistent iconography
- React Hook Form with Zod resolvers for form validation
- Date-fns for date manipulation utilities