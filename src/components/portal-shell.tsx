import Link from 'next/link';
import { History, Leaf, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { SignOutButton } from '@/components/SignOutButton';

type PortalShellProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  contentClassName?: string;
  showWorkspaceLink?: boolean;
  onHistoryClick?: () => void;
};

export const portalSurfaceClass = 'rounded-xl border border-green-100 bg-white shadow-lg';
export const portalInputClass = 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-green-500 focus-visible:ring-green-200';
export const portalPrimaryButtonClass = 'bg-green-700 font-semibold text-white hover:bg-green-800';

export function PortalShell({ title, description, icon: Icon, children, contentClassName = '', showWorkspaceLink = true, onHistoryClick }: PortalShellProps) {
  return (
    <div className="flex h-screen min-h-screen flex-col overflow-y-auto bg-slate-50">
      <header className="bg-green-700 p-4 text-white shadow-md">
        <div className="container mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90" aria-label="SurakshaKhadya home">
            <Leaf className="h-6 w-6" />
            <span className="text-xl font-bold">SurakshaKhadya</span>
          </Link>
          <div className="flex items-center gap-2">
            {onHistoryClick && <button onClick={onHistoryClick} className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium hover:bg-green-800">
              <History className="h-4 w-4" />
              History
            </button>}
            {showWorkspaceLink && <Link href="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-green-800">
              My workspace
            </Link>}
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className={`container mx-auto w-full max-w-6xl flex-1 p-4 py-8 md:px-6 ${contentClassName}`}>
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-green-100 p-3 text-green-700"><Icon className="h-7 w-7" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              <p className="mt-1 text-slate-600">{description}</p>
            </div>
          </div>
        </div>
        {children}
      </main>

      <footer className="bg-slate-900 py-6 text-center text-sm text-slate-400">
        © 2026 SurakshaKhadya. Food safety, from farm to fork.
      </footer>
    </div>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="bg-green-700 p-4 text-white shadow-md">
        <div className="container mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2" aria-label="SurakshaKhadya home"><Leaf className="h-6 w-6" /><span className="text-xl font-bold">SurakshaKhadya</span></Link>
          <Link href="/" className="text-sm font-medium hover:text-green-100">Consumer home</Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4 py-10">{children}</main>
      <footer className="bg-slate-900 py-6 text-center text-sm text-slate-400">© 2026 SurakshaKhadya. Food safety, from farm to fork.</footer>
    </div>
  );
}
