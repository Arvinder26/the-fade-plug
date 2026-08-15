import assert from "node:assert/strict";
import test from "node:test";
import { getServiceDurationSummary, getServiceSelectionSummary } from "../lib/booking-config.ts";

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
  assert.match(html, /114 Cargill Street/);
  assert.match(html, /022 302 2464/);
  assert.match(html, /Haircut \+ Beard \+ Wax/);
  assert.match(html, /45 min/);
  assert.match(html, /All Auckland/);
  assert.match(html, /\$100 minimum/);
  assert.match(html, /20% deposit/);
  assert.doesNotMatch(html, /TO CONFIRM|Approval required|selected Auckland/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("renders booking and private-management routes", async () => {
  const booking = await render("/book");
  const manage = await render("/manage");
  assert.equal(booking.status, 200);
  assert.equal(manage.status, 200);
  const bookingHtml = await booking.text();
  assert.match(bookingHtml, /Book your/);
  assert.match(bookingHtml, /Choose services/);
  assert.match(bookingHtml, /Select one or more compatible services/);
  assert.match(await manage.text(), /Manage your/);
});

test("enforces compatible multi-service duration and security headers", async () => {
  assert.deepEqual(getServiceDurationSummary(["hair-colour", "nose-wax"]), { serviceIds: ["hair-colour", "nose-wax"], durationMinutes: 55 });
  assert.equal(getServiceDurationSummary(["combo", "haircut"]), null);
  const selection = getServiceSelectionSummary([{ id: "haircut", priceCents: 4_000 }, { id: "nose-wax", priceCents: 500 }]);
  assert.equal(selection?.servicePriceCents, 4_500);
  assert.equal(selection?.durationMinutes, 55);

  const page = await render();
  const manage = await render("/manage");
  assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  assert.equal(page.headers.get("x-frame-options"), "DENY");
  assert.match(page.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.equal(manage.headers.get("cache-control"), "no-store, max-age=0");
});

test("renders completed cancellation and privacy details", async () => {
  const cancellation = await render("/cancellation-policy");
  const privacy = await render("/privacy");
  assert.equal(cancellation.status, 200);
  assert.equal(privacy.status, 200);
  assert.match(await cancellation.text(), /24-hour deadline/);
  const privacyHtml = await privacy.text();
  assert.match(privacyHtml, /90 days/);
  assert.match(privacyHtml, /seven tax years/);
});

test("serves dynamic robots and sitemap routes", async () => {
  const robots = await render("/robots.txt", "text/plain");
  const sitemap = await render("/sitemap.xml", "application/xml");
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Disallow: \/manage/);
  assert.equal(sitemap.status, 200);
  assert.match(await sitemap.text(), /<urlset/);
});
