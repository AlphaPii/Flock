const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const crypto = require("crypto");

const HOST = "0.0.0.0";
const PORT = 5500;
const ROOT = __dirname;
const AUTH_USER = process.env.FLOCK_USER || "flock";
const AUTH_PASS = process.env.FLOCK_PASS || "change-me";
const REQUIRE_AUTH = process.env.FLOCK_AUTH === "1";
const AUTH_COOKIE_NAME = "flock_device_auth";
const AUTH_COOKIE_DAYS = Math.max(1, Number(process.env.FLOCK_AUTH_DAYS || 90));
const AUTH_COOKIE_TTL_MS = AUTH_COOKIE_DAYS * 24 * 60 * 60 * 1000;
const AUTH_SECRET = process.env.FLOCK_AUTH_SECRET || "change-me-super-secret";
const AUTH_COOKIE_SECURE = process.env.FLOCK_COOKIE_SECURE === "1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function safePath(requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const filePath = normalized === "/" ? "/index.html" : normalized;
  return path.join(ROOT, filePath);
}

function send(res, code, body, type = "text/plain; charset=utf-8", extraHeaders = {}) {
  res.writeHead(code, { "Content-Type": type, ...extraHeaders });
  res.end(body);
}

function redirect(res, location, extraHeaders = {}) {
  res.writeHead(303, { Location: location, ...extraHeaders });
  res.end();
}

function timingSafeEqualText(a, b) {
  const aBuf = Buffer.from(String(a), "utf8");
  const bBuf = Buffer.from(String(b), "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function parseBasicAuth(headerValue) {
  if (!headerValue || !headerValue.startsWith("Basic ")) return null;
  const encoded = headerValue.slice(6).trim();
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return {
      user: decoded.slice(0, separator),
      pass: decoded.slice(separator + 1)
    };
  } catch {
    return null;
  }
}

function parseCookies(headerValue = "") {
  return headerValue.split(";").reduce((acc, part) => {
    const idx = part.indexOf("=");
    if (idx <= 0) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) acc[key] = value;
    return acc;
  }, {});
}

function toBase64Url(text) {
  return Buffer.from(text, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(text) {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? 0 : 4 - (padded.length % 4);
  return Buffer.from(padded + "=".repeat(pad), "base64").toString("utf8");
}

function signPayload(payload) {
  return crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
}

function createAuthToken() {
  const expiresAt = Date.now() + AUTH_COOKIE_TTL_MS;
  const payload = `${AUTH_USER}|${expiresAt}`;
  const signature = signPayload(payload);
  return toBase64Url(`${payload}|${signature}`);
}

function verifyAuthToken(token) {
  if (!token) return false;
  try {
    const decoded = fromBase64Url(token);
    const parts = decoded.split("|");
    if (parts.length !== 3) return false;

    const [user, expiresRaw, signature] = parts;
    const expiresAt = Number(expiresRaw);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
    if (!timingSafeEqualText(user, AUTH_USER)) return false;

    const payload = `${user}|${expiresAt}`;
    const expected = signPayload(payload);
    return timingSafeEqualText(signature, expected);
  } catch {
    return false;
  }
}

function authCookieHeader(token) {
  const expiresAt = new Date(Date.now() + AUTH_COOKIE_TTL_MS).toUTCString();
  const parts = [
    `${AUTH_COOKIE_NAME}=${token}`,
    `Max-Age=${Math.floor(AUTH_COOKIE_TTL_MS / 1000)}`,
    `Expires=${expiresAt}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax"
  ];
  if (AUTH_COOKIE_SECURE) parts.push("Secure");
  return parts.join("; ");
}

function clearAuthCookieHeader() {
  const parts = [
    `${AUTH_COOKIE_NAME}=`,
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax"
  ];
  if (AUTH_COOKIE_SECURE) parts.push("Secure");
  return parts.join("; ");
}

function isAuthorized(req) {
  if (!REQUIRE_AUTH) return { ok: true, shouldSetCookie: false };

  const cookies = parseCookies(req.headers.cookie || "");
  if (verifyAuthToken(cookies[AUTH_COOKIE_NAME])) {
    return { ok: true, shouldSetCookie: false };
  }

  const auth = parseBasicAuth(req.headers.authorization || "");
  const basicOk = Boolean(
    auth && timingSafeEqualText(auth.user, AUTH_USER) && timingSafeEqualText(auth.pass, AUTH_PASS)
  );
  if (basicOk) {
    return { ok: true, shouldSetCookie: true };
  }

  return { ok: false, shouldSetCookie: false };
}

function readRequestBody(req, maxBytes = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    req.on("error", reject);
  });
}

function renderLoginPage(message = "") {
  const msg = message ? `<p class="msg">${message}</p>` : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FLOCK Login</title>
  <style>
    body { margin:0; min-height:100vh; display:grid; place-items:center; background:#061223; color:#dbe9ff; font-family:Segoe UI,Aptos,sans-serif; }
    .card { width:min(92vw,360px); padding:18px; border-radius:14px; border:1px solid #78b0ff44; background:#10253fee; }
    h1 { margin:0 0 10px; font-size:1.2rem; }
    p { margin:0 0 12px; color:#9ab8de; font-size:.9rem; }
    .msg { color:#ffb4bc; margin:0 0 10px; }
    label { display:block; margin:10px 0 4px; color:#c8dcfb; font-size:.9rem; }
    input { width:100%; box-sizing:border-box; padding:9px 10px; border-radius:8px; border:1px solid #6fa3dd66; background:#0d2743; color:#dbe9ff; }
    button { margin-top:14px; width:100%; padding:10px; border-radius:10px; border:1px solid #7be0c677; background:linear-gradient(120deg,#7be0c6,#ffcf8a); color:#041a2f; font-weight:700; cursor:pointer; }
  </style>
</head>
<body>
  <form class="card" method="post" action="/login" autocomplete="on">
    <h1>FLOCK</h1>
    <p>Sign in once on this device.</p>
    ${msg}
    <label for="user">Username</label>
    <input id="user" name="user" type="text" required />
    <label for="pass">Password</label>
    <input id="pass" name="pass" type="password" required />
    <button type="submit">Sign In</button>
  </form>
</body>
</html>`;
}

async function handleAuthRoutes(req, res, pathname) {
  if (!REQUIRE_AUTH) return false;

  if (pathname === "/logout") {
    redirect(res, "/login", { "Set-Cookie": clearAuthCookieHeader() });
    return true;
  }

  if (pathname !== "/login") return false;

  const authState = isAuthorized(req);
  if (authState.ok && req.method === "GET") {
    const headers = authState.shouldSetCookie ? { "Set-Cookie": authCookieHeader(createAuthToken()) } : {};
    redirect(res, "/", headers);
    return true;
  }

  if (req.method === "GET") {
    send(res, 200, renderLoginPage(), "text/html; charset=utf-8");
    return true;
  }

  if (req.method === "POST") {
    let body = "";
    try {
      body = await readRequestBody(req);
    } catch {
      send(res, 400, renderLoginPage("Invalid login request."), "text/html; charset=utf-8");
      return true;
    }

    const form = new URLSearchParams(body);
    const user = form.get("user") || "";
    const pass = form.get("pass") || "";
    const ok = timingSafeEqualText(user, AUTH_USER) && timingSafeEqualText(pass, AUTH_PASS);
    if (!ok) {
      send(res, 401, renderLoginPage("Incorrect username or password."), "text/html; charset=utf-8");
      return true;
    }

    redirect(res, "/", { "Set-Cookie": authCookieHeader(createAuthToken()) });
    return true;
  }

  send(res, 405, "Method not allowed");
  return true;
}

http
  .createServer(async (req, res) => {
    const parsed = url.parse(req.url || "/");
    const pathname = parsed.pathname || "/";

    if (await handleAuthRoutes(req, res, pathname)) {
      return;
    }

    const authState = isAuthorized(req);
    if (!authState.ok) {
      const acceptsHtml = (req.headers.accept || "").includes("text/html");
      if (acceptsHtml || pathname === "/" || pathname.endsWith(".html")) {
        redirect(res, "/login");
        return;
      }
      res.writeHead(401, {
        "Content-Type": "text/plain; charset=utf-8",
        "WWW-Authenticate": 'Basic realm="FLOCK", charset="UTF-8"'
      });
      res.end("Authentication required");
      return;
    }

    const extraHeaders = authState.shouldSetCookie ? { "Set-Cookie": authCookieHeader(createAuthToken()) } : {};
    let filePath = safePath(pathname);

    fs.stat(filePath, (statErr, stats) => {
      if (!statErr && stats.isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }

      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          if (readErr.code === "ENOENT") {
            send(res, 404, "Not found", "text/plain; charset=utf-8", extraHeaders);
            return;
          }
          send(res, 500, "Server error", "text/plain; charset=utf-8", extraHeaders);
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        send(res, 200, data, MIME[ext] || "application/octet-stream", extraHeaders);
      });
    });
  })
  .listen(PORT, HOST, () => {
    console.log(`FLOCK is running at http://${HOST}:${PORT}`);
    if (REQUIRE_AUTH) {
      console.log(`Auth enabled for user "${AUTH_USER}"`);
      console.log(`Persistent device cookie: ${AUTH_COOKIE_DAYS} day(s)`);
      if (AUTH_SECRET === "change-me-super-secret") {
        console.log("Warning: set FLOCK_AUTH_SECRET for stronger cookie security.");
      }
    } else {
      console.log("Auth disabled (FLOCK_AUTH=0)");
    }
    console.log("Press Ctrl+C to stop.");
  });
