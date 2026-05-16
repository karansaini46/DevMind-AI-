import type { AuthTokenPayload } from "./auth";

declare global {
  namespace Express {
    interface User {
      id: AuthTokenPayload["id"];
      email: AuthTokenPayload["email"];
      githubId: AuthTokenPayload["githubId"];
    }
  }
}

export {};
