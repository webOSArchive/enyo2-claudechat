/*
 * Minimal CORS proxy for desktop browser testing.
 * Forwards /v1/messages to api.anthropic.com and adds Access-Control-Allow-Origin.
 *
 * Usage:
 *   node proxy.js
 *
 * Then set API_URL in claude-api.js to http://localhost:8283/v1/messages
 * (revert to https://api.anthropic.com/v1/messages for TouchPad)
 */

var http  = require("http");
var https = require("https");

var PROXY_PORT  = 8283;
var API_HOST    = "api.anthropic.com";
var CORS_ORIGIN = "*";

var ALLOWED_HEADERS = [
    "content-type",
    "x-api-key",
    "anthropic-version",
    "anthropic-dangerous-direct-browser-access"
].join(", ");

function addCors(res) {
    res.setHeader("Access-Control-Allow-Origin",  CORS_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
}

var server = http.createServer(function(req, res) {
    addCors(res);

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method !== "POST" || req.url !== "/v1/messages") {
        res.writeHead(404);
        res.end(JSON.stringify({error: {message: "Only POST /v1/messages is proxied"}}));
        return;
    }

    var body = "";
    req.on("data", function(chunk) { body += chunk; });
    req.on("end", function() {
        var options = {
            hostname: API_HOST,
            port:     443,
            path:     "/v1/messages",
            method:   "POST",
            headers: {
                "content-type":      "application/json",
                "content-length":    Buffer.byteLength(body),
                "x-api-key":         req.headers["x-api-key"] || "",
                "anthropic-version": req.headers["anthropic-version"] || "2023-06-01"
            }
        };

        var proxyReq = https.request(options, function(proxyRes) {
            addCors(res);
            res.writeHead(proxyRes.statusCode, {"content-type": "application/json"});
            proxyRes.pipe(res);
        });

        proxyReq.on("error", function(e) {
            addCors(res);
            res.writeHead(502);
            res.end(JSON.stringify({error: {message: "Proxy upstream error: " + e.message}}));
        });

        proxyReq.write(body);
        proxyReq.end();
    });
});

server.listen(PROXY_PORT, "127.0.0.1", function() {
    console.log("Claude CORS proxy listening on http://127.0.0.1:" + PROXY_PORT);
    console.log("Point claude-api.js API_URL at http://localhost:" + PROXY_PORT + "/v1/messages");
});
