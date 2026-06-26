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

interface ReviewInviteEmailRequestBody {
  email?: unknown;
  customerName?: unknown;
  reviewUrl?: unknown;
  message?: unknown;
}

interface ResendErrorResponse {
  message?: string;
  name?: string;
}

interface ValidContactPayload {
  name: string;
  phone: string;
  email: string;
  message: string;
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

function readSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !apiKey) return null;

  return {
    url: supabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, ""),
    apiKey,
  };
}

function validateContactPayload(body: ContactRequestBody): ValidContactPayload {
  const name = normalizeText(body.name, 60);
  const phone = normalizeText(body.phone, 30);
  const email = normalizeText(body.email, 254).toLowerCase();
  const message = normalizeText(body.message, 3000);

  if (!name || !phone || !isValidEmail(email) || message.length < 10) {
    throw new Error("invalid_contact_payload");
  }

  return { name, phone, email, message };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function verifyAdminRequest(req: express.Request) {
  const authorization = req.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!token || !supabaseUrl || !anonKey) {
    return false;
  }

  const normalizedSupabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const userResponse = await fetch(`${normalizedSupabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!userResponse.ok) return false;

  const user = (await userResponse.json()) as { id?: string };
  if (!user.id) return false;

  const profileResponse = await fetch(
    `${normalizedSupabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(
      user.id
    )}&select=role&limit=1`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!profileResponse.ok) return false;

  const profiles = (await profileResponse.json()) as Array<{ role?: string }>;
  return profiles[0]?.role === "admin";
}

async function readAuthenticatedUserId(req: express.Request) {
  const authorization = req.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!token || !supabaseUrl || !anonKey) {
    return null;
  }

  const normalizedSupabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const response = await fetch(`${normalizedSupabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;

  const user = (await response.json()) as { id?: string };
  return user.id ?? null;
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
  const { name, phone, email, message } = validateContactPayload(body);

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

async function saveContactInquiry(
  body: ContactRequestBody,
  userId: string,
  emailSent: boolean,
  emailError?: string
) {
  const config = readSupabaseRestConfig();

  if (!config) {
    throw new Error("supabase_rest_not_configured");
  }

  const payload = validateContactPayload(body);
  const response = await fetch(`${config.url}/rest/v1/contact_inquiries`, {
    method: "POST",
    headers: {
      apikey: config.apiKey,
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      ...payload,
      user_id: userId,
      status: "new",
      email_sent: emailSent,
      email_error: emailError ? emailError.slice(0, 500) : null,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("Failed to save contact inquiry", {
      status: response.status,
      body: errorText.slice(0, 500),
    });
    throw new Error("contact_inquiry_save_failed");
  }
}

async function sendReviewInviteEmail(body: ReviewInviteEmailRequestBody) {
  const email = normalizeText(body.email, 254).toLowerCase();
  const customerName = normalizeText(body.customerName, 60) || "고객";
  const reviewUrl = normalizeText(body.reviewUrl, 1000);
  const message = normalizeText(body.message, 2000);

  if (!isValidEmail(email) || !reviewUrl.startsWith("http")) {
    throw new Error("invalid_review_invite_payload");
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "contact@mail.romantichamilton.store";

  if (!resendApiKey) {
    throw new Error("resend_not_configured");
  }

  const safeName = escapeHtml(customerName);
  const safeMessage = escapeHtml(
    message ||
      "Romantic Hamilton을 이용해주셔서 감사합니다. 아래 링크에서 후기를 남겨주세요."
  ).replace(/\n/g, "<br />");
  const safeReviewUrl = escapeHtml(reviewUrl);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Romantic Hamilton <${fromEmail}>`,
      to: [email],
      subject: "[Romantic Hamilton] 리뷰 작성을 부탁드립니다",
      text: [
        `${customerName}님, 안녕하세요.`,
        "",
        message ||
          "Romantic Hamilton을 이용해주셔서 감사합니다. 아래 링크에서 후기를 남겨주세요.",
        "",
        reviewUrl,
        "",
        "리뷰 링크는 1회만 사용할 수 있으며 7일 후 만료됩니다.",
      ].join("\n"),
      html: `<!doctype html>
        <html>
          <body style="margin:0;background:#f4f0ea;padding:32px;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#241f1b;">
            <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5ddd3;padding:32px;">
              <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#9a6a43;">Romantic Hamilton</p>
              <h1 style="margin:0 0 20px;font-size:24px;font-weight:600;">${safeName}님, 리뷰 작성을 부탁드립니다.</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#5f554c;">${safeMessage}</p>
              <a href="${safeReviewUrl}" style="display:inline-block;background:#241f1b;color:#ffffff;text-decoration:none;padding:14px 22px;font-size:14px;">리뷰 작성하기</a>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#8b8178;">링크는 1회만 사용할 수 있으며 7일 후 만료됩니다.</p>
            </div>
          </body>
        </html>`,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ResendErrorResponse;
    console.error("Resend review invite email failed", {
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
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

    const userId = await readAuthenticatedUserId(req);

    try {
      validateContactPayload(body);
      await sendContactEmail(body);

      if (userId) {
        try {
          await saveContactInquiry(body, userId, true);
        } catch (saveError) {
          console.error("Contact inquiry save failed after email sent", saveError);
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "contact_failed";

      if (message === "invalid_contact_payload") {
        res.status(400).json({ error: message });
        return;
      }

      if (userId) {
        try {
          await saveContactInquiry(body, userId, false, message);
        } catch (saveError) {
          console.error("Contact inquiry save after failure failed", saveError);
        }
      }

      console.error("Contact request failed", { message });
      res.status(503).json({ error: "contact_service_unavailable" });
    }
  });

  app.post("/api/review-invite/email", async (req, res) => {
    try {
      const isAdmin = await verifyAdminRequest(req);

      if (!isAdmin) {
        res.status(403).json({ error: "admin_required" });
        return;
      }

      await sendReviewInviteEmail((req.body ?? {}) as ReviewInviteEmailRequestBody);
      res.status(200).json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "review_invite_email_failed";

      if (message === "invalid_review_invite_payload") {
        res.status(400).json({ error: message });
        return;
      }

      console.error("Review invite email send failed", error);
      res.status(503).json({ error: "review_invite_email_unavailable" });
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
