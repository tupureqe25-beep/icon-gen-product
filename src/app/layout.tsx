import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "icon-gen-promax MVP",
  description: "Conversational icon-gen-promax workflow prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
