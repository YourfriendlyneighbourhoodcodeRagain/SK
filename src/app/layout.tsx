import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

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
      <body className="antialiased">
        {children}
        
        {/* Demo Navigation Overlay for MVP Testing */}
        <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur shadow-2xl border border-slate-200 p-4 rounded-2xl z-50 hidden md:block">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">MVP Demo Portal</p>
          <div className="flex flex-col gap-2">
            <Link href="/" className="text-sm font-medium hover:text-green-600 transition-colors">🏠 Consumer Home</Link>
            <Link href="/farmer" className="text-sm font-medium hover:text-green-600 transition-colors">🚜 Farmer Dashboard</Link>
            <Link href="/aggregator" className="text-sm font-medium hover:text-green-600 transition-colors">🏢 Aggregator Hub</Link>
            <Link href="/distributor" className="text-sm font-medium hover:text-green-600 transition-colors">🚚 Distributor Logistics</Link>
            <Link href="/retailer" className="text-sm font-medium hover:text-green-600 transition-colors">🏪 Retailer Store</Link>
            <Link href="/regulator" className="text-sm font-medium hover:text-green-600 transition-colors">🛡️ Regulator Console</Link>
          </div>
        </div>
      </body>
    </html>
  );
}
