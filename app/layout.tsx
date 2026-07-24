import type { Metadata } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://merida-beauty-studio-demo.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "MERIDA Beauty Studio | Demo web",
  description:
    "Demo conceptual para MERIDA Beauty Studio: servicios, equipo, ubicación y solicitud de turnos por WhatsApp.",
  icons: {
    icon: "/logo-merida.jpg",
    shortcut: "/logo-merida.jpg",
  },
  openGraph: {
    title: "MERIDA Beauty Studio",
    description: "Tu momento. Tu belleza. Demo web para portfolio.",
    type: "website",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "MERIDA Beauty Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MERIDA Beauty Studio",
    description: "Tu momento. Tu belleza. Demo web para portfolio.",
    images: ["/og.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
