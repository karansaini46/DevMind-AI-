# DevMind AI - AI Automation Case Study

## Overview

DevMind AI is an automated, real-time code-review assistant and semantic codebase search platform. Designed to assist software development teams, it listens to repository changes, processes modified code files asynchronously through background workers, and uses Large Language Models (LLMs) to generate structured reviews, bug findings, security audits, and refactoring suggestions. It also indexes code snippets into a vector database for semantic search, making the codebase easier to understand and query.

## Problem

In typical software engineering teams, manual code reviews and repository exploration introduce significant workflow bottlenecks:
- **Time-Consuming Reviews**: Senior developers spend hours identifying common bugs, syntax flaws, type-safety errors, and security issues.
- **Slow Feedback Loops**: Developers must wait for a peer reviewer to open their pull requests, slowing down deployment velocity.
- **Repeated Inefficiencies**: The same design patterns, edge cases, and code quality issues are repeatedly flagged manually rather than automatically prevented.
- **Complex Onboarding**: New developers face steep learning curves trying to understand how massive repositories fit together without intuitive search tools.

## Solution

DevMind AI automates and accelerates these developer workflows:
- **Automated Webhooks**: Automatically hooks into Git repository events to trigger instant, background reviews as soon as code is pushed.
- **Queue-Backed AI Pipelines**: Offloads LLM processing to background queues to isolate slow API responses and guarantee webhook requests finish instantly.
- **Structured Feedback**: Converts raw code into standardized JSON reviews, classifying findings by severity (Critical, High, Medium, Low, Nitpick) and providing side-by-side refactoring guides.
- **Semantic Code Search**: Generates embeddings for all incoming code, allowing developers to query code logic using natural language rather than exact string matches.

## Tech Stack

The system is built on a modern, decoupled JavaScript/TypeScript stack:
- **Frontend**: React (v19.1.0) with Vite, TypeScript, Zustand (State Management), and CodeMirror (Interactive Editor).
- **Backend**: Node.js and Express (v5.1.0).
- **Database**: PostgreSQL with the `pgvector` extension for storing code metadata and vector embeddings.
- **ORM**: Prisma (v6.7.0).
- **Task Queue**: BullMQ backed by a Redis cache.
- **AI Orchestration**: LangChain (`@langchain/core`, `@langchain/google`, `@langchain/google-genai`) powered by the Google Gemini 2.5 Flash model and `gemini-embedding-001`.
- **Security**: AES-256-GCM (Token Encryption) and SHA-256 HMAC (Timing-Safe Webhook Signatures).

## Workflow

The automated data lifecycle operates in the following sequence:

1. **Git Push Event**: GitHub triggers a `push` webhook event and sends a payload containing the repository details and commit hashes to the Express `/webhooks/github` endpoint.
2. **Timing-Safe Verification**: The backend validates the payload signature using timing-safe HMAC-SHA256 comparison.
3. **Save and Queue**: The server decrypts the user's GitHub access token, retrieves the changed files, saves the raw code snippet in PostgreSQL, and enqueues a background review job in BullMQ/Redis with a unique, deduplicated job ID. The webhook immediately returns a `202 Accepted` status to GitHub.
4. **Asynchronous Review Processing**: A background BullMQ worker picks up the job, resolves context tags, and invokes the LangChain LLM pipeline.
5. **Structured Analysis & Storage**: The LLM analyzes the code and returns structured JSON conforming to a strict Zod schema. The worker saves the scores and feedback markdown in the database, and indexes the code using Gemini's embedding model to save chunks in the `Embedding` table.
6. **Real-Time Delivery**: The worker emits a completion event to a local Event Hub, which pushes the completed review to the client via an active Server-Sent Events (SSE) connection, updating the user's dashboard in real-time.

## Measurable Impact

- **Estimated Impact**: Significantly reduces manual reviewer effort on syntax, type-safety, and common edge cases. Provides instant feedback within seconds of pushing code, creating a foundation for faster developer onboarding and automated code quality auditing.

## Proof Screenshots

### Dashboard Overview
Shows the latest code reviews, project metrics, and repository connection status.
![Dashboard screenshot](./screenshots/dashboard.png)

### AI Code Review Output
Displays detailed scores, categorized issues (Bugs, Security, Performance), and code diffs.
![AI output screenshot](./screenshots/ai-output.png)

### GitHub Webhook Integration Code
Implementation of the timing-safe webhook verification and async queue scheduling.
![Code/webhook screenshot](./screenshots/webhook-code.png)

### BullMQ Background Workers and Error Handling
Shows background queues, worker listeners, and error handling logs for transient failure recovery.
![Queue/error handling screenshot](./screenshots/queue-error-handling.png)
