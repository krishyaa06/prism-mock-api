"use strict";
const http = require("node:http");
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");

/** Load db: { collection: [ {id,...} ], singleton: {...} } */
function load(file) { const db = JSON.parse(fs.readFileSync(file, "utf8")); if (!db || typeof db !== "object" || Array.isArray(db)) throw new Error("db must be a JSON object of collections"); return db; }

const getPath = (o, p) => p.split(".").reduce((x, k) => (x == null ? x : x[k]), o);
const OPS = { _gte: (a, b) => a >= b, _lte: (a, b) => a <= b, _gt: (a, b) => a > b, _lt: (a, b) => a < b, _ne: (a, b) => String(a) !== b, _like: (a, b) => new RegExp(b, "i").test(String(a)) };
const num = (v) => (v !== "" && !isNaN(v) ? +v : v);

/** Filter / search / sort / paginate a collection by query params. */
function query(items, params) {
  let out = items.slice();
  const q = params.get("q");
  if (q) { const s = q.toLowerCase(); out = out.filter((it) => JSON.stringify(it).toLowerCase().includes(s)); }
  for (const key of new Set(params.keys())) {
    if (key.startsWith("_") || key === "q") continue;
    const op = Object.keys(OPS).find((o) => key.endsWith(o));
    const field = op ? key.slice(0, -op.length) : key;
    const vals = params.getAll(key);
    out = out.filter((it) => { const v = getPath(it, field); return op ? vals.every((b) => OPS[op](typeof v === "number" ? v : v, op === "_ne" || op === "_like" ? b : num(b))) : vals.some((b) => String(v) === b); });
  }
  const sort = params.get("_sort");
  if (sort) {
    const fields = sort.split(","), orders = (params.get("_order") || "").split(",");
    out.sort((a, b) => { for (let i = 0; i < fields.length; i++) { let f = fields[i], desc = (orders[i] || "asc") === "desc"; if (f.startsWith("-")) { f = f.slice(1); desc = true; } const x = getPath(a, f), y = getPath(b, f); if (x === y) continue; const r = x > y ? 1 : -1; return desc ? -r : r; } return 0; });
  }
  const total = out.length;
  let page = params.get("_page"), limit = params.get("_limit") || params.get("_per_page");
  const start = params.get("_start"), end = params.get("_end");
  if (start != null || end != null) out = out.slice(+(start || 0), end != null ? +end : undefined);
  else if (page) { limit = +(limit || 10); page = Math.max(1, +page); out = out.slice((page - 1) * limit, page * limit); }
  else if (limit) out = out.slice(0, +limit);
  return { items: out, total, page: page ? +page : null, limit: limit ? +limit : null };
}

function nextId(items) { const ids = items.map((x) => x.id); return ids.length && ids.every((i) => Number.isInteger(i)) ? Math.max(0, ...ids) + 1 : ids.length ? randomUUID().slice(0, 8) : 1; }
const sameId = (a, b) => String(a) === String(b);

/** Create the request handler. opts: { file, db, readOnly, delay, persist, log, prefix } */
function createApp(opts) {
  const state = { db: opts.db || load(opts.file) };
  let saveT;
  const save = () => { if (!opts.file || opts.persist === false) return; clearTimeout(saveT); saveT = setTimeout(() => fs.writeFileSync(opts.file, JSON.stringify(state.db, null, 2) + "\n"), 30); };
  const prefix = (opts.prefix || "").replace(/\/$/, "");
  const send = (res, code, body, headers = {}) => { const s = body === undefined ? "" : JSON.stringify(body, null, 2); res.writeHead(code, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "access-control-allow-headers": "*", "access-control-expose-headers": "X-Total-Count, Link", ...headers }); res.end(s); };
  const body = (req) => new Promise((ok, bad) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => { if (!d) return ok({}); try { ok(JSON.parse(d)); } catch { bad(new Error("Invalid JSON body")); } }); });

  async function handle(req, res) {
    const t0 = Date.now();
    const u = new URL(req.url, "http://x");
    const done = (code, b, h) => { const fin = () => { send(res, code, b, h); opts.log?.({ method: req.method, path: u.pathname + u.search, status: code, ms: Date.now() - t0 }); }; opts.delay ? setTimeout(fin, opts.delay) : fin(); };
    if (req.method === "OPTIONS") return done(204);
    let p = u.pathname;
    if (prefix && p.startsWith(prefix)) p = p.slice(prefix.length) || "/";
    const parts = p.split("/").filter(Boolean).map(decodeURIComponent);
    if (!parts.length) {
      if (req.method !== "GET") return done(405, { error: "Method not allowed" });
      return done(200, Object.fromEntries(Object.entries(state.db).map(([k, v]) => [k, Array.isArray(v) ? { type: "collection", count: v.length, url: `${prefix}/${k}` } : { type: "object", url: `${prefix}/${k}` }])));
    }
    if (parts[0] === "__db") return done(200, state.db);
    const [name, id, sub] = parts;
    if (!(name in state.db)) {
      if (req.method === "POST" && !id && !opts.readOnly) state.db[name] = [];
      else return done(404, { error: `No resource "${name}"`, available: Object.keys(state.db) });
    }
    const coll = state.db[name];
    if (opts.readOnly && req.method !== "GET" && req.method !== "HEAD") return done(403, { error: "Read-only mode" });
    let data; try { data = ["POST", "PUT", "PATCH"].includes(req.method) ? await body(req) : null; } catch (e) { return done(400, { error: e.message }); }

    // singleton objects
    if (!Array.isArray(coll)) {
      if (id) return done(404, { error: "Not found" });
      if (req.method === "GET") return done(200, coll);
      if (req.method === "PUT") { state.db[name] = data; save(); return done(200, data); }
      if (req.method === "PATCH") { Object.assign(coll, data); save(); return done(200, coll); }
      return done(405, { error: "Method not allowed" });
    }
    if (!id) {
      if (req.method === "GET") {
        const r = query(coll, u.searchParams), h = { "x-total-count": String(r.total) };
        if (r.page) { const last = Math.max(1, Math.ceil(r.total / r.limit)); const L = (n, rel) => { const q = new URLSearchParams(u.searchParams); q.set("_page", n); return `<${prefix}/${name}?${q}>; rel="${rel}"`; }; h.link = [L(1, "first"), r.page > 1 && L(r.page - 1, "prev"), r.page < last && L(r.page + 1, "next"), L(last, "last")].filter(Boolean).join(", "); }
        let items = r.items;
        const embed = u.searchParams.getAll("_embed");
        if (embed.length) { const fk = name.replace(/s$/, "") + "Id"; items = items.map((it) => { const x = { ...it }; for (const e of embed) if (Array.isArray(state.db[e])) x[e] = state.db[e].filter((c) => sameId(c[fk], it.id)); return x; }); }
        const expand = u.searchParams.getAll("_expand");
        if (expand.length) items = items.map((it) => { const x = { ...it }; for (const e of expand) { const c = state.db[e + "s"] || state.db[e]; if (Array.isArray(c)) x[e] = c.find((o) => sameId(o.id, it[e + "Id"])) || null; } return x; });
        return done(200, items, h);
      }
      if (req.method === "POST") {
        if (!data || typeof data !== "object" || Array.isArray(data)) return done(400, { error: "Body must be a JSON object" });
        if (data.id != null && coll.some((x) => sameId(x.id, data.id))) return done(409, { error: `id ${data.id} already exists` });
        const item = { id: data.id ?? nextId(coll), ...data }; coll.push(item); save();
        return done(201, item, { location: `${prefix}/${name}/${item.id}` });
      }
      return done(405, { error: "Method not allowed" });
    }
    const idx = coll.findIndex((x) => sameId(x.id, id));
    if (idx < 0) return done(404, { error: `${name}/${id} not found` });
    if (sub) { // nested: /posts/1/comments
      if (req.method !== "GET" || !Array.isArray(state.db[sub])) return done(404, { error: "Not found" });
      const fk = name.replace(/s$/, "") + "Id";
      return done(200, query(state.db[sub].filter((c) => sameId(c[fk], id)), u.searchParams).items);
    }
    if (req.method === "GET") return done(200, coll[idx]);
    if (req.method === "PUT") { coll[idx] = { ...data, id: coll[idx].id }; save(); return done(200, coll[idx]); }
    if (req.method === "PATCH") { coll[idx] = { ...coll[idx], ...data, id: coll[idx].id }; save(); return done(200, coll[idx]); }
    if (req.method === "DELETE") { const [gone] = coll.splice(idx, 1); save(); return done(200, gone); }
    return done(405, { error: "Method not allowed" });
  }
  const server = http.createServer((req, res) => handle(req, res).catch((e) => send(res, 500, { error: e.message })));
  server.state = state;
  server.reload = () => { state.db = load(opts.file); };
  return server;
}
module.exports = { load, query, createApp, nextId };
