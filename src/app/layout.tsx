import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CM",
  icons: { icon: [{ url: "/cm-logo.svg", type: "image/svg+xml", sizes: "any" }] },
  description: "A fast, reusable product catalog platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
