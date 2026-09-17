import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StateAI Index | US AI infrastructure and policy",
  description: "Track AI data center buildout and legislation across US states.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
