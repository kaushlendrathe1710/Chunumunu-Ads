import type { Request } from "express";

/**
 * Resolve client IP from request headers/proxy
 * Handles various proxy configurations and CDN setups
 */
export function getClientIp(req: Request): string | undefined {
  // Prefer direct client IP headers from common proxies/CDNs
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const directHeaderOrder = [
    "cf-connecting-ip",        // Cloudflare
    "x-real-ip",              // Nginx
    "true-client-ip",         // Akamai, Cloudflare
    "x-client-ip",            // Apache, others
    "fastly-client-ip",       // Fastly
    "fly-client-ip",          // Fly.io
  ];

  for (const h of directHeaderOrder) {
    const v = headers[h];
    if (typeof v === "string" && v.trim()) {
      return normalizeIp(v.trim());
    }
  }

  // Next, use X-Forwarded-For (left-most = original client)
  const xffRaw = headers["x-forwarded-for"];
  const xff = Array.isArray(xffRaw) ? xffRaw[0] : xffRaw;
  if (typeof xff === "string" && xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return normalizeIp(first);
  }

  // RFC 7239 Forwarded: for=1.2.3.4; proto=https; by=...
  const fwd = headers["forwarded"];
  const fwdStr = Array.isArray(fwd) ? fwd[0] : fwd;
  if (typeof fwdStr === "string") {
    const m = fwdStr.match(/for=\"?\[?([a-fA-F0-9:.]+)\]?\"?/);
    if (m?.[1]) return normalizeIp(m[1]);
  }

  // Fallback to socket/connection remote address
  const ip = (req.socket as any)?.remoteAddress || req.ip;
  return normalizeIp(ip);
}

/**
 * Normalize IP address format
 */
function normalizeIp(ip?: string): string | undefined {
  if (!ip) return ip;
  
  // Normalize IPv6 localhost to IPv4
  if (ip === "::1") return "127.0.0.1";
  
  // Convert IPv4-mapped IPv6 addresses
  if (ip.startsWith("::ffff:")) return ip.substring(7);
  
  return ip;
}

/**
 * Parse User Agent string to extract OS and device type information
 * Similar to the existing parseUA function but exported for reuse
 */
export function parseUserAgent(ua: string): { os: string; deviceType: string } {
  const uaLower = ua.toLowerCase();
  
  let os = "unknown";
  if (uaLower.includes("windows")) os = "windows";
  else if (uaLower.includes("mac os") || uaLower.includes("macintosh"))
    os = "macos";
  else if (uaLower.includes("android")) os = "android";
  else if (
    uaLower.includes("iphone") ||
    uaLower.includes("ipad") ||
    uaLower.includes("ios")
  )
    os = "ios";
  else if (uaLower.includes("linux")) os = "linux";

  let deviceType = "desktop";
  if (
    uaLower.includes("mobi") ||
    uaLower.includes("iphone") ||
    (uaLower.includes("android") && uaLower.includes("mobile"))
  ) {
    deviceType = "mobile";
  } else if (uaLower.includes("ipad") || uaLower.includes("tablet")) {
    deviceType = "tablet";
  }
  
  return { os, deviceType };
}