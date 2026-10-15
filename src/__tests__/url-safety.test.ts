import { describe, it, expect } from "vitest";
import { validateSafeUrl } from "../lib/security/url-safety";

describe("URL Safety & SSRF Protections", () => {
  it("allows safe public HTTPS and HTTP URLs", () => {
    expect(validateSafeUrl("https://stanford.edu/scholarships").isSafe).toBe(true);
    expect(validateSafeUrl("https://www.daad.de/en/").isSafe).toBe(true);
    expect(validateSafeUrl("http://example.com/scholarships.html").isSafe).toBe(true);
  });

  it("rejects non-HTTP/HTTPS protocols", () => {
    expect(validateSafeUrl("ftp://example.com/file").isSafe).toBe(false);
    expect(validateSafeUrl("file:///etc/passwd").isSafe).toBe(false);
    expect(validateSafeUrl("javascript:alert(1)").isSafe).toBe(false);
    expect(validateSafeUrl("data:text/html,<h1>hack</h1>").isSafe).toBe(false);
  });

  it("blocks localhost, loopback, and local IP addresses", () => {
    expect(validateSafeUrl("http://localhost:3000").isSafe).toBe(false);
    expect(validateSafeUrl("http://127.0.0.1:8080").isSafe).toBe(false);
    expect(validateSafeUrl("http://[::1]/secret").isSafe).toBe(false);
    expect(validateSafeUrl("http://0.0.0.0:80").isSafe).toBe(false);
  });

  it("blocks RFC 1918 private IPv4 ranges", () => {
    // 10.0.0.0/8
    expect(validateSafeUrl("http://10.0.0.1/admin").isSafe).toBe(false);
    expect(validateSafeUrl("http://10.254.1.2/").isSafe).toBe(false);

    // 172.16.0.0/12
    expect(validateSafeUrl("http://172.16.0.1/").isSafe).toBe(false);
    expect(validateSafeUrl("http://172.31.255.255/").isSafe).toBe(false);

    // 192.168.0.0/16
    expect(validateSafeUrl("http://192.168.1.1/router").isSafe).toBe(false);
  });

  it("blocks link-local and cloud metadata IP (169.254.169.254)", () => {
    expect(validateSafeUrl("http://169.254.169.254/latest/meta-data/").isSafe).toBe(false);
    expect(validateSafeUrl("http://metadata.google.internal/computeMetadata/v1/").isSafe).toBe(false);
  });

  it("blocks local or internal domain names", () => {
    expect(validateSafeUrl("http://database.local/api").isSafe).toBe(false);
    expect(validateSafeUrl("http://service.internal/").isSafe).toBe(false);
    expect(validateSafeUrl("http://myserver.localhost/").isSafe).toBe(false);
  });

  it("rejects empty or malformed strings", () => {
    expect(validateSafeUrl("").isSafe).toBe(false);
    expect(validateSafeUrl("not-a-valid-url").isSafe).toBe(false);
  });
});
