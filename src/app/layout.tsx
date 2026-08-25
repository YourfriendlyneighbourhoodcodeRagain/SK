import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SurakshaKhadya | Blockchain Food Traceability",
  description: "Blockchain-Backed Farm-to-Fork Food Safety Traceability platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

