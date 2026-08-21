'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Leaf, ShieldCheck, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function Home() {
  const [batchId, setBatchId] = useState('');
  const router = useRouter();

  const handleTrace = (e: React.FormEvent) => {
    e.preventDefault();
    if (batchId.trim()) {
      router.push(`/trace/${batchId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-green-700 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Leaf className="h-6 w-6" />
            <span className="text-xl font-bold">SurakshaKhadya</span>
          </div>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:text-green-100 hover:bg-green-800">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="secondary" className="bg-white text-green-700 hover:bg-green-50">
                Register
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-3xl w-full space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
              Farm-to-Fork <span className="text-green-600">Food Safety</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Blockchain-backed traceability for perishables. Know exactly where your food comes from and verify its safety.
            </p>
          </div>

          <Card className="border-2 border-green-100 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-green-800">Trace Your Food</CardTitle>
              <CardDescription className="text-lg">
                Enter the Batch ID from your product packaging or scan its QR code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTrace} className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="e.g. SK-2026-X981"
                    className="pl-10 text-lg py-6"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                  />
                </div>
                <Button type="submit" size="lg" className="py-6 text-lg bg-green-600 hover:bg-green-700">
                  Trace Batch
                </Button>
                <Button type="button" variant="outline" size="lg" className="py-6 text-lg border-green-200 text-green-700 hover:bg-green-50">
                  <QrCode className="mr-2 h-5 w-5" />
                  Scan QR
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            <div className="flex flex-col items-center space-y-2">
              <div className="p-4 bg-green-100 rounded-full text-green-600">
                <Leaf className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold">100% Transparent</h3>
              <p className="text-slate-600 text-sm">See the complete journey from the farm to your local store.</p>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="p-4 bg-blue-100 rounded-full text-blue-600">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold">Lab Verified</h3>
              <p className="text-slate-600 text-sm">Check pesticide residue levels and safety certifications.</p>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="p-4 bg-amber-100 rounded-full text-amber-600">
                <QrCode className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold">Instant Access</h3>
              <p className="text-slate-600 text-sm">Simply scan the QR code to view the immutable audit trail.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center">
        <p>&copy; 2026 SurakshaKhadya. All rights reserved.</p>
      </footer>
    </div>
  );
}
