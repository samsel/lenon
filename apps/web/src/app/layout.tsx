import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KidSafe Hermes Runtime",
  description: "Child-safe AI assistant platform with Hermes as the explicit backend runtime."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
