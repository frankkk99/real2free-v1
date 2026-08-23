import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Prompt } from "next/font/google";
import AdContactModal from "@/components/AdContactModal";
import HomeBottomInfiniteFeed from "@/components/HomeBottomInfiniteFeed";
import HomeSectionPagination from "@/components/HomeSectionPagination";
import "./globals.css";
import "./home-enhancements.css";

const bodyFont = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const SITE_URL = "https://www.real2free.online";
const SITE_DESCRIPTION =
  "ค้นหาหนัง ซีรีส์ และอนิเมะ พร้อมชื่อไทย ชื่อต้นฉบับ ปี ประเภท คะแนน จำนวนตอน และข้อมูลอัปเดตล่าสุดบน REAL2FREE";
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "REAL2FREE ดูหนังออนไลน์ ซีรีส์ใหม่ และอนิเมะ",
    template: "%s | REAL2FREE",
  },
  description: SITE_DESCRIPTION,
  applicationName: "REAL2FREE",
  keywords: [
    "ดูหนังออนไลน์",
    "หนังใหม่",
    "ดูซีรีส์ออนไลน์",
    "ซีรีส์ใหม่",
    "อนิเมะ",
    "หนังพากย์ไทย",
    "หนังซับไทย",
    "REAL2FREE",
  ],
  creator: "REAL2FREE",
  publisher: "REAL2FREE",
  category: "entertainment",
  referrer: "strict-origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "th_TH",
    url: SITE_URL,
    siteName: "REAL2FREE",
    title: "REAL2FREE ดูหนังออนไลน์ ซีรีส์ใหม่ และอนิเมะ",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "REAL2FREE ดูหนังออนไลน์ ซีรีส์ใหม่ และอนิเมะ",
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.webmanifest",
  verification: googleVerification ? { google: googleVerification } : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f8fd" },
    { media: "(prefers-color-scheme: dark)", color: "#020b18" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        {children}
        <HomeSectionPagination />
        <HomeBottomInfiniteFeed />
        <AdContactModal />
      </body>
    </html>
  );
}
