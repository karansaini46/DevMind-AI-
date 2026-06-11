---
marp: true
theme: gaia
_class: lead
paginate: true
backgroundColor: #0c0f0e
color: #eef3ed
style: |
  section {
    font-family: 'Inter', sans-serif;
    padding: 40px;
  }
  h1 {
    color: #b7ff4a;
    font-size: 2.2em;
  }
  h2 {
    color: #73e7ff;
    font-size: 1.4em;
  }
  h3 {
    color: #eef3ed;
    font-size: 1.1em;
  }
  footer {
    font-size: 0.5em;
    color: #7c877e;
  }
  code {
    background-color: #151a17;
    color: #b7ff4a;
  }
  strong {
    color: #b7ff4a;
  }
  ul {
    font-size: 0.85em;
  }
---

# DevMind AI
## AI Automation Specialist Portfolio & Proof-of-Work
### Case Studies, Architecture, & Resilient Integration Design
#### Prepared for: REWORK Digital

---

# Agenda
1. **Core Problem**: Manual Review Bottlenecks
2. **Automated Solution**: Decoupled AI Pipeline
3. **Queue-Based Processing**: BullMQ & Redis
4. **Semantic Code Search**: PostgreSQL pgvector
5. **Secure Authentication & Webhooks**: HMAC & AES-256-GCM
6. **Error Resilience Design**: Mitigation Strategies
7. **Timeout Mitigation Case Study**: HubSpot Integration Map

---

# 1. Core Problem
## Manual Developer Workflow Bottlenecks
- **Time Inefficiencies**: Senior developers spend hours auditing code for syntax issues, basic edge cases, and type safety.
- **Slow Feedback Loops**: Development blocks while waiting for manual PR review cycles.
- **Repetitive Coding Flaws**: The same bugs and architectural flaws are continuously checked manually rather than automated.
- **Onboarding Friction**: New team members lack easy semantic search interfaces to query code purposes and structures.

---

# 2. Automated Solution
## Asynchronous, Real-Time AI Workspace
- **Git Hook Ingestion**: Automatically listens to repository push events and fires instant background audits.
- **Decoupled Job Queueing**: Moves slow API requests to isolated worker queues to protect webhook response speeds.
- **Structured JSON Audits**: Parses model reviews via Zod schemas into precise security, bugs, and performance items.
- **Vector Code Search**: Generates embedding indexes on code updates, enabling natural-language code query matches.

---

# 3. Queue-Based Processing
## Asynchronous Scaling with BullMQ & Redis
- **Background Isolations**: Incoming payloads are immediately stored and pushed onto a Redis queue. Express returns a `202 Accepted` status.
- **Job Deduplication**: Uses deterministic job IDs (`deliveryId-hashPath`) to prevent duplicate analysis of the same file in concurrent queues.
- **Thread Security**: Workers run in dedicated process environments. Failure in one task has zero impact on the rest of the queue.

---

# 4. Semantic Code Search
## pgvector Indexing & Retrieval
- **Sliding Window Chunking**: Splits files into overlapping chunks (500-char size, 50-char overlap) to retain contextual links.
- **Gemini Embeddings**: Processes code chunks through the `gemini-embedding-001` model to yield 768-d vectors.
- **Cosine Similarity SQL**: Executes similarity searches directly in PostgreSQL:
  ```sql
  e.embedding <=> ${vectorValue}::vector AS distance
  ```
- Uses window functions to deduplicate multiple matches within the same code file.

---

# 5. Secure Authentication & Webhooks
## Production-Grade Cryptography
- **Timing-Safe Webhook Signatures**: Verifies incoming GitHub HMAC-SHA256 signatures in constant time:
  ```typescript
  timingSafeEqual(expectedBuffer, actualBuffer)
  ```
  Prevents side-channel timing attacks.
- **OAuth Token Encryption**: Encrypts stored GitHub client access keys using authenticated `AES-256-GCM` encryption. Plaintext tokens never persist in standard database records.

---

# 6. Error Resilience Design
## Mitigation Matrix

| Failure Type | Risk | Mitigation Strategy |
| :--- | :--- | :--- |
| **AI API Timeout** | Stuck queue thread. | Worker handles timeouts, records failures, and frees the worker thread. |
| **AI API Rate Limit** | `429` Rejected requests. | Identifies rate limit error triggers and reschedules jobs with exponential backoff. |
| **Worker Crash** | Interrupted reviews. | Redis locks expire. Lost jobs are re-enqueued by worker managers. |
| **DB Outage** | Unindexed snippets. | Wrapping data actions in transactions, writing fails to queue logs. |

---

# 7. Timeout Mitigation Case Study
## The OpenAI/HubSpot Webhook Timeout Problem
- **Problem Scenario**: Lead Webhook $\rightarrow$ OpenAI Lead Scoring $\rightarrow$ HubSpot CRM Sync.
- **The Failure**: Webhook caller waits synchronously. OpenAI takes >30s, causing connection timeout and lead data loss.
- **The Fix**: Decouple the execution chain asynchronously.
  - Webhook validates the payload structure.
  - Webhook saves raw lead data in DB immediately (Status: `received`).
  - Webhook returns `200 OK` instantly to caller.
  - Job scheduled for AI scoring worker.

---

# 8. Asynchronous Lead Processing Map

```
[Marketing Webhook Trigger] 
      │
      ▼
[Validate & Persist to DB] ──► Return 200 OK Immediately
      │
      ▼ (Status: received)
[Enqueue AI Scoring Job]
      │
      ▼ (Status: scoring_pending)
[AI Worker Runs OpenAI API] ──► Saves Score (Status: scored)
      │
      ▼
[Enqueue HubSpot Sync Job] ──► HubSpot Worker updates CRM 
                                (Status: hubspot_synced)
```

---

# 9. Lead Sync Status States
The database tracks leads through a reliable state machine:
- `received`: Captured in database; waiting for worker queue.
- `scoring_pending`: Processing scoring requests on OpenAI.
- `scoring_failed`: Retries exhausted; flagged for alert.
- `scored`: OpenAI score saved; queued for HubSpot update.
- `hubspot_sync_pending`: Active in HubSpot worker queue.
- `hubspot_synced`: CRM updated successfully.
- `manual_review_required`: Processing failure requiring developer review.

---

# 10. Verification & Quality Assurance
## Comprehensive Automated Test Suite
- **40 Automated Tests Passed**: The system features full unit and integration tests using Vitest and Supertest.
- **Authentication**: Checks signup, login, JWT issuance, and OAuth handlers.
- **Webhooks**: Asserts signature checks and timing-safe math.
- **Search & Embeddings**: Mocks Gemini models and tests `pgvector` similarity query performance.
- **Settings & Settings Integration**: Mocks database models to verify connected repository profiles.

---

# Conclusion
## Production Ready Automation Design
- Decoupling processing tasks via **Queues** ensures system availability.
- Persisting request state **First** guarantees zero lead/webhook data loss.
- Using **Structured LLM Outputs** combined with Zod validation enables programmatic automated parsing.
- Built-in **timing-safe** validations and **AES-256-GCM** keys keep developer credentials secure.
