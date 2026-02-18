import { NextRequest, NextResponse } from "next/server";

const BLOCKED_BOTS = [
  "bot", "crawler", "spider", "scraper", "curl", "wget", "python-requests",
  "httpclient", "java/", "go-http-client", "php/", "ruby", "perl",
  "semrush", "ahrefs", "mj12bot", "dotbot", "petalbot", "bytespider",
  "gptbot", "ccbot", "anthropic", "claudebot",
];

// Simple in-memory rate limiter
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 300; // requests per window
const RATE_WINDOW = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Clean up old entries periodically
function cleanup() {
  const now = Date.now();
  for (const [key, val] of rateMap) {
    if (now > val.resetAt) rateMap.delete(key);
  }
}

let lastCleanup = Date.now();

export function middleware(request: NextRequest) {
  // Periodic cleanup
  if (Date.now() - lastCleanup > 300_000) {
    cleanup();
    lastCleanup = Date.now();
  }

  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  // Block known bots
  if (BLOCKED_BOTS.some(bot => ua.includes(bot))) {
    return new NextResponse("Access Denied", { status: 403 });
  }

  // Block requests with no user-agent (likely automated)
  if (!request.headers.get("user-agent")) {
    return new NextResponse("Access Denied", { status: 403 });
  }

  // Rate limiting
  if (isRateLimited(ip)) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "frame-ancestors 'none';"
  );
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|cars/).*)",
  ],
};
