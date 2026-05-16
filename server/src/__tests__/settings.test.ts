import request from "supertest";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { app } from "../app";
import { prisma } from "../lib/prisma";
import {
  createRepositoryWebhook,
  deleteRepositoryWebhook,
} from "../services/github-repositories";
import { encryptGitHubAccessToken } from "../utils/github-token-crypto";
import { signAccessToken } from "../utils/tokens";

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../services/github-repositories", () => ({
  createRepositoryWebhook: vi.fn(),
  deleteRepositoryWebhook: vi.fn(),
  getRepositoryFileContent: vi.fn(),
}));

const userFindUnique = prisma.user.findUnique as unknown as Mock;
const userUpdate = prisma.user.update as unknown as Mock;
const createRepositoryWebhookMock =
  createRepositoryWebhook as unknown as Mock;
const deleteRepositoryWebhookMock =
  deleteRepositoryWebhook as unknown as Mock;

describe("settings routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("connects a repository and stores webhook details", async () => {
    userFindUnique.mockResolvedValue(buildUser());
    createRepositoryWebhookMock.mockResolvedValue({ id: 42 });
    userUpdate.mockResolvedValue({
      connectedRepo: "person/project",
    });

    const response = await request(app)
      .post("/settings/connect-repo")
      .set("Authorization", `Bearer ${buildToken()}`)
      .send({
        repoFullName: "person/project",
      });

    expect(response.status).toBe(201);
    expect(createRepositoryWebhookMock).toHaveBeenCalled();
    expect(userUpdate).toHaveBeenCalledWith({
      where: {
        id: "user-1",
      },
      data: {
        connectedRepo: "person/project",
        webhookId: "42",
      },
      select: {
        connectedRepo: true,
      },
    });
  });

  it("disconnects the current repository", async () => {
    userFindUnique.mockResolvedValue(
      buildUser({
        connectedRepo: "person/project",
        webhookId: "42",
      }),
    );
    deleteRepositoryWebhookMock.mockResolvedValue(undefined);
    userUpdate.mockResolvedValue({});

    const response = await request(app)
      .delete("/settings/disconnect-repo")
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(204);
    expect(deleteRepositoryWebhookMock).toHaveBeenCalled();
    expect(userUpdate).toHaveBeenCalledWith({
      where: {
        id: "user-1",
      },
      data: {
        connectedRepo: null,
        webhookId: null,
      },
    });
  });
});

function buildToken() {
  return signAccessToken({
    id: "user-1",
    email: "person@example.com",
    githubId: "github-1",
  });
}

function buildUser(overrides = {}) {
  return {
    id: "user-1",
    email: "person@example.com",
    passwordHash: "hash",
    name: "Person",
    githubId: "github-1",
    githubAccessToken: encryptGitHubAccessToken("token"),
    githubUsername: "person",
    githubAvatarUrl: null,
    connectedRepo: null,
    webhookId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
