import { auth0 } from "./lib/auth0";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const response = await auth0.middleware(request);
  const { pathname } = new URL(request.url);

  // Auth0 must be able to handle login, callback, and logout without a session.
  if (pathname === "/auth" || pathname.startsWith("/auth/")) {
    return response;
  }

  if (!(await auth0.getSession(request))) {
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
