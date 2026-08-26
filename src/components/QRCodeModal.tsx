 'use client';

import Link from 'next/link';
import { QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function QRCodeModal({ batchId, open, onClose }: { batchId: string | null; open: boolean; onClose: () => void }) {
	if (!batchId) return null;
	const traceUrl = `${typeof window === 'undefined' ? '' : window.location.origin}/trace/${encodeURIComponent(batchId)}`;

	return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
		<DialogContent className="max-w-sm p-6">
			<DialogHeader>
				<DialogTitle className="flex items-center gap-2 text-xl"><QrCode className="h-5 w-5 text-green-700" />Trace this batch</DialogTitle>
				<DialogDescription>Scan this code to view the farm-to-fork journey.</DialogDescription>
			</DialogHeader>
			<div className="rounded-xl border border-green-100 bg-green-50 p-5 text-center">
				<div className="mx-auto w-fit rounded-lg bg-white p-3 shadow-sm"><QRCodeSVG value={traceUrl} size={208} bgColor="#ffffff" fgColor="#123524" includeMargin /></div>
				<p className="mt-4 font-mono text-sm font-bold text-slate-800">{batchId}</p>
			</div>
			<Button render={<Link href={`/trace/${encodeURIComponent(batchId)}`} />} className="portal-action w-full">OPEN TRACEABILITY</Button>
		</DialogContent>
	</Dialog>;
}
