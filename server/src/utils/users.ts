import type { User } from "@prisma/client";

export function toAuthUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    githubId: user.githubId,
    githubUsername: user.githubUsername,
    githubAvatarUrl: user.githubAvatarUrl,
  };
}
