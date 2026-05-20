import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public assets
     * - design-system routes (no auth needed)
     * - auth routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|design-system|auth|embed).*)",
  ],
};
