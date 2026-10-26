const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createApp, query } = require("../src");

const setup = async (extra = {}) => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ma-")), "db.json");
  fs.copyFileSync(path.join(__dirname, "../examples/db.json"), file);
  const app = createApp({ file, ...extra }); await new Promise((r) => app.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${app.address().port}${extra.prefix || ""}`;
  const f = async (p, init = {}) => { const r = await fetch(base + p, { ...init, headers: { "content-type": "application/json" }, body: init.body && JSON.stringify(init.body) }); return { status: r.status, headers: r.headers, json: await r.json().catch(() => null) }; };
  return { app, file, f, close: () => new Promise((r) => app.close(r)) };
};

test("query helpers", () => {
  const items = [{ id: 1, a: 5, n: "x" }, { id: 2, a: 9, n: "y" }, { id: 3, a: 1, n: "xy" }];
  const p = (s) => new URLSearchParams(s);
  assert.deepEqual(query(items, p("a_gte=5")).items.map((x) => x.id), [1, 2]);
  assert.deepEqual(query(items, p("_sort=-a")).items.map((x) => x.id), [2, 1, 3]);
  assert.deepEqual(query(items, p("n_like=^x")).items.map((x) => x.id), [1, 3]);
  assert.deepEqual(query(items, p("_page=2&_limit=2")).items.map((x) => x.id), [3]);
  assert.deepEqual(query(items, p("id=1&id=3")).items.map((x) => x.id), [1, 3]);
});
test("crud + persist", async () => {
  const s = await setup();
  try {
    let r = await s.f("/posts?_sort=likes&_order=desc&_limit=2"); assert.deepEqual(r.json.map((x) => x.id), [4, 1]); assert.equal(r.headers.get("x-total-count"), "4");
    r = await s.f("/posts/1?x"); assert.equal(r.json.title, "Shipping Prism AI");
    r = await s.f("/posts", { method: "POST", body: { title: "New", userId: 2 } }); assert.equal(r.status, 201); assert.equal(r.json.id, 5);
    r = await s.f("/posts/5", { method: "PATCH", body: { likes: 3 } }); assert.equal(r.json.likes, 3); assert.equal(r.json.title, "New");
    r = await s.f("/posts/5", { method: "DELETE" }); assert.equal(r.status, 200);
    r = await s.f("/posts/5"); assert.equal(r.status, 404);
    r = await s.f("/posts/1/comments"); assert.equal(r.json.length, 2);
    r = await s.f("/posts/1?_embed=comments"); assert.equal(r.status, 200);
    r = await s.f("/posts?id=1&_embed=comments&_expand=user"); assert.equal(r.json[0].comments.length, 2); assert.equal(r.json[0].user.name, "Soumya");
    r = await s.f("/profile", { method: "PATCH", body: { x: 1 } }); assert.equal(r.json.x, 1);
    r = await s.f("/nope"); assert.equal(r.status, 404);
    r = await s.f("/posts", { method: "POST", body: { id: 1 } }); assert.equal(r.status, 409);
    r = await s.f("/"); assert.equal(r.json.posts.count, 4);
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(JSON.parse(fs.readFileSync(s.file)).profile.x, 1);
  } finally { await s.close(); }
});
test("read-only + prefix", async () => {
  const s = await setup({ readOnly: true, prefix: "/api" });
  try {
    assert.equal((await s.f("/users")).json.length, 3);
    assert.equal((await s.f("/users", { method: "POST", body: { name: "x" } })).status, 403);
  } finally { await s.close(); }
});
