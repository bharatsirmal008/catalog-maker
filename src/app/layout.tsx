import type { Metadata } from "next";
import { Roboto_Condensed } from "next/font/google";
import "./globals.css";

const robotoCondensed = Roboto_Condensed({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", variable: "--font-roboto-condensed" });

export const metadata: Metadata = {
  title: "CM",
  icons: { icon: [{ url: "/cm-favicon.png", type: "image/png", sizes: "256x256" }], apple: [{ url: "/cm-apple-icon.png", sizes: "180x180", type: "image/png" }] },
  description: "A fast, reusable product catalog platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${robotoCondensed.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
