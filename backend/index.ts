import express from "express";
import { createServer } from "http";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { renderContactEmailHtml } from "./email/contactEmailTemplate";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function loadLocalEnvFile(fileName: string) {
  const envPath = path.join(projectRoot, fileName);

  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

if (process.env.NODE_ENV !== "production") {
  loadLocalEnvFile(".env.local");
  loadLocalEnvFile(".env.backend.local");
}

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

interface ReservationConfirmationEmailRequestBody {
  reservationId?: unknown;
  email?: unknown;
  customerName?: unknown;
  className?: unknown;
  preferredDate?: unknown;
  phone?: unknown;
  note?: unknown;
}

interface ReviewImageUploadRequestBody {
  inviteToken?: unknown;
  images?: unknown;
}

interface ReviewStatusUpdateRequestBody {
  reviewId?: unknown;
  status?: unknown;
}

interface ReviewImagePayload {
  fileName?: unknown;
  mimeType?: unknown;
  base64?: unknown;
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

interface ReservationConfirmationPayload {
  email: string;
  customerName: string;
  className: string;
  preferredDate: string;
  phone: string;
  note: string;
}

const CONTACT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_REVIEW_IMAGE_COUNT = 6;
const MAX_REVIEW_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
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

function isDeliverableEmail(value: string) {
  return isValidEmail(value) && !value.endsWith("@auth.romantichamilton.local");
}

function readSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || (!serviceRoleKey && !anonKey)) return null;

  return {
    url: supabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, ""),
    anonKey,
    serviceRoleKey,
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

function createSupabaseHeaders(config: NonNullable<ReturnType<typeof readSupabaseRestConfig>>) {
  const token = config.serviceRoleKey || config.anonKey;

  if (!token) {
    throw new Error("supabase_rest_not_configured");
  }

  return {
    apikey: token,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function readReservationConfirmationPayload(
  body: ReservationConfirmationEmailRequestBody
): Promise<ReservationConfirmationPayload> {
  const reservationId = normalizeText(body.reservationId, 80);

  if (!reservationId) {
    const email = normalizeText(body.email, 254).toLowerCase();
    const customerName = normalizeText(body.customerName, 60) || "고객";
    const className = normalizeText(body.className, 120);
    const preferredDate = normalizeText(body.preferredDate, 40);
    const phone = normalizeText(body.phone, 30);
    const note = normalizeText(body.note, 1000);

    if (!isDeliverableEmail(email) || !className || !preferredDate) {
      throw new Error("invalid_reservation_confirmation_payload");
    }

    return { email, customerName, className, preferredDate, phone, note };
  }

  const config = readSupabaseRestConfig();

  if (!config?.serviceRoleKey) {
    throw new Error("supabase_admin_not_configured");
  }

  const headers = createSupabaseHeaders(config);
  const reservationResponse = await fetch(
    `${config.url}/rest/v1/class_reservations?id=eq.${encodeURIComponent(
      reservationId
    )}&select=id,user_id,class_name,preferred_date,phone,note&limit=1`,
    { headers }
  );

  if (!reservationResponse.ok) {
    throw new Error("reservation_lookup_failed");
  }

  const reservations = (await reservationResponse.json()) as Array<{
    id: string;
    user_id: string;
    class_name: string;
    preferred_date: string;
    phone?: string | null;
    note?: string | null;
  }>;
  const reservation = reservations[0];

  if (!reservation) {
    throw new Error("reservation_not_found");
  }

  const profileResponse = await fetch(
    `${config.url}/rest/v1/profiles?id=eq.${encodeURIComponent(
      reservation.user_id
    )}&select=email,display_name&limit=1`,
    { headers }
  );

  const profiles = profileResponse.ok
    ? ((await profileResponse.json()) as Array<{
        email?: string | null;
        display_name?: string | null;
      }>)
    : [];
  const profile = profiles[0];

  let email = normalizeText(profile?.email, 254).toLowerCase();
  let customerName =
    normalizeText(profile?.display_name, 60) ||
    normalizeText(profile?.email, 60) ||
    "고객";

  if (!isDeliverableEmail(email)) {
    const userResponse = await fetch(
      `${config.url}/auth/v1/admin/users/${encodeURIComponent(
        reservation.user_id
      )}`,
      {
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `Bearer ${config.serviceRoleKey}`,
        },
      }
    );

    if (userResponse.ok) {
      const authUser = (await userResponse.json()) as {
        email?: string | null;
        user_metadata?: {
          real_email?: string | null;
          display_name?: string | null;
          name?: string | null;
        };
      };
      const realEmail = normalizeText(authUser.user_metadata?.real_email, 254)
        .toLowerCase();
      const authEmail = normalizeText(authUser.email, 254).toLowerCase();

      email = isDeliverableEmail(realEmail) ? realEmail : authEmail;
      customerName =
        customerName ||
        normalizeText(authUser.user_metadata?.display_name, 60) ||
        normalizeText(authUser.user_metadata?.name, 60) ||
        "고객";
    }
  }

  if (!isDeliverableEmail(email)) {
    throw new Error("reservation_email_missing");
  }

  return {
    email,
    customerName,
    className: reservation.class_name,
    preferredDate: reservation.preferred_date,
    phone: reservation.phone ?? "",
    note: reservation.note ?? "",
  };
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
  const config = readSupabaseRestConfig();

  if (!token || !config) {
    return false;
  }

  const userApiKey = config.anonKey || config.serviceRoleKey;
  if (!userApiKey) return false;

  const userResponse = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: userApiKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!userResponse.ok) return false;

  const user = (await userResponse.json()) as { id?: string };
  if (!user.id) return false;

  const profileApiKey = config.serviceRoleKey || config.anonKey;
  const profileAuthorization = config.serviceRoleKey || token;
  if (!profileApiKey || !profileAuthorization) return false;

  const profileResponse = await fetch(
    `${config.url}/rest/v1/profiles?id=eq.${encodeURIComponent(
      user.id
    )}&select=role&limit=1`,
    {
      headers: {
        apikey: profileApiKey,
        Authorization: `Bearer ${profileAuthorization}`,
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
  const config = readSupabaseRestConfig();

  if (!token || !config) {
    return null;
  }

  const apiKey = config.anonKey || config.serviceRoleKey;
  if (!apiKey) return null;

  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;

  const user = (await response.json()) as { id?: string };
  return user.id ?? null;
}

async function hasValidReviewInvite(inviteToken: string) {
  const config = readSupabaseRestConfig();

  if (!config?.serviceRoleKey) {
    throw new Error("supabase_admin_not_configured");
  }

  const response = await fetch(
    `${config.url}/rest/v1/review_invites?token=eq.${encodeURIComponent(
      inviteToken
    )}&select=id,expires_at,used_at&limit=1`,
    {
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("review_invite_lookup_failed");
  }

  const invites = (await response.json()) as Array<{
    expires_at?: string;
    used_at?: string | null;
  }>;
  const invite = invites[0];

  return Boolean(
    invite &&
      !invite.used_at &&
      invite.expires_at &&
      new Date(invite.expires_at).getTime() > Date.now()
  );
}

function normalizeImagePayloads(images: unknown) {
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error("invalid_review_image_payload");
  }

  if (images.length > MAX_REVIEW_IMAGE_COUNT) {
    throw new Error("too_many_review_images");
  }

  return images.map((image, index) => {
    const payload = image as ReviewImagePayload;
    const fileName = normalizeText(payload.fileName, 120) || `review-${index}.jpg`;
    const mimeType = normalizeText(payload.mimeType, 80);
    const base64 = normalizeText(payload.base64, MAX_REVIEW_IMAGE_SIZE_BYTES * 2);

    if (!mimeType.startsWith("image/") || !base64) {
      throw new Error("invalid_review_image_payload");
    }

    const buffer = Buffer.from(base64, "base64");

    if (buffer.byteLength > MAX_REVIEW_IMAGE_SIZE_BYTES) {
      throw new Error("review_image_too_large");
    }

    return { fileName, mimeType, buffer };
  });
}

function getStorageSafeExtension(fileName: string, mimeType: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension && /^[a-z0-9]+$/.test(extension)) return extension;
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

async function uploadReviewImages(body: ReviewImageUploadRequestBody) {
  const config = readSupabaseRestConfig();

  if (!config?.serviceRoleKey) {
    throw new Error("supabase_admin_not_configured");
  }

  const imagePayloads = normalizeImagePayloads(body.images);
  const uploadedUrls: string[] = [];

  for (let index = 0; index < imagePayloads.length; index += 1) {
    const image = imagePayloads[index];
    const extension = getStorageSafeExtension(image.fileName, image.mimeType);
    const filePath = `reviews/${crypto.randomUUID()}-${index}.${extension}`;
    const response = await fetch(
      `${config.url}/storage/v1/object/review-images/${filePath}`,
      {
        method: "POST",
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `Bearer ${config.serviceRoleKey}`,
          "Content-Type": image.mimeType,
          "x-upsert": "false",
        },
        body: image.buffer,
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Review image upload failed", {
        status: response.status,
        body: errorText.slice(0, 500),
      });
      throw new Error("review_image_upload_failed");
    }

    uploadedUrls.push(
      `${config.url}/storage/v1/object/public/review-images/${filePath}`
    );
  }

  return uploadedUrls;
}

async function updateWorkshopReviewStatus(body: ReviewStatusUpdateRequestBody) {
  const reviewId = normalizeText(body.reviewId, 80);
  const status = normalizeText(body.status, 20);
  const allowedStatuses = new Set(["pending", "approved", "hidden"]);

  if (!reviewId || !allowedStatuses.has(status)) {
    throw new Error("invalid_review_status_payload");
  }

  const config = readSupabaseRestConfig();

  if (!config?.serviceRoleKey) {
    throw new Error("supabase_admin_not_configured");
  }

  const response = await fetch(
    `${config.url}/rest/v1/workshop_reviews?id=eq.${encodeURIComponent(
      reviewId
    )}`,
    {
      method: "PATCH",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("Workshop review status update failed", {
      status: response.status,
      body: errorText.slice(0, 500),
    });
    throw new Error("review_status_update_failed");
  }
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
  emailError?: string,
  userAccessToken?: string
) {
  const config = readSupabaseRestConfig();

  if (!config) {
    throw new Error("supabase_rest_not_configured");
  }

  const apiKey = config.serviceRoleKey || config.anonKey;
  const authorizationToken = config.serviceRoleKey || userAccessToken;

  if (!apiKey || !authorizationToken) {
    throw new Error("supabase_rest_not_configured");
  }

  const payload = validateContactPayload(body);
  const response = await fetch(`${config.url}/rest/v1/contact_inquiries`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${authorizationToken}`,
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

async function sendReservationConfirmationEmail(
  body: ReservationConfirmationEmailRequestBody
) {
  const { email, customerName, className, preferredDate, phone, note } =
    await readReservationConfirmationPayload(body);

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "contact@mail.romantichamilton.store";

  if (!resendApiKey) {
    throw new Error("resend_not_configured");
  }

  const safeName = escapeHtml(customerName);
  const safeClassName = escapeHtml(className);
  const safePreferredDate = escapeHtml(preferredDate);
  const safePhone = escapeHtml(phone);
  const safeNote = escapeHtml(note).replace(/\n/g, "<br />");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Romantic Hamilton <${fromEmail}>`,
      to: [email],
      subject: "[Romantic Hamilton] 클래스 예약이 확정되었습니다",
      text: [
        `${customerName}님, 안녕하세요.`,
        "",
        "Romantic Hamilton 클래스 예약이 확정되었습니다.",
        "",
        `클래스: ${className}`,
        `예약 날짜: ${preferredDate}`,
        phone ? `연락처: ${phone}` : "",
        note ? `요청사항: ${note}` : "",
        "",
        "예약 관련 변경이 필요하시면 Romantic Hamilton으로 문의해 주세요.",
      ]
        .filter(Boolean)
        .join("\n"),
      html: `<!doctype html>
        <html>
          <body style="margin:0;background:#f4f0ea;padding:32px;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#241f1b;">
            <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5ddd3;padding:32px;">
              <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#9a6a43;">Romantic Hamilton</p>
              <h1 style="margin:0 0 20px;font-size:24px;font-weight:600;">클래스 예약이 확정되었습니다</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#5f554c;">${safeName}님, 예약해 주셔서 감사합니다. 아래 일정으로 클래스 예약이 확정되었습니다.</p>
              <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 24px;">
                <tr>
                  <td style="width:96px;padding:10px 0;border-top:1px solid #eee7dd;color:#8b8178;font-size:13px;">클래스</td>
                  <td style="padding:10px 0;border-top:1px solid #eee7dd;font-size:14px;">${safeClassName}</td>
                </tr>
                <tr>
                  <td style="width:96px;padding:10px 0;border-top:1px solid #eee7dd;color:#8b8178;font-size:13px;">예약 날짜</td>
                  <td style="padding:10px 0;border-top:1px solid #eee7dd;font-size:14px;">${safePreferredDate}</td>
                </tr>
                ${
                  safePhone
                    ? `<tr><td style="width:96px;padding:10px 0;border-top:1px solid #eee7dd;color:#8b8178;font-size:13px;">연락처</td><td style="padding:10px 0;border-top:1px solid #eee7dd;font-size:14px;">${safePhone}</td></tr>`
                    : ""
                }
                ${
                  safeNote
                    ? `<tr><td style="width:96px;padding:10px 0;border-top:1px solid #eee7dd;color:#8b8178;font-size:13px;">요청사항</td><td style="padding:10px 0;border-top:1px solid #eee7dd;font-size:14px;line-height:1.6;">${safeNote}</td></tr>`
                    : ""
                }
              </table>
              <p style="margin:0;font-size:13px;line-height:1.7;color:#8b8178;">예약 관련 변경이 필요하시면 Romantic Hamilton으로 문의해 주세요.</p>
            </div>
          </body>
        </html>`,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ResendErrorResponse;
    console.error("Resend reservation confirmation email failed", {
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
  app.use(express.json({ limit: "40mb" }));

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

    const userAccessToken = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const userId = await readAuthenticatedUserId(req);

    try {
      validateContactPayload(body);
      await sendContactEmail(body);

      if (userId) {
        try {
          await saveContactInquiry(body, userId, true, undefined, userAccessToken);
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
          await saveContactInquiry(body, userId, false, message, userAccessToken);
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

  app.post("/api/review-images/upload", async (req, res) => {
    try {
      const body = (req.body ?? {}) as ReviewImageUploadRequestBody;
      const inviteToken = normalizeText(body.inviteToken, 200);
      const userId = await readAuthenticatedUserId(req);
      const canUploadWithInvite = inviteToken
        ? await hasValidReviewInvite(inviteToken)
        : false;

      if (!userId && !canUploadWithInvite) {
        res.status(403).json({ error: "review_image_upload_forbidden" });
        return;
      }

      const imageUrls = await uploadReviewImages(body);
      res.status(200).json({ imageUrls });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "review_image_upload_failed";

      if (
        message === "invalid_review_image_payload" ||
        message === "too_many_review_images" ||
        message === "review_image_too_large"
      ) {
        res.status(400).json({ error: message });
        return;
      }

      if (
        message === "review_image_upload_forbidden" ||
        message === "review_invite_lookup_failed"
      ) {
        res.status(403).json({ error: message });
        return;
      }

      if (message === "supabase_admin_not_configured") {
        res.status(503).json({ error: message });
        return;
      }

      console.error("Review image upload request failed", error);
      res.status(503).json({ error: "review_image_upload_failed" });
    }
  });

  app.post("/api/admin/reviews/status", async (req, res) => {
    try {
      const isAdmin = await verifyAdminRequest(req);

      if (!isAdmin) {
        res.status(403).json({ error: "admin_required" });
        return;
      }

      await updateWorkshopReviewStatus(
        (req.body ?? {}) as ReviewStatusUpdateRequestBody
      );
      res.status(200).json({ success: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "review_status_update_failed";

      if (message === "invalid_review_status_payload") {
        res.status(400).json({ error: message });
        return;
      }

      if (message === "supabase_admin_not_configured") {
        res.status(503).json({ error: message });
        return;
      }

      console.error("Review status update request failed", error);
      res.status(503).json({ error: "review_status_update_failed" });
    }
  });

  app.post("/api/reservations/confirmation-email", async (req, res) => {
    try {
      const isAdmin = await verifyAdminRequest(req);

      if (!isAdmin) {
        res.status(403).json({ error: "admin_required" });
        return;
      }

      await sendReservationConfirmationEmail(
        (req.body ?? {}) as ReservationConfirmationEmailRequestBody
      );
      res.status(200).json({ success: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "reservation_confirmation_email_failed";

      if (message === "invalid_reservation_confirmation_payload") {
        res.status(400).json({ error: message });
        return;
      }

      if (message === "reservation_not_found") {
        res.status(404).json({ error: message });
        return;
      }

      if (message === "reservation_email_missing") {
        res.status(422).json({ error: message });
        return;
      }

      if (
        message === "supabase_admin_not_configured" ||
        message === "resend_not_configured"
      ) {
        res.status(503).json({ error: message });
        return;
      }

      console.error("Reservation confirmation email send failed", error);
      res.status(503).json({
        error: "reservation_confirmation_email_unavailable",
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
