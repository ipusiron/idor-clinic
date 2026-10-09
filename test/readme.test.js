const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../js/core.js');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test("README の「このツールならではの使い方」を計算部で再計算（日英）", () => {
  const readmeJa = read("README.md");
  const readmeEn = read("README.en.md");
  const other = { status: 200, data: { ownerId: 2 } };
  const mine = { status: 200, data: { ownerId: 1 } };
  const win = core.newProgress();
  assert.equal(core.complete(win, "order", "VULN", 1, other), true);
  assert.equal(win.score, 100);
  assert.equal(core.complete(core.newProgress(), "order", "VULN", 1, mine), false);
  assert.equal(core.complete(core.newProgress(), "order", "SECURE", 1, other), false);
  assert.equal(core.complete(core.newProgress(), "order", "VULN", 1, { status: 403, data: null }), false);
  assert.equal(core.accessToken({ "x-access-token": "abc" }), "abc");
  assert.equal(core.accessToken({ "x-access-token": "a", "X-Access-Token": "b" }), null);
  for (const md of [readmeJa, readmeEn]) {
    assert.ok(md.includes("100") && md.includes("403"));
    assert.ok(md.includes("X-Access-Token"));
  }
});
