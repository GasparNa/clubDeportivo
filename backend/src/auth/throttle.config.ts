export function configuracionThrottle(): { ttl: number; limit: number } {
  const ttl = Number(process.env.THROTTLE_TTL ?? 60000);
  const limit = Number(process.env.THROTTLE_LIMIT ?? 10);

  return {
    ttl: Number.isFinite(ttl) && ttl > 0 ? ttl : 60000,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
  };
}
