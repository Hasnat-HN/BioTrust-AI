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
  assert.match(html, /Load the study, inspect it automatically/);
  assert.match(html, /Open Example/);
  assert.match(html, /How it works/);
  assert.match(html, /Example/);
  assert.match(html, /Analyze your data/);
  assert.doesNotMatch(html, />Overview<|>Projects<|>Analysis plan<|>Run analysis<|>Claims<|>Provenance</);
  assert.doesNotMatch(html, /Can I trust this result\?/);
  assert.doesNotMatch(html, /Evidence profile/);
  assert.match(html, /Inspect computation boundary/i);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("emits site-specific social metadata", async () => {
  const html = await (await render()).text();
  assert.match(html, /BioTrust AI — Auditable Bioinformatics/);
  assert.match(html, /http:\/\/localhost:3000\/og\.png/);
  assert.match(html, /Load, inspect, and analyze RNA-seq count data with selectable JavaScript and browser-R methods, one worked example, and traceable interpretation\./);
});
