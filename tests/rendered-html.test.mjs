import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/", accept = "text/html") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Fade Plug homepage with approved portfolio imagery", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Fade Plug/);
  assert.match(html, /Precision cuts/);
  assert.match(html, /Book your cut/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /puneet-bhardwaj-portrait\.png/);
  assert.match(html, /portfolio-skin-fade\.jpg/);
  assert.match(html, /the_fadeplug001\/reel/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("renders booking and private-management routes", async () => {
  const booking = await render("/book");
  const manage = await render("/manage");
  assert.equal(booking.status, 200);
  assert.equal(manage.status, 200);
  assert.match(await booking.text(), /Book your/);
  assert.match(await manage.text(), /Manage your/);
});

test("serves dynamic robots and sitemap routes", async () => {
  const robots = await render("/robots.txt", "text/plain");
  const sitemap = await render("/sitemap.xml", "application/xml");
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Disallow: \/manage/);
  assert.equal(sitemap.status, 200);
  assert.match(await sitemap.text(), /<urlset/);
});
