# FUTODAMA - AI-Powered Job Description & Resume Processor

## Overview

FUTODAMA is a full-stack application designed to extract and normalize information from job descriptions and resumes into structured data using AI. It processes documents (PDF, DOCX) or plain text, leveraging OpenAI's API and a configurable "codex" system for defining extraction schemas and normalization rules. The application aims to standardize recruitment data, featuring capabilities like job description and resume processing, a split-view interface with a canvas-based PDF viewer, real-time processing logs, and a profile browsing system. The project's ambition is to streamline the hiring process by providing precise, AI-extracted data.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript, using Vite for tooling. UI components are developed with shadcn/ui (based on Radix UI) and styled using Tailwind CSS, supporting a dark mode theme. State management for server interactions relies on React Query, while local state uses React hooks. Wouter handles client-side routing. The file structure is organized with clear separation for components, pages, and utilities. A key feature is the canvas-based PDF viewer, replacing browser iframes for enhanced functionality and security, alongside a comprehensive profile browsing interface with modal overlays for detailed views and pagination.

### Backend Architecture

The backend uses Express.js with TypeScript in ESM mode, providing a RESTful API for document processing and codex management. It supports PDF and DOCX parsing, integrates with OpenAI GPT for AI extraction and validation using structured JSON and custom prompts, and employs an abstracted storage layer.

#### Service Layer Architecture

The backend follows a thin-routes pattern with dedicated service modules:

- **server/services/jobFlows.ts**: Orchestrates job creation, file upload processing, and job card extraction
- **server/services/resumeFlows.ts**: Handles resume creation, file upload, and vision-based extraction
- **server/services/matchFlows.ts**: Manages Step 1 (skill-based) and Step 2 (AI-deep) candidate matching
- **server/services/tailorFlows.ts**: Orchestrates the 3-pass resume tailoring pipeline
- **server/services/processingFlows.ts**: Core extraction and validation workflows for jobs and resumes
- **server/services/types.ts**: Common TypeScript interfaces for service layer types

#### Error Handling and Logging

- **Centralized Errors** (server/utils/errors.ts): AppError class with factory functions (notFound, badRequest, forbidden, unprocessable)
- **Structured Logging** (server/utils/logger.ts): Leveled logging (info, warn, error, debug) with context support and timer functions
- **Observability**: /health and /version endpoints for monitoring

### Data Architecture

PostgreSQL is the chosen database, managed with Drizzle ORM for type-safe operations. The schema includes tables for Jobs, Resumes, and Codexes, utilizing JSON columns for flexible data storage. Type safety across the frontend and backend is enforced using shared TypeScript schemas generated via Zod.

### AI Processing Pipeline

The core AI functionality is driven by a configurable "Codex System" that defines JSON schemas, prompts for AI models, and normalization/validation rules. A "Two-Pass v2.1 System" enhances extraction by separating verbatim extraction from intelligent classification of requirements into categories like `experience_required`, `technical_skills`, and `soft_skills`, with robust evidence tracking and anti-hallucination safeguards. Backend parsers normalize human text into structured data formats for currencies, dates, workloads, and durations. A "Step 1 Matching System V2" provides semantic skill-based matching between job requirements and resume content using fuzzy comparison, synonym detection, and graduated scoring. The "Resume Tailor Agent" is an AI-powered three-pass pipeline that takes a parsed resume and job card to produce a tailored resume bundle, including coverage analysis, diffs, warnings, and an ATS report, while strictly adhering to anti-fabrication policies.

### Core Architectural Principles

- **Single Source of Truth for Domain Types**: All main domain entities are defined in `/shared/schema.ts` using Drizzle and Zod.
- **Storage Layer as the ONLY DB Boundary**: All database access is mediated through the `storage` layer (`/server/storage.ts`).
- **Separation of Concerns in the Backend**: Emphasizes thin routes, services for business logic, and a dedicated storage layer.
- **Codex-Driven Extraction**: Relies on declarative codex files for defining extraction templates.
- **Job Card Schema Discipline**: Strict adherence to the `job-card-v1.schema.json` for extending job schemas.
- **Frontend Structure**: Rooted in `App.tsx`, utilizing a `Layout` component, React Query for data fetching, and types from `/shared/schema.ts`.
- **Error Handling**: Centralized error-handling middleware in the backend.
- **File Uploads**: Handled by Multer, with strict file type restrictions and secure storage practices.
- **Code Guidelines**: Emphasizes separation of concerns, small functions, strict TypeScript, and Zod validation.

## External Dependencies

- **OpenAI API**: Used for AI-powered job description extraction and validation, leveraging GPT models with structured JSON responses.
- **Neon Database**: Serverless PostgreSQL hosting for production environments.
- **Document Processing**: Utilizes `pdf-parse` and `docx-parser` libraries for document content extraction, and PDF.js for canvas-based PDF rendering.
- **Development Tools**: Includes Replit-specific plugins, ESBuild for production bundling, and PostCSS with Tailwind CSS.
- **UI Libraries**: Radix UI for accessible components, Lucide React for iconography, React Hook Form with Zod resolvers for validation, and Date-fns for date utilities.

## Deployment Notes

### Vision Fallback for Image-Only PDFs

The system includes a vision fallback for processing image-only PDFs (PDFs where text extraction yields less than 200 characters). This fallback requires:

- **ImageMagick**: For PDF to image conversion
- **Ghostscript**: For PDF rendering

When these dependencies are not available, the system gracefully fails with a clear error message directing users to paste the job description text directly. Monitor server logs for `VISION_SYSTEM_DEPS_MISSING` events to track when users encounter this limitation.

Structured logging events for vision fallback:
- `TEXT_EXTRACTION_TOO_SHORT` - Triggered when text extraction is below 200 chars
- `VISION_EXTRACTION_SUCCESS` - Vision/OCR successfully extracted text
- `VISION_EXTRACTION_FAILED` - Vision/OCR failed to extract meaningful text
- `VISION_SYSTEM_DEPS_MISSING` - ImageMagick/Ghostscript not installed