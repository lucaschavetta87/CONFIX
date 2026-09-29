import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { SESSION_COOKIE, tokenValido } from "@/lib/auth";
import NavLateral from "@/components/NavLateral";

export const metadata: Metadata = {
  title: "Vida y Ministerio",
  description:
    "Gestión de participantes y asignaciones de la reunión Vida y Ministerio Cristianos",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const autenticado = await tokenValido(store.get(SESSION_COOKIE)?.value);

  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <NavLateral autenticado={autenticado} />

        <div className="contenedor lg:pl-60">
          <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>

          <footer className="no-print border-t border-linea py-8 text-center text-xs text-suave">
            Vida y Ministerio Cristianos · Uso interno de la congregación
          </footer>
        </div>
      </body>
    </html>
  );
}
