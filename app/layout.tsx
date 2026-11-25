import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import content from "@/src/content/content.json";
import { getThemeInitScript } from "@/src/lib/theme";
import { getBootScript } from "@/src/lib/boot";
import "./globals.css";

const bricolage = localFont({
  src: "./fonts/bricolage-grotesque-latin-wght-normal.woff2",
  weight: "200 800",
  style: "normal",
  variable: "--font-bricolage",
  display: "swap",
});

const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin-wght-normal.woff2",
  weight: "200 800",
  style: "normal",
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrains = localFont({
  src: "./fonts/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  style: "normal",
  variable: "--font-jetbrains",
  display: "swap",
});

const SITE_URL =
  process.env.APP_URL && process.env.APP_URL.startsWith("http")
    ? process.env.APP_URL
    : "https://portfolio-12-pi.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: content.meta.title,
  description: content.meta.description,
  applicationName: "Heet Mehta — Portfolio",
  authors: [{ name: "Heet Mehta", url: "https://github.com/heetwave16" }],
  creator: "Heet Mehta",
  keywords: [
    "Heet Mehta",
    "heetwave16",
    "portfolio",
    "computer science student",
    "AI/ML",
    "TypeScript",
    "Next.js",
    "Pune",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: content.meta.title,
    description: content.meta.description,
    url: "/",
    siteName: "Heet Mehta",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Heet Mehta — 1st-year CS (AI/ML) student building AI developer tools, CLIs and full-stack web apps",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: content.meta.title,
    description: content.meta.description,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#210124" },
    { media: "(prefers-color-scheme: light)", color: "#E6EED6" },
  ],
  colorScheme: "dark light",
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Heet Mehta",
  url: SITE_URL,
  email: "mailto:heetmehta16@gmail.com",
  jobTitle: "Computer Science (AI/ML) undergraduate",
  address: { "@type": "PostalAddress", addressLocality: "Pune", addressCountry: "IN" },
  sameAs: ["https://github.com/heetwave16", "https://www.linkedin.com/in/heet-mehta-dev"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`dark ${bricolage.variable} ${jakarta.variable} ${jetbrains.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
        <script dangerouslySetInnerHTML={{ __html: getBootScript() }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
