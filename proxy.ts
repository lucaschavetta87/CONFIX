import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, tokenValido } from "./lib/auth";

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (await tokenValido(token)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/participantes/:path*", "/reunion/:path*", "/api/wol"],
};
