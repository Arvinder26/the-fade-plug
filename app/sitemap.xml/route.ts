export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const pages = ["", "/book", "/cancellation-policy", "/terms", "/privacy"];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(path => `\n  <url><loc>${origin}${path}</loc></url>`).join("")}\n</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
