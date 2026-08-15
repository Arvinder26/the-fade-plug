import { getRuntimeEnv } from "../../../../lib/booking-server";

export async function GET() {
  const runtime = getRuntimeEnv();
  const turnstileSiteKey = runtime.TURNSTILE_SECRET_KEY && runtime.TURNSTILE_SITE_KEY ? runtime.TURNSTILE_SITE_KEY : "";
  return Response.json({ turnstileSiteKey });
}
