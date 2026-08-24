import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../pages-dist/index.html", import.meta.url), "utf8");
const workflow = await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");

test("builds the public demonstration for the repository Pages path", async () => {
  assert.match(html, /BioTrust AI — Auditable Bioinformatics/);
  assert.match(html, /<html lang="en" data-theme="dark">/);
  assert.match(html, /\/BioTrust-AI\/assets\//);
  assert.doesNotMatch(html, /chatgpt\.site/);
  assert.ok((await stat(new URL("../pages-dist/og.png", import.meta.url))).size > 0);
});

test("publishes only the static artifact through GitHub Pages", () => {
  assert.match(workflow, /npm run build:pages/);
  assert.match(workflow, /path: pages-dist/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.doesNotMatch(workflow, /backend|docker|executions\/run/);
});
