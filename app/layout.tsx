import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: "BioTrust AI — Auditable Bioinformatics",
  description: "Choose bioinformatics analyses and methods, compare their results, and preserve an auditable evidence trail.",
  openGraph: {
    title: "BioTrust AI — Auditable Bioinformatics",
    description: "Researcher-controlled melanoma analysis with method comparison, sensitivity analysis, and traceable interpretation.",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "BioTrust AI evidence trail" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BioTrust AI — Auditable Bioinformatics",
    description: "Researcher-controlled melanoma analysis with method comparison, sensitivity analysis, and traceable interpretation.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
