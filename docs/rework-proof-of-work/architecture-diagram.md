# Architecture Diagram

This diagram visualizes the asynchronous processing architecture of DevMind AI, illustrating how code changes are validated, queued, analyzed by LLM workers, indexed into vector tables, and pushed back to the client.

```mermaid
flowchart TD
    A[User Code or GitHub Webhook] --> B[API / Webhook Endpoint]
    B --> C[Validate Signature & Token]
    C --> D[Save Snippet in PostgreSQL]
    D --> E[Queue Review Job in BullMQ]
    E --> F[Background Worker Threads]
    F --> G[LangChain Structured AI Engine]
    G --> H[Gemini 2.5 Flash Model]
    H --> I[Save Review & Token Usage]
    F --> J[Gemini Embedding Generator]
    J --> K[Insert pgvector Embeddings]
    I --> L[Publish Event Hub Trigger]
    K --> L
    L --> M[Server-Sent Events Stream]
    M --> N[Real-Time User Dashboard]
    
    F --> O{Job Failed?}
    O -->|Yes| P[Retry Job with Backoff]
    O -->|Max Retries Reached| Q[Flag Failed & Alert Developer]
```
