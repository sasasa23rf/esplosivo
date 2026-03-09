const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = "0.0.0.0";
const DISPLAY_HOST = "localhost";
const PORT = 3000;
const INDEX_PATH = path.join(__dirname, "index.html");

let pending = false;
let lastTriggerAt = 0;
let lastPollAt = 0;

const sendJson = (res, status, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
};

const parseBody = (req) =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.connection.destroy();
      }
    });
    req.on("end", () => {
      if (!data) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        resolve(null);
      }
    });
  });

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    fs.readFile(INDEX_PATH, (err, data) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Errore caricamento pagina");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(data);
    });
    return;
  }

  if (req.method === "GET" && req.url === "/api/poll") {
    const active = pending;
    if (pending) {
      pending = false;
    }
    lastPollAt = Date.now();
    sendJson(res, 200, { active, lastTriggerAt, lastPollAt });
    return;
  }

  if (req.method === "POST" && req.url === "/api/trigger") {
    await parseBody(req);
    pending = true;
    lastTriggerAt = Date.now();
    sendJson(res, 200, { ok: true, pending, lastTriggerAt });
    return;
  }

  if (req.method === "GET" && req.url === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, HOST, () => {
  console.log(`Server in ascolto su http://${DISPLAY_HOST}:${PORT}`);
});
