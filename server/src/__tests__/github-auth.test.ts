import type { Profile } from "passport-github2";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { prisma } from "../lib/prisma";
import { resolveGitHubUser } from "../services/github-auth";
import { decryptGitHubAccessToken } from "../utils/github-token-crypto";

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const userCreate = prisma.user.create as unknown as Mock;
const userFindUnique = prisma.user.findUnique as unknown as Mock;
const userUpdate = prisma.user.update as unknown as Mock;

function buildProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    provider: "github",
    id: "github-1",
    displayName: "Octo Person",
    username: "octoperson",
    profileUrl: "https://github.com/octoperson",
    emails: [{ value: "octo@example.com" }],
    photos: [{ value: "https://avatars.example.com/octo.png" }],
    ...overrides,
  };
}

function buildUser(overrides = {}) {
  return {
    id: "user-1",
    email: "person@example.com",
    passwordHash: "hash",
    name: "Person",
    githubId: null,
    githubAccessToken: null,
    githubUsername: null,
    githubAvatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("GitHub auth resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a GitHub-only user with an encrypted provider token", async () => {
    userFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    userCreate.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) =>
      buildUser({
        ...data,
      }),
    );

    const user = await resolveGitHubUser({
      accessToken: "provider-token",
      profile: buildProfile(),
      state: { mode: "login" },
    });

    expect(user.githubAccessToken).not.toBe("provider-token");
    expect(decryptGitHubAccessToken(user.githubAccessToken!)).toBe("provider-token");
    expect(user.passwordHash).toBeNull();
  });

  it("links GitHub to the authenticated user during connect flow", async () => {
    const user = buildUser();
    userFindUnique
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(null);
    userUpdate.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) =>
      buildUser({
        ...user,
        ...data,
      }),
    );

    const linkedUser = await resolveGitHubUser({
      accessToken: "provider-token",
      profile: buildProfile(),
      state: {
        mode: "connect",
        userId: user.id,
      },
    });

    expect(linkedUser.githubId).toBe("github-1");
    expect(linkedUser.githubUsername).toBe("octoperson");
  });

  it("does not silently merge a GitHub login into an email account", async () => {
    userFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildUser());

    await expect(
      resolveGitHubUser({
        accessToken: "provider-token",
        profile: buildProfile(),
        state: { mode: "login" },
      }),
    ).rejects.toThrow("Sign in and connect GitHub from your dashboard");
  });
});
