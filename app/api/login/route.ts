import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_DURACION_SEG,
  credencialesCorrectas,
  firmarToken,
} from "@/lib/auth";

export async function POST(request: Request) {
  let body: { usuario?: unknown; password?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const usuario = typeof body.usuario === "string" ? body.usuario.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!usuario || !password) {
    return NextResponse.json(
      { error: "Ingresá usuario y contraseña" },
      { status: 400 },
    );
  }

  if (!(await credencialesCorrectas(usuario, password))) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos" },
      { status: 401 },
    );
  }

  const token = await firmarToken(usuario);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DURACION_SEG,
    path: "/",
  });
  return response;
}
