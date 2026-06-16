import bcrypt from "bcrypt";
import request from "supertest";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { app } from "../app";
import { prisma } from "../lib/prisma";
import { signAccessToken, signRefreshToken } from "../utils/tokens";

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

function buildUser(overrides: Partial<ReturnType<typeof baseUser>> = {}) {
  return {
    ...baseUser(),
    ...overrides,
  };
}

function baseUser() {
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
  };
}

describe("auth routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a user and returns an access token plus refresh cookie", async () => {
    userFindUnique.mockResolvedValueOnce(null);
    userCreate.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) =>
      buildUser({
        email: data.email as string,
        name: data.name as string,
        passwordHash: data.passwordHash as string,
      }),
    );

    const response = await request(app).post("/auth/register").send({
      name: "Person",
      email: "person@example.com",
      password: "Password123",
    });

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user.email).toBe("person@example.com");
    expect(response.headers["set-cookie"]?.[0]).toContain("refreshToken=");
  });

  it("rejects duplicate registrations", async () => {
    userFindUnique.mockResolvedValueOnce(buildUser());

    const response = await request(app).post("/auth/register").send({
      name: "Person",
      email: "person@example.com",
      password: "Password123",
    });

    expect(response.status).toBe(409);
  });

  it("logs in a user with valid credentials", async () => {
    const passwordHash = await bcrypt.hash("Password123", 4);
    userFindUnique.mockResolvedValueOnce(buildUser({ passwordHash }));

    const response = await request(app).post("/auth/login").send({
      email: "person@example.com",
      password: "Password123",
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.headers["set-cookie"]?.[0]).toContain("refreshToken=");
  });

  it("refreshes an access token from the refresh cookie", async () => {
    const user = buildUser();
    userFindUnique.mockResolvedValueOnce(user);
    const refreshToken = signRefreshToken(user);

    const response = await request(app)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${refreshToken}`]);

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
  });

  it("clears the refresh cookie on logout", async () => {
    const response = await request(app).post("/auth/logout");

    expect(response.status).toBe(204);
    expect(response.headers["set-cookie"]?.[0]).toContain("refreshToken=;");
  });

  it("returns the current user for a valid bearer token", async () => {
    const user = buildUser();
    userFindUnique.mockResolvedValueOnce(user);
    const accessToken = signAccessToken(user);

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(user.id);
  });

  it("rejects protected requests without a bearer token", async () => {
    const response = await request(app).get("/auth/me");

    expect(response.status).toBe(401);
  });
});
