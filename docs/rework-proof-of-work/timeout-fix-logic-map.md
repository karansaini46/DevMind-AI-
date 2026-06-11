# Timeout Fix Logic Map

## Problem

In automated lead scoring pipelines, a common failure pattern arises when webhooks perform synchronous processing:
1. An external marketing webhook delivers a new lead.
2. The server receives the payload and synchronously calls the OpenAI API to evaluate and score the lead.
3. The server then synchronously calls HubSpot to sync the scored lead data.
4. If OpenAI or HubSpot takes longer than 30 seconds (which happens in ~10% of cases due to model latency or network bottlenecks), the incoming webhook connection times out.
5. The connection is dropped, and the lead payload may be lost permanently.

## Better Architecture

To prevent data loss and support reliable scaling, the synchronous pipeline is replaced with an asynchronous, decoupled queue pattern:

```
Lead Webhook Ingestion
        │
        ▼
Validate Payload Syntax
        │
        ▼
Save Raw Lead in Database ──► [Status: received]
        │
        ▼
Return 200 OK Immediately ──► (Informing source lead was captured)
        │
        ▼
Add "AI Scoring" Job to Queue
        │
        ▼
┌─────────────────────────────────┐
│ AI Worker processes OpenAI Job  │
│  - Fetches lead from database   │
│  - Sends content to OpenAI API  │
│  - Saves score to database      │
└───────────────┬─────────────────┘
                │
                ▼
      [Status: scored]
                │
                ▼
Add "HubSpot Sync" Job to Queue
                │
                ▼
┌───────────────────────────────────┐
│ HubSpot Worker processes Sync Job │
│  - Fetches scored lead data       │
│  - Updates CRM via HubSpot API    │
└───────────────┬───────────────────┘
                │
                ▼
    [Status: hubspot_synced]
```

## Why This Prevents Data Loss

- **Decoupled API Lifecycles**: The lead payload is stored in your database before any third-party APIs (OpenAI or HubSpot) are contacted.
- **Immediate Response**: The server answers the webhook client within milliseconds. External API latencies have zero effect on the initial data ingestion.
- **Resilient Workers**: If OpenAI is down or slow, the lead remains safely stored in the database while the worker queue retries the task.

## Retry Strategy

- **Exponential Backoff**: If the OpenAI API returns a rate-limit error or network timeout, the scoring job is rescheduled with exponential backoff (e.g., retrying after 10s, 30s, 90s, 300s).
- **Independent Queues**: OpenAI scoring and HubSpot syncing are placed in separate queues. A HubSpot API outage will not block the AI scoring of new incoming leads.
- **State Fields Tracking**: The database monitors the status of each job. If a job fails repeatedly and reaches its maximum retry limit, its status is updated to require manual intervention, and an alert is dispatched (e.g., via Slack or email).

## Suggested Status Fields

To track a lead throughout its lifecycle, the database schema implements these status fields:

- `received`: Lead successfully stored in the database; pending scoring.
- `scoring_pending`: Lead scoring job is in the active worker queue.
- `scoring_failed`: OpenAI scoring failed after maximum retries.
- `scored`: Lead score calculated and saved; pending CRM sync.
- `hubspot_sync_pending`: HubSpot update job is in the active worker queue.
- `hubspot_sync_failed`: CRM sync failed after maximum retries.
- `hubspot_synced`: Lead successfully scored and updated in HubSpot.
- `manual_review_required`: Unresolved processing failures needing human review.
