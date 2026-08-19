import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the BioTrust AI evidence workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /BioTrust AI/);
  assert.match(html, /Evidence before confidence\./);
  assert.match(html, /Run synthetic demonstration/);
  assert.match(html, /No demonstration results yet/);
  assert.doesNotMatch(html, /Can I trust this result\?/);
  assert.doesNotMatch(html, /Evidence profile/);
  assert.match(html, /No external AI/i);
  assert.match(html, /Claim ledger/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("emits site-specific social metadata", async () => {
  const html = await (await render()).text();
  assert.match(html, /BioTrust AI — Auditable Bioinformatics/);
  assert.match(html, /http:\/\/localhost:3000\/og\.png/);
  assert.match(html, /Don’t trust the AI\. Trust the evidence trail\./);
});
