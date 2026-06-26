import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lenon",
  description: "A parent-governed AI companion for children, powered by isolated Hermes child agents."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
