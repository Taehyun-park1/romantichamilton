import express from "express";
import { createServer } from "http";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

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

interface ResendResponse {
  id?: string;
  message?: string;
}

const contactAttempts = new Map<string, number[]>();
const CONTACT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_RATE_LIMIT_MAX_REQUESTS = 5;

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isContactRateLimited(ip: string) {
  const now = Date.now();
  const recentAttempts = (contactAttempts.get(ip) ?? []).filter(
    (attemptedAt) => now - attemptedAt < CONTACT_RATE_LIMIT_WINDOW_MS
  );

  if (recentAttempts.length >= CONTACT_RATE_LIMIT_MAX_REQUESTS) {
    contactAttempts.set(ip, recentAttempts);
    return true;
  }

  recentAttempts.push(now);
  contactAttempts.set(ip, recentAttempts);
  return false;
}

async function sendContactEmail(input: {
  name: string;
  phone: string;
  email: string;
  message: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL;

  if (!apiKey || !from || !to) {
    throw new Error("contact_email_not_configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: input.email,
      subject: `[Romantic Hamilton] ${input.name}님의 제작 문의`,
      text: [
        `이름: ${input.name}`,
        `연락처: ${input.phone}`,
        `이메일: ${input.email}`,
        "",
        input.message,
      ].join("\n"),
      html: `
        <h2>새로운 제작 문의</h2>
        <p><strong>이름:</strong> ${escapeHtml(input.name)}</p>
        <p><strong>연락처:</strong> ${escapeHtml(input.phone)}</p>
        <p><strong>이메일:</strong> ${escapeHtml(input.email)}</p>
        <hr />
        <p style="white-space: pre-wrap">${escapeHtml(input.message)}</p>
      `,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as ResendResponse;

  if (!response.ok || !payload.id) {
    console.error("Contact email delivery failed", {
      status: response.status,
      message: payload.message,
    });
    throw new Error("contact_email_delivery_failed");
  }
}

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
    const allowedOrigin = getFrontendUrl();
    const origin = req.get("origin");

    if (
      origin &&
      (origin === allowedOrigin || /^http:\/\/localhost:\d+$/.test(origin))
    ) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    next();
  });

  app.post("/api/contact", async (req, res) => {
    const body = (req.body ?? {}) as ContactRequestBody;

    // Bots commonly fill hidden fields that real users cannot see.
    if (normalizeText(body.website, 200)) {
      res.status(200).json({ success: true });
      return;
    }

    const name = normalizeText(body.name, 60);
    const phone = normalizeText(body.phone, 30);
    const email = normalizeText(body.email, 254);
    const message = normalizeText(body.message, 3000);

    if (!name || !phone || !isValidEmail(email) || message.length < 10) {
      res.status(400).json({
        message: "입력 내용을 확인해 주세요.",
      });
      return;
    }

    const requesterIp = req.ip || req.socket.remoteAddress || "unknown";
    if (isContactRateLimited(requesterIp)) {
      res.status(429).json({
        message: "문의가 너무 자주 전송되었습니다. 잠시 후 다시 시도해 주세요.",
      });
      return;
    }

    try {
      await sendContactEmail({ name, phone, email, message });
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Contact endpoint failed", error);
      res.status(502).json({
        message: "문의 이메일 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      });
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
