# Error Handling Architecture

## Goal

In high-throughput AI automation systems, integrations are highly dependent on external network requests, rate limits, and language model provider latencies. The primary goal of DevMind AI's architecture is to isolate failures, prevent data loss, and maintain platform availability. External system downtimes or model rate-exhaustion must never corrupt or lose incoming Git push event payloads.

## Current Implementation

The codebase features several explicit layers of error isolation and protection:
- **Timing-Safe HMAC Webhook Validation**: Protects backend endpoints against timing attacks and spoofed requests using constant-time buffer evaluations (`timingSafeEqual` in `crypto`).
- **Token Cryptography Isolation**: Keeps GitHub connection tokens encrypted in database records via AES-256-GCM. Unhandled runtime errors do not leak sensitive credentials in plaintext logs.
- **Robust Client Rate Limit Handling**: Code review services parse error messages and automatically categorise failures (`isRateLimitError` and `isServiceUnavailableError`) to throw descriptive, controlled exceptions rather than generic server faults.
- **Background Worker Error Boundaries**: The BullMQ worker captures job execution failures through structured Event Listeners (`worker.on("failed")` and `worker.on("error")`), writing clean diagnostic logs rather than causing Node runtime crashes.

## Queue-Based Reliability Pattern

DevMind AI decouples webhook ingestion from LLM request loops to establish reliable task execution.

```
Incoming Webhook
      │
      ▼
Verify HMAC Signature
      │
      ▼
Save Raw Snippet to DB ──────────► [State: Received / Pending]
      │
      ▼
Enqueue Background Job (BullMQ)
      │
      ▼
Return 202 Accepted to Git ──────► (Webhook call completes immediately)
      │
      ▼
[Async Worker Pick-up]
      │
      ├──────────────────────────┐
      ▼                          ▼
Invoke Gemini API         Index Vector Embeddings
      │                          │
      ▼                          ▼
Save Structured Review    Save 768-d pgvector Chunks
      │                          │
      └───────────┬──────────────┘
                  │
                  ▼
Update DB & Publish SSE Stream ──► [State: Completed]
```

By persisting the request data first and completing the HTTP call immediately, transient downstream failures cannot wipe out the original user request.

## Failure Scenarios Matrix

The table below explains how the platform handles various system failures:

| Failure Type | Risk | Handling Strategy |
| :--- | :--- | :--- |
| **AI API Timeout** | Job gets stuck or fails due to network latency from Gemini API. | BullMQ tracks job attempts. The worker handles timeouts gracefully, writes the logs, and frees up the queue thread. |
| **AI API Rate Limit** | Provider rejects requests due to concurrent quota limit (`429 RESOURCE_EXHAUSTED`). | Code parses status code `429` and throws `AppError(429)`. The system retries after backoff. |
| **GitHub Webhook Duplicate** | Duplicate push delivery triggers redundant expensive AI analysis. | Generates a deterministic job ID (`deliveryId-hashPath`). BullMQ's duplicate job key checks drop redundant tasks before queueing. |
| **Database Write Failure** | Snip metadata cannot be saved; leads to unindexed code files. | Database actions run inside transaction scopes. Unsaved jobs are flagged as failed in the queue for manual developer retry. |
| **Worker Process Crash** | Unexpected memory leak or server crash interrupts an active review job. | Redis tracks worker heartbeats. If a worker goes offline, the job lock expires, and the job is returned to the queue. |
| **External Network Failure** | Webhook fails to retrieve code contents from the GitHub API. | The queue logs the HTTP resolution exception. The job state is updated, allowing users to trigger a manual review. |

## Notes

> [!NOTE]
> The current codebase is structured to support this pattern. Full retry policies and dead-letter monitoring are listed as production hardening roadmap items.
