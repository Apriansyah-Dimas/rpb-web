import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import logoRpb from "./logorpb.svg";
import "./globals.css";

const bodyFont = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const displayFont = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RPB Estimator",
  description: "Estimator biaya RPB berbasis data Excel",
  applicationName: "RPB Estimator",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: logoRpb.src,
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: logoRpb.src,
        type: "image/svg+xml",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RPB Estimator",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#6465b9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${bodyFont.variable} ${displayFont.variable} antialiased`}>
        <RegisterServiceWorker />
        <div className="page-bg">{children}</div>
      </body>
    </html>
  );
}
