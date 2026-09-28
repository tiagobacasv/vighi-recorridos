import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CAP Vighi | Recorridos",
  description: "Registro de recorridos de cadetes - CAP Vighi",
  manifest: "/recorridos/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#431866",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased font-sans`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
