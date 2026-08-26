import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uplands Form Filling Process",
  description: "Digital Uplands form filling process and UHSF16.01 site induction workflow.",
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
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
