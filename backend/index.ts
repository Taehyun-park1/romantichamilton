import express from "express";
import { createServer } from "http";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { renderContactEmailHtml } from "./email/contactEmailTemplate";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface NaverProfileResponse {
  resultcode?: string;
  message?: string;
  response?: {
    id?: string;
    email?: string;
    name?: string;
    nickname?: string;
    profile_image?: string;
  };
}

interface SupabaseGenerateLinkResponse {
  action_link?: string;
  error?: string;
  error_description?: string;
  msg?: string;
}

interface ContactRequestBody {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  message?: unknown;
  website?: unknown;
}

interface ResendErrorResponse {
  message?: string;
  name?: string;
}

const CONTACT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_RATE_LIMIT_MAX_REQUESTS = 5;
const contactRequestsByIp = new Map<string, number[]>();

function getRequestOrigin(req: express.Request) {
  const protocol = req.get("x-forwarded-proto") || req.protocol;
  return `${protocol}://${req.get("host")}`;
}

function getFrontendUrl() {
  return (process.env.PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

function getNaverCallbackBaseUrl(req: express.Request) {
  return (process.env.NAVER_CALLBACK_BASE_URL || getRequestOrigin(req)).replace(/\/+$/, "");
}

function createNaverRedirectUri(req: express.Request) {
  return `${getNaverCallbackBaseUrl(req)}/api/auth/naver/callback`;
}

function createStateCookie(state: string, req: express.Request) {
  const secure = getRequestOrigin(req).startsWith("https://") ? "; Secure" : "";
  return `naver_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=300${secure}`;
}

function clearStateCookie(req: express.Request) {
  const secure = getRequestOrigin(req).startsWith("https://") ? "; Secure" : "";
  return `naver_oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

function createSyntheticNaverEmail(naverId: string) {
  return `naver-${naverId}@auth.romantichamilton.local`;
}

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isContactRateLimited(ip: string) {
  const now = Date.now();
  const recentRequests = (contactRequestsByIp.get(ip) ?? []).filter(
    (requestedAt) => now - requestedAt < CONTACT_RATE_LIMIT_WINDOW_MS
  );

  if (recentRequests.length >= CONTACT_RATE_LIMIT_MAX_REQUESTS) {
    contactRequestsByIp.set(ip, recentRequests);
    return true;
  }

  recentRequests.push(now);
  contactRequestsByIp.set(ip, recentRequests);
  return false;
}

function getAllowedOrigins() {
  return new Set(
    [
      process.env.PUBLIC_SITE_URL,
      "https://www.romantichamilton.store",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ].filter((origin): origin is string => Boolean(origin))
  );
}

async function sendContactEmail(body: ContactRequestBody) {
  const name = normalizeText(body.name, 60);
  const phone = normalizeText(body.phone, 30);
  const email = normalizeText(body.email, 254).toLowerCase();
  const message = normalizeText(body.message, 3000);

  if (!name || !phone || !isValidEmail(email) || message.length < 10) {
    throw new Error("invalid_contact_payload");
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "contact@mail.romantichamilton.store";
  const toEmail = process.env.CONTACT_TO_EMAIL;

  if (!resendApiKey || !toEmail) {
    throw new Error("resend_not_configured");
  }

  const submittedAt = new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Romantic Hamilton <${fromEmail}>`,
      to: [toEmail],
      reply_to: email,
      subject: `[Romantic Hamilton] ${name}님의 제작 문의`,
      text: [
        `이름: ${name}`,
        `연락처: ${phone}`,
        `이메일: ${email}`,
        `접수일시: ${submittedAt}`,
        "",
        message,
      ].join("\n"),
      html: renderContactEmailHtml({
        name,
        phone,
        email,
        message,
        submittedAt,
      }),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ResendErrorResponse;
    console.error("Resend contact email failed", {
      status: response.status,
      name: payload.name,
      message: payload.message,
    });
    throw new Error("resend_send_failed");
  }
}

async function createSupabaseMagicLink(profile: Required<NaverProfileResponse>["response"]) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("supabase_admin_not_configured");
  }

  const normalizedSupabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const naverId = profile.id;

  if (!naverId) {
    throw new Error("naver_profile_missing_id");
  }

  const displayName = profile.nickname || profile.name || "네이버 사용자";
  const email = profile.email || createSyntheticNaverEmail(naverId);
  const response = await fetch(`${normalizedSupabaseUrl}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "magiclink",
      email,
      redirect_to: `${getFrontendUrl()}/my`,
      data: {
        display_name: displayName,
        name: displayName,
        avatar_url: profile.profile_image || null,
        picture: profile.profile_image || null,
        oauth_provider: "naver",
        provider_user_id: naverId,
        real_email: profile.email || null,
      },
    }),
  });

  const payload = (await response.json()) as SupabaseGenerateLinkResponse;

  if (!response.ok || !payload.action_link) {
    throw new Error(payload.error_description || payload.error || payload.msg || "supabase_magic_link_failed");
  }

  return payload.action_link;
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "16kb" }));

  app.use("/api", (req, res, next) => {
    const origin = req.get("origin");
    const allowedOrigins = getAllowedOrigins();

    if (origin && allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }

    if (origin && !allowedOrigins.has(origin)) {
      res.sendStatus(403);
      return;
    }

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    next();
  });

  app.post("/api/contact", async (req, res) => {
    const body = (req.body ?? {}) as ContactRequestBody;

    if (normalizeText(body.website, 200)) {
      res.status(200).json({ success: true });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (isContactRateLimited(ip)) {
      res.status(429).json({ error: "too_many_requests" });
      return;
    }

    try {
      await sendContactEmail(body);
      res.status(200).json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "contact_failed";

      if (message === "invalid_contact_payload") {
        res.status(400).json({ error: message });
        return;
      }

      console.error("Contact request failed", { message });
      res.status(503).json({ error: "contact_service_unavailable" });
    }
  });

  app.get("/api/auth/naver/start", (req, res) => {
    const clientId = process.env.NAVER_CLIENT_ID;

    if (!clientId) {
      res.redirect("/auth?error=naver_not_configured");
      return;
    }

    const state = crypto.randomUUID();
    const redirectUri = createNaverRedirectUri(req);
    const authorizeUrl = new URL("https://nid.naver.com/oauth2.0/authorize");

    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("state", state);

    res.setHeader("Set-Cookie", createStateCookie(state, req));
    res.redirect(authorizeUrl.toString());
  });

  app.get("/api/auth/naver/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const cookie = req.headers.cookie ?? "";
    const savedState = cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("naver_oauth_state="))
      ?.split("=")[1];

    if (!code || !state || !savedState || state !== savedState) {
      res.redirect("/auth?error=naver_invalid_state");
      return;
    }

    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      res.redirect("/auth?error=naver_not_configured");
      return;
    }

    const redirectUri = createNaverRedirectUri(req);
    const tokenUrl = new URL("https://nid.naver.com/oauth2.0/token");

    tokenUrl.searchParams.set("grant_type", "authorization_code");
    tokenUrl.searchParams.set("client_id", clientId);
    tokenUrl.searchParams.set("client_secret", clientSecret);
    tokenUrl.searchParams.set("code", code);
    tokenUrl.searchParams.set("state", state);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);

    try {
      const tokenResponse = await fetch(tokenUrl);
      const tokenPayload = (await tokenResponse.json()) as {
        access_token?: string;
        error?: string;
      };

      if (!tokenResponse.ok || !tokenPayload.access_token) {
        res.redirect(`/auth?error=${encodeURIComponent(tokenPayload.error || "naver_token_failed")}`);
        return;
      }

      const profileResponse = await fetch("https://openapi.naver.com/v1/nid/me", {
        headers: {
          Authorization: `Bearer ${tokenPayload.access_token}`,
        },
      });
      const profilePayload = (await profileResponse.json()) as NaverProfileResponse;

      console.log("Naver OAuth profile received", {
        id: profilePayload?.response?.id,
        email: profilePayload?.response?.email,
      });

      if (!profileResponse.ok || !profilePayload.response?.id) {
        res.redirect("/auth?error=naver_profile_failed");
        return;
      }

      const actionLink = await createSupabaseMagicLink(profilePayload.response);

      res.setHeader("Set-Cookie", clearStateCookie(req));
      res.redirect(actionLink);
    } catch (error) {
      console.error("Naver OAuth failed", error);
      const message = error instanceof Error ? error.message : "naver_failed";
      res.redirect(`/auth?error=${encodeURIComponent(message)}`);
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port =
    process.env.PORT || (process.env.NODE_ENV === "production" ? 3000 : 3001);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
