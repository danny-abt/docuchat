import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocuChat — Discutez avec vos PDF",
  description: "Uploadez un PDF et posez-lui des questions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-bg text-white font-sans">{children}</body>
    </html>
  );
}
