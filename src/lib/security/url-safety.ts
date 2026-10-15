/**
 * URL Safety & SSRF Protection
 * Ensures only safe, public HTTP/HTTPS URLs are fetched or queried.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "instance-data",
]);

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  const [a, b] = parts;

  // 127.0.0.0/8 - Loopback
  if (a === 127) return true;

  // 10.0.0.0/8 - Private Class A
  if (a === 10) return true;

  // 172.16.0.0/12 - Private Class B (172.16 - 172.31)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 - Private Class C
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 - Link Local & Cloud Metadata (AWS, GCP, Azure, etc.)
  if (a === 169 && b === 254) return true;

  // 0.0.0.0/8 - Current network
  if (a === 0) return true;

  // 224.0.0.0/4 - Multicast
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 - Reserved
  if (a >= 240) return true;

  return false;
}

export interface UrlSafetyCheck {
  isSafe: boolean;
  reason?: string;
  normalizedUrl?: string;
}

export function validateSafeUrl(rawUrl: string): UrlSafetyCheck {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isSafe: false, reason: "URL must be a non-empty string" };
  }

  const trimmed = rawUrl.trim();
  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return { isSafe: false, reason: "Malformed URL format" };
  }

  // Only http and https protocols are allowed
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      isSafe: false,
      reason: `Disallowed protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Strip brackets from IPv6 hostnames
  const unbracketed = hostname.replace(/^\[|\]$/g, "");

  if (BLOCKED_HOSTNAMES.has(unbracketed)) {
    return { isSafe: false, reason: `Blocked hostname: ${hostname}` };
  }

  // Check private or special IPv4
  if (isPrivateIPv4(unbracketed)) {
    return { isSafe: false, reason: `Private or loopback IP address blocked: ${hostname}` };
  }

  // Block obvious internal/local TLDs
  if (
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".test")
  ) {
    return { isSafe: false, reason: `Local or private TLD blocked: ${hostname}` };
  }

  return {
    isSafe: true,
    normalizedUrl: parsed.toString(),
  };
}
