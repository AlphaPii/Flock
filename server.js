const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const HOST = "127.0.0.1";
const PORT = 5500;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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

function send(res, code, body, type = "text/plain; charset=utf-8") {
  res.writeHead(code, { "Content-Type": type });
  res.end(body);
}

http
  .createServer((req, res) => {
    const parsed = url.parse(req.url || "/");
    let filePath = safePath(parsed.pathname || "/");

    fs.stat(filePath, (statErr, stats) => {
      if (!statErr && stats.isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }

      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          if (readErr.code === "ENOENT") {
            send(res, 404, "Not found");
            return;
          }
          send(res, 500, "Server error");
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        send(res, 200, data, MIME[ext] || "application/octet-stream");
      });
    });
  })
  .listen(PORT, HOST, () => {
    console.log(`FLOCK is running at http://${HOST}:${PORT}`);
    console.log("Press Ctrl+C to stop.");
  });
