import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luxichic",
  description: "Hair, tools and salon services",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
