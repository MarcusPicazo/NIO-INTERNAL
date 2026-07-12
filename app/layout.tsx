import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NIMIO LEVELS",
  description: "Plataforma privada de motivacion, puntos y recompensas para equipos NIMIO."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
