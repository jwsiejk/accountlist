import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Use the raw URL pathname (includes basePath), not nextUrl.pathname
  const { pathname } = new URL(request.url);

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/partner-hub/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
