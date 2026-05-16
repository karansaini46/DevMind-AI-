import { env } from "../utils/env";

export function getRedisConnectionOptions() {
  const redisUrl = new URL(env.REDIS_URL);
  const database = redisUrl.pathname.replace("/", "");

  return {
    host: redisUrl.hostname,
    port: redisUrl.port ? Number.parseInt(redisUrl.port, 10) : 6379,
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: database ? Number.parseInt(database, 10) : 0,
    tls: redisUrl.protocol === "rediss:" ? {} : undefined,
  };
}
