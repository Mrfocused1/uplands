import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uplands Site Manager Hub",
  description: "Uplands site-management hub for inductions, RAMS reviews, document intelligence and daily site records.",
  icons: {
    icon: [
      { url: "/wp-content/uploads/2018/08/cropped-Uplands-Icon-1-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/wp-content/uploads/2018/08/cropped-Uplands-Icon-1-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/wp-content/uploads/2018/08/cropped-Uplands-Icon-1-180x180.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
