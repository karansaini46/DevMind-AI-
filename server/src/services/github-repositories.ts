import { AppError } from "../utils/app-error";

const githubApiBaseUrl = "https://api.github.com";

interface GitHubWebhook {
  id: number;
}

export async function createRepositoryWebhook(input: {
  accessToken: string;
  repoFullName: string;
  webhookUrl: string;
  secret: string;
}) {
  return githubRequest<GitHubWebhook>({
    accessToken: input.accessToken,
    method: "POST",
    path: `/repos/${input.repoFullName}/hooks`,
    body: {
      name: "web",
      active: true,
      events: ["push"],
      config: {
        url: input.webhookUrl,
        content_type: "json",
        secret: input.secret,
        insecure_ssl: "0",
      },
    },
  });
}

export async function deleteRepositoryWebhook(input: {
  accessToken: string;
  repoFullName: string;
  webhookId: string;
}) {
  await githubRequest<void>({
    accessToken: input.accessToken,
    method: "DELETE",
    path: `/repos/${input.repoFullName}/hooks/${input.webhookId}`,
  });
}

export async function getRepositoryFileContent(input: {
  accessToken: string;
  repoFullName: string;
  ref: string;
  path: string;
  maxBytes: number;
}) {
  const response = await fetch(
    `${githubApiBaseUrl}/repos/${input.repoFullName}/contents/${encodePath(
      input.path,
    )}?ref=${encodeURIComponent(input.ref)}`,
    {
      headers: buildHeaders(input.accessToken, "application/vnd.github.raw+json"),
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw mapGitHubError(response.status);
  }

  const contentLength = Number.parseInt(response.headers.get("content-length") ?? "", 10);

  if (Number.isFinite(contentLength) && contentLength > input.maxBytes) {
    return null;
  }

  const content = await response.text();

  return Buffer.byteLength(content, "utf8") <= input.maxBytes ? content : null;
}

async function githubRequest<T>(input: {
  accessToken: string;
  method: "POST" | "DELETE";
  path: string;
  body?: Record<string, unknown>;
}) {
  const response = await fetch(`${githubApiBaseUrl}${input.path}`, {
    method: input.method,
    headers: buildHeaders(input.accessToken, "application/vnd.github+json"),
    body: input.body ? JSON.stringify(input.body) : undefined,
  });

  if (!response.ok) {
    throw mapGitHubError(response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function buildHeaders(accessToken: string, accept: string) {
  return {
    Accept: accept,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function encodePath(path: string) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function mapGitHubError(status: number) {
  if (status === 401 || status === 403) {
    return new AppError("Reconnect GitHub to grant repository access", 403);
  }

  if (status === 404) {
    return new AppError("Repository not found or not accessible", 404);
  }

  return new AppError("GitHub request failed", 502);
}
