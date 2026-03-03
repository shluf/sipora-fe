import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QpeProvider } from "@/contexts/QpeContext";
import { LongsorProvider } from "@/contexts/LongsorContext";
import { ValidationProvider } from "@/contexts/ValidationContext";
import Sidebar from "@/components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SIPORA QPE - BMKG DIY",
  description:
    "Dashboard pemantauan curah hujan operasional berbasis Machine Learning - data radar C-Band BMKG, resolusi 10 menit, cakupan Daerah Istimewa Yogyakarta.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`} style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        <QpeProvider>
          <LongsorProvider>
            <ValidationProvider>
              <div style={{ display: "flex", minHeight: "100vh" }}>
                <Sidebar />
                <div style={{ flex: 1, width: "100%", overflowX: "hidden" }}>
                  {children}
                </div>
              </div>
            </ValidationProvider>
          </LongsorProvider>
        </QpeProvider>
      </body>
    </html>
  );
}
