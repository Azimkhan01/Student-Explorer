
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Providers from "@/components/providers";
import { Toaster } from "sonner";
import UseRedux from "@/hooks/useRedux";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Student Explorer",
  description: "School Management System",
};

const accessToken: string | null = null;

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <UseRedux>
          <Providers accessToken={accessToken}>
            <Toaster position="top-right" richColors />
            {children}
          </Providers>
        </UseRedux>
      </body>
    </html>
  );
}
