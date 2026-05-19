import express from "express";
import { createServer } from "http";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.get("/api/auth/naver/start", (_req, res) => {
    const clientId = process.env.NAVER_CLIENT_ID;
    const baseUrl = process.env.PUBLIC_SITE_URL || "http://localhost:3000";

    if (!clientId) {
      res.redirect("/auth?error=naver_not_configured");
      return;
    }

    const state = crypto.randomUUID();
    const redirectUri = `${baseUrl.replace(/\/+$/, "")}/api/auth/naver/callback`;
    const authorizeUrl = new URL("https://nid.naver.com/oauth2.0/authorize");

    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("state", state);

    res.setHeader("Set-Cookie", `naver_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=300`);
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
    const baseUrl = process.env.PUBLIC_SITE_URL || "http://localhost:3000";

    if (!clientId || !clientSecret) {
      res.redirect("/auth?error=naver_not_configured");
      return;
    }

    const redirectUri = `${baseUrl.replace(/\/+$/, "")}/api/auth/naver/callback`;
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
      const profilePayload = await profileResponse.json();

      console.log("Naver OAuth profile received", {
        id: profilePayload?.response?.id,
        email: profilePayload?.response?.email,
      });

      res.redirect("/auth?naver=server_flow_ready");
    } catch (error) {
      console.error("Naver OAuth failed", error);
      res.redirect("/auth?error=naver_failed");
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

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
