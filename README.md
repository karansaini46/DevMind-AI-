# DevMind AI

DevMind AI is an automated, production-grade AI code-review engine and semantic search platform. Built to streamline software quality assurance, it combines a React and TypeScript frontend with a Node.js, Express, and Prisma backend to deliver real-time code analysis. It integrates with GitHub webhooks, queueing file changes into a Redis-backed background processor for structured AI evaluations, and indexes code using PostgreSQL and pgvector for semantic discovery.

## Technical Architecture

The platform architecture is designed to handle file analysis asynchronously, preventing bottleneck issues under heavy Git traffic.

```
                  ┌────────────────────────┐
                  │   GitHub Push Events   │
                  └───────────┬────────────┘
                              │
                              ▼
                  ┌────────────────────────┐
                  │ Timing-Safe HMAC Sign  │
                  └───────────┬────────────┘
                              │
                              ▼
                  ┌────────────────────────┐
                  │    Idempotent Check    ├────────┐ (Skip if duplicate)
                  └───────────┬────────────┘        │
                              │                     │
                              ▼                     ▼
                  ┌────────────────────────┐   ┌─────────────┐
                  │   Queue File Job       │   │ Publish SSE │
                  │     (BullMQ/Redis)     │   │ Old Review  │
                  └───────────┬────────────┘   └─────────────┘
                              │
                              ▼
                  ┌────────────────────────┐
                  │    Worker Process      │
                  └───────────┬────────────┘
                              │
                              ▼
         ┌────────────────────┴────────────────────┐
         ▼                                         ▼
┌────────────────────────┐                ┌────────────────────────┐
│ LangChain & Gemini AI  │                │ Vector Indexing Engine │
│   Structured Review    │                │ (gemini-embedding-001) │
└────────┬───────────────┘                └────────┬───────────────┘
         │                                         │
         ▼                                         ▼
┌────────────────────────┐                ┌────────────────────────┐
│ PostgreSQL db & Zod    │                │ pgvector Embeddings db │
└────────┬───────────────┘                └────────────────────────┘
         │
         ▼
┌────────────────────────┐
│ Real-Time SSE Publish  │
└────────────────────────┘
```

## System Highlights

### 1. Asynchronous Review Pipeline
- **BullMQ and Redis**: Incoming push files are ingested via GitHub webhooks and processed asynchronously through a robust worker-queue architecture. This guarantees that API timeouts or high Git commit density do not drop reviews or degrade server response.
- **Idempotency and Deduplication**: Each task is assigned a deterministic ID derived from the GitHub delivery ID and a SHA-256 hash of the file path. This prevents identical files in the same push from being reviewed multiple times.

### 2. LangChain and Structured AI Review Engine
- **Structured Outputs**: Leverages LangChain with the Gemini 2.5 Flash model and Zod parsing to guarantee a strict JSON output shape. The engine returns structured data including quick verdicts, multi-dimensional scores (demo score, production score), security risks, scale issues, type safety findings, and concrete refactoring code.
- **Dynamic Context Parsing**: Automatically detects the programming language and gathers specific structural context tags to supply rules to the LLM.
- **Multi-Mode Prompting**: Supports distinct review modes including `production`, `security`, `performance`, `strict`, `beginner`, and `interview`.

### 3. pgvector Semantic Search
- **Sliding Window Chunking**: Large code files are split into overlapping fragments (500-character size with a 50-character overlap) to maintain logical continuity.
- **Gemini Embeddings**: Fragments are processed through the `gemini-embedding-001` model to generate 768-dimensional vectors.
- **Prisma pgvector Integration**: Vectors are stored natively in PostgreSQL. Queries perform an SQL similarity match using the `<=>` cosine distance operator, utilizing window functions to deduplicate hits by snippet and returning the top matches.

### 4. Enterprise-Grade Security
- **Timing-Safe Webhook Signatures**: GitHub webhook signatures are verified using HMAC-SHA256. Buffers are compared using constant-time comparison (`timingSafeEqual`) to prevent timing side-channel attacks.
- **OAuth Token Encryption**: Users' GitHub access tokens are encrypted before database storage using AES-256-GCM (Authenticated Encryption). The key is derived via SHA-256 from a server environment secret.

### 5. Real-Time Streaming & Events
- **Server-Sent Events (SSE)**: Enables persistent, one-way push messaging from the server.
- **Manual Review Streaming**: Manual code reviews stream Markdown and structured reviews to the client in real-time.
- **Webhook Event Hub**: Webhook review events publish updates through a centralized Node.js `EventEmitter` to feed active SSE client streams when background jobs finish.

### 6. Automated GitHub Commit Comments
- **Inline GitHub Review**: After analyzing a commit pushed via a webhook, the system automatically posts the structured AI review (including scores, findings, and feedback) as a comment directly on the commit in GitHub.
- **Self-Service Access**: Authenticated users can connect their repos, and the app uses their OAuth token to post comments on their behalf.

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express (v5.1.0)
- **Database**: PostgreSQL (with pgvector extension)
- **ORM**: Prisma (v6.7.0)
- **AI Orchestration**: LangChain (`@langchain/core`, `@langchain/google`, `@langchain/google-genai`)
- **Task Queue**: BullMQ, ioredis
- **Security**: Passport.js (GitHub OAuth2), jsonwebtoken, bcrypt, crypto (AES-256-GCM, HMAC)
- **Testing**: Vitest, Supertest

### Frontend
- **Framework**: React (v19.1.0) with Vite
- **Language**: TypeScript
- **State Management**: Zustand
- **Code Editor**: CodeMirror (`@uiw/react-codemirror` with language extensions for JS, TS, Python, Go, Rust)
- **Routing**: React Router DOM (v7.15.1)
- **Forms**: React Hook Form with Zod validation resolver

## Database Schema

The database consists of four core tables:
- **User**: Stores local credentials, GitHub OAuth profiles, and webhook registrations. Stored GitHub OAuth access tokens are encrypted.
- **CodeSnippet**: Represents a snapshot of code analyzed manually or received via webhook.
- **Review**: Contains the structured feedback, scores, token usage metrics, and source tags (manual vs. webhook).
- **Embedding**: Houses the 768-dimensional pgvector embedding records and raw text chunks linked back to their parent snippet.

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (with pgvector installed)
- Redis server
- Google Gemini API Key
- GitHub OAuth Application Credentials (optional, for Git sync)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/karansaini46/DevMind-AI-.git
   cd DevMind-AI-
   ```

2. Install workspace dependencies:
   ```bash
   pnpm install
   ```

3. Configure the environment variables in both the root directory and the client directory:

   Create a `.env` file at the root:
   ```env
   # Database
   DATABASE_URL=postgresql://postgres:password@localhost:5432/devmind

   # Authentication
   JWT_SECRET=your_jwt_secret_here
   JWT_ACCESS_SECRET=replace_with_a_long_random_access_secret
   JWT_REFRESH_SECRET=replace_with_a_long_random_refresh_secret
   GITHUB_TOKEN_ENCRYPTION_KEY=replace_with_a_long_random_encryption_key

   # External Provider
   GEMINI_API_KEY=replace_with_your_gemini_api_key

   # GitHub Integration
   GITHUB_CLIENT_ID=from_github_oauth_app
   GITHUB_CLIENT_SECRET=from_github_oauth_app
   GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
   GITHUB_WEBHOOK_SECRET=random_string
   WEBHOOK_URL=http://localhost:3000/webhooks/github

   # Runtime
   PORT=3000
   CLIENT_URL=http://localhost:5173
   REDIS_URL=redis://localhost:6379
   ```

   Create a `.env` file inside `/client`:
   ```env
   VITE_API_URL=http://localhost:3000
   ```

4. Initialize the database schema:
   ```bash
   pnpm --filter server prisma:migrate
   ```

5. Start the development servers:
   ```bash
   # Start the backend Express server
   pnpm --filter server dev

   # Start the frontend Vite application
   pnpm --filter client dev
   ```

## Test Suite

The codebase features a comprehensive suite of unit and integration tests written in Vitest. The test cases cover API routes, security boundaries, and core services.

### Running Tests
To run all backend tests:
```bash
pnpm --filter server test
```

### Covered Test Areas
- **Authentication**: Validates standard signup, login flows, token generation, and Passport OAuth handling.
- **GitHub Webhooks**: Verifies signature checking, timing-safe security logic, and job queuing.
- **Reviews & Prompt Building**: Tests context resolution, dynamic prompt composition, and LLM schemas.
- **Embedding Service**: Mocks Gemini API interactions and asserts PostgreSQL pgvector insertion logic.
- **Semantic Search**: Validates similarity queries and partition logic.
- **Settings**: Asserts connected repo configurations and token storage procedures.
