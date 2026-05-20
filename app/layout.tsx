import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Configuramos la fuente Inter correctamente
const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter", // Esto es lo que faltaba para que no de error abajo
});

export const metadata: Metadata = {
  title: "CONFIX - Servicio Técnico",
  description: "Reparación especializada de celulares y electrónica en Mendoza",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}