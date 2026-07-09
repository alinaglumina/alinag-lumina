import { NextResponse, type NextRequest } from "next/server";
// Guard authenticated areas — redirect to /login when the access cookie is absent.
export function middleware(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  const isProtected = req.nextUrl.pathname.startsWith("/account") || req.nextUrl.pathname.startsWith("/admin");
  if (isProtected && !token) {
    const url = req.nextUrl.clone(); url.pathname = "/login"; url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/account/:path*", "/admin/:path*"] };
