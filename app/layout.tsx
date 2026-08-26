import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uplands Form Filling Process",
  description: "Digital Uplands form filling process and UHSF16.01 site induction workflow.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
