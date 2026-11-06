/**
 * Addresses of proxies whose `X-Forwarded-For` entries we trust (#294).
 *
 * On staging the API sits behind Coolify's Traefik in a Docker network
 * (private range). Traefik appends the real client to `X-Forwarded-For`, so
 * the client is the rightmost address that is NOT one of these. Anything a
 * client writes into the header itself stays to the left and is ignored.
 * Loopback is here for local runs and the tests.
 *
 * Used both by Express (`trust proxy`, so `req.ip` is the client) and by
 * BetterAuth (`advanced.ipAddress.trustedProxies`), so both limits count the
 * same address.
 */
export const TRUSTED_PROXIES = [
  "127.0.0.0/8",
  "::1/128",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "fc00::/7",
] as const
