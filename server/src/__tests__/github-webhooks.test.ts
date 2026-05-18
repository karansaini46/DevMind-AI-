import { createHmac } from "crypto";
import request from "supertest";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { app } from "../app";
import { hasReviewJob, enqueueReviewJob } from "../jobs/reviewQueue";
import { prisma } from "../lib/prisma";
import { getRepositoryFileContent } from "../services/github-repositories";
import { env } from "../utils/env";
import { encryptGitHubAccessToken } from "../utils/github-token-crypto";

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    codeSnippet: {
      create: vi.fn(),
    },
  },
}));

vi.mock("../jobs/reviewQueue", () => ({
  enqueueReviewJob: vi.fn(),
  hasReviewJob: vi.fn(),
}));

vi.mock("../services/github-repositories", () => ({
  createRepositoryWebhook: vi.fn(),
  deleteRepositoryWebhook: vi.fn(),
  getRepositoryFileContent: vi.fn(),
}));

const userFindFirst = prisma.user.findFirst as unknown as Mock;
const codeSnippetCreate = prisma.codeSnippet.create as unknown as Mock;
const enqueueReviewJobMock = enqueueReviewJob as unknown as Mock;
const hasReviewJobMock = hasReviewJob as unknown as Mock;
const getRepositoryFileContentMock =
  getRepositoryFileContent as unknown as Mock;

describe("GitHub webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userFindFirst.mockResolvedValue({
      id: "user-1",
      githubAccessToken: encryptGitHubAccessToken("token"),
    });
    codeSnippetCreate.mockResolvedValue({
      id: "snippet-1",
    });
    hasReviewJobMock.mockResolvedValue(false);
    getRepositoryFileContentMock.mockResolvedValue("const value = 1;");
  });

  it("rejects invalid webhook signatures", async () => {
    const response = await request(app)
      .post("/webhooks/github")
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", "sha256=invalid")
      .send(JSON.stringify(buildPayload()));

    expect(response.status).toBe(401);
    expect(userFindFirst).not.toHaveBeenCalled();
  });

  it("queues each supported changed file once", async () => {
    const payload = buildPayload({
      commits: [
        {
          added: ["src/app.ts", "README.md"],
          modified: ["src/app.ts", "src/view.tsx", "logo.png"],
        },
      ],
    });
    const body = JSON.stringify(payload);
    const response = await request(app)
      .post("/webhooks/github")
      .set("Content-Type", "application/json")
      .set("X-GitHub-Event", "push")
      .set("X-GitHub-Delivery", "delivery-1")
      .set("X-Hub-Signature-256", sign(body))
      .send(body);

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ queued: 2 });
    expect(getRepositoryFileContentMock).toHaveBeenCalledTimes(2);
    expect(codeSnippetCreate).toHaveBeenCalledTimes(2);
    expect(enqueueReviewJobMock).toHaveBeenCalledTimes(2);
  });

  it("ignores non-push events after signature verification", async () => {
    const body = JSON.stringify(buildPayload());
    const response = await request(app)
      .post("/webhooks/github")
      .set("Content-Type", "application/json")
      .set("X-GitHub-Event", "ping")
      .set("X-Hub-Signature-256", sign(body))
      .send(body);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ queued: 0 });
    expect(userFindFirst).not.toHaveBeenCalled();
  });
});

function buildPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    after: "commit-sha",
    repository: {
      full_name: "person/project",
    },
    commits: [
      {
        added: ["src/app.ts"],
        modified: [],
      },
    ],
    ...overrides,
  };
}

function sign(body: string) {
  return `sha256=${createHmac("sha256", env.GITHUB_WEBHOOK_SECRET)
    .update(body)
    .digest("hex")}`;
}
