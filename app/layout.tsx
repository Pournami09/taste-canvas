import type { Metadata } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taste Canvas",
  description: "A spatial, connected, annotated map of taste.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        <Script src="/no-flash.js" strategy="beforeInteractive" />
      </head>
      <body className="tc-root">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
