#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { parseArgs } = require("node:util");
const { createApp, load } = require("../src");
const { c, header, plural } = require("../src/ui");
const pkg = require("../package.json");

const HELP = `${header("mockapi", "a REST API from a JSON file")}

${c.bold("Usage")}
  mockapi [db.json] [options]       ${c.dim("(creates db.json with sample data if missing)")}

${c.bold("Options")}
  -p, --port <n>        port (default 3000, next free if busy)
  -H, --host <addr>     bind address (default 0.0.0.0)
  -d, --delay <ms>      add latency to every response
      --prefix <path>   mount under a path, e.g. /api
      --read-only       reject writes
      --no-persist      keep writes in memory only
      --no-watch        don't reload when the file changes
  -q, --quiet           no request log
  -v, --version / -h, --help

${c.bold("Routes")} ${c.dim("for every collection")}
  GET    /posts          ${c.dim("?title_like=ai  ?likes_gte=100  ?q=text  ?_sort=-likes  ?_page=1&_limit=10  ?_embed=comments  ?_expand=user")}
  GET    /posts/1        POST /posts   PUT|PATCH|DELETE /posts/1   GET /posts/1/comments`;

let a;
try { a = parseArgs({ allowPositionals: true, options: { port: { type: "string", short: "p", default: "3000" }, host: { type: "string", short: "H", default: "0.0.0.0" }, delay: { type: "string", short: "d" }, prefix: { type: "string" }, "read-only": { type: "boolean" }, "no-persist": { type: "boolean" }, "no-watch": { type: "boolean" }, quiet: { type: "boolean", short: "q" }, version: { type: "boolean", short: "v" }, help: { type: "boolean", short: "h" } } }); }
catch (e) { console.error(c.red(`✖ ${e.message}`)); process.exit(2); }
const o = a.values;
if (o.help) { console.log(HELP); process.exit(0); }
if (o.version) { console.log(pkg.version); process.exit(0); }
const file = path.resolve(a.positionals[0] || "db.json");
if (!fs.existsSync(file)) { fs.copyFileSync(path.join(__dirname, "../examples/db.json"), file); console.log(`${c.green("✔")} Created ${c.bold(path.basename(file))} with sample data`); }
try { load(file); } catch (e) { console.error(c.red(`✖ ${path.basename(file)}: ${e.message}`)); process.exit(2); }
const port0 = +o.port; if (!Number.isInteger(port0) || port0 < 0 || port0 > 65535) { console.error(c.red("✖ Invalid port")); process.exit(2); }

const mc = { GET: c.green, POST: c.cyan, PUT: c.yellow, PATCH: c.yellow, DELETE: c.red, OPTIONS: c.dim };
const log = o.quiet ? null : (r) => console.log(`${c.dim(new Date().toTimeString().slice(0, 8))} ${(mc[r.method] || c.dim)(r.method.padEnd(6))} ${r.path} ${(r.status < 300 ? c.green : r.status < 500 ? c.yellow : c.red)(r.status)} ${c.dim(r.ms + "ms")}`);
const app = createApp({ file, readOnly: o["read-only"], persist: !o["no-persist"], delay: o.delay ? +o.delay : 0, prefix: o.prefix, log });

let port = port0, tries = 0;
app.on("error", (e) => { if (e.code === "EADDRINUSE" && tries++ < 20) { port++; app.listen(port, o.host); } else { console.error(c.red(`✖ ${e.message}`)); process.exit(1); } });
app.listen(port, o.host, () => {
  port = app.address().port;
  const lan = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === "IPv4" && !i.internal)?.address;
  const pre = (o.prefix || "").replace(/\/$/, "");
  console.log(header("mockapi", `${path.basename(file)}${o["read-only"] ? c.yellow(" read-only") : ""}${o.delay ? c.dim(` +${o.delay}ms`) : ""}`));
  console.log(`\n  ${c.dim("Local")}   ${c.bold(c.accent(`http://localhost:${port}${pre}`))}${lan ? `\n  ${c.dim("LAN")}     http://${lan}:${port}${pre}` : ""}\n`);
  for (const [k, v] of Object.entries(app.state.db)) console.log(`  ${c.green("GET")} ${`${pre}/${k}`.padEnd(22)} ${c.dim(Array.isArray(v) ? plural(v.length, "item") : "object")}`);
  console.log(`\n${c.dim(port !== port0 ? `Port ${port0} busy → using ${port}. ` : "")}Ctrl+C to stop. Edits to ${path.basename(file)} reload automatically.\n`);
});
if (!o["no-watch"]) { let t; fs.watchFile(file, { interval: 300 }, () => { clearTimeout(t); t = setTimeout(() => { try { app.reload(); o.quiet || console.log(c.dim(`↻ reloaded ${path.basename(file)}`)); } catch (e) { console.error(c.red(`✖ reload failed: ${e.message}`)); } }, 50); }); }
process.on("SIGINT", () => { console.log(c.dim("\nbye")); process.exit(0); });
