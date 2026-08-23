'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Package, Send, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PortalShell } from '@/components/portal-shell';
import { retailerDemoDeliveries, retailerDemoStock, type RetailerDelivery, type StockItem } from '@/lib/retailer-demo-data';

const retailerStorageKey = 'surakshakhadya-retailer-simple-v1';
const distributorStorageKey = 'surakshakhadya-distributor-simple-v1';
type IncomingBatch = { id: string; product: string; emoji: string; batchId: string; quantity: number; source: string };
const initialBatches: IncomingBatch[] = [
  { id: 'batch-001', product: 'Tomato', emoji: '🍅', batchId: 'SK-2026-007', quantity: 60, source: 'Maa Tara Farm' },
  { id: 'batch-002', product: 'Spinach', emoji: '🥬', batchId: 'SK-2026-008', quantity: 30, source: 'Green Valley Farm' },
  { id: 'batch-003', product: 'Potato', emoji: '🥔', batchId: 'SK-2026-005', quantity: 45, source: 'Sahyadri Farm Collective' },
];

function readRetailerState(): { deliveries: RetailerDelivery[]; stock: StockItem[] } {
  if (typeof window === 'undefined') return { deliveries: retailerDemoDeliveries, stock: retailerDemoStock };
  try { const saved = window.localStorage.getItem(retailerStorageKey); return saved ? JSON.parse(saved) as { deliveries: RetailerDelivery[]; stock: StockItem[] } : { deliveries: retailerDemoDeliveries, stock: retailerDemoStock }; }
  catch { return { deliveries: retailerDemoDeliveries, stock: retailerDemoStock }; }
}
function readBatches(): IncomingBatch[] {
  if (typeof window === 'undefined') return initialBatches;
  try { const saved = window.localStorage.getItem(distributorStorageKey); return saved ? JSON.parse(saved) as IncomingBatch[] : initialBatches; }
  catch { return initialBatches; }
}

export default function DistributorDashboard() {
  const [batches, setBatches] = useState<IncomingBatch[]>(readBatches);
  const [deliveries, setDeliveries] = useState<RetailerDelivery[]>(() => readRetailerState().deliveries);
  const [selectedBatch, setSelectedBatch] = useState<IncomingBatch | null>(null);
  const [retailer, setRetailer] = useState('FreshMart Retailer');
  const [quantity, setQuantity] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('23 Aug 2026');
  const [message, setMessage] = useState('');
  const [detail, setDetail] = useState<RetailerDelivery | null>(null);

  useEffect(() => { window.localStorage.setItem(distributorStorageKey, JSON.stringify(batches)); }, [batches]);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === retailerStorageKey) setDeliveries(readRetailerState().deliveries); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const waiting = deliveries.filter((delivery) => delivery.status === 'WAITING');
  const received = deliveries.filter((delivery) => delivery.status === 'RECEIVED');
  const activeDeliveries = deliveries.filter((delivery) => delivery.status === 'WAITING');
  const sendDelivery = () => {
    if (!selectedBatch) return;
    const sendQuantity = Number(quantity);
    if (!Number.isFinite(sendQuantity) || sendQuantity <= 0 || sendQuantity > selectedBatch.quantity) { setMessage(`Enter a quantity from 1 to ${selectedBatch.quantity} kg.`); return; }
    const newDelivery: RetailerDelivery = { id: `delivery-${Date.now()}`, product: selectedBatch.product, emoji: selectedBatch.emoji, quantity: sendQuantity, amount: sendQuantity * 50, distributor: 'FreshLink Distributors', retailer, batchId: selectedBatch.batchId, date: deliveryDate, status: 'WAITING' };
    const retailerState = readRetailerState();
    const updatedDeliveries = [newDelivery, ...retailerState.deliveries];
    window.localStorage.setItem(retailerStorageKey, JSON.stringify({ ...retailerState, deliveries: updatedDeliveries }));
    setDeliveries(updatedDeliveries);
    setBatches((current) => current.map((batch) => batch.id === selectedBatch.id ? { ...batch, quantity: batch.quantity - sendQuantity } : batch).filter((batch) => batch.quantity > 0));
    setMessage(`✓ Delivery sent: ${selectedBatch.product} — ${sendQuantity} kg to ${retailer}.`);
    setSelectedBatch(null); setQuantity('');
  };
  const summary = useMemo(() => [{ label: 'Incoming Batches', value: batches.length, icon: Package }, { label: 'Pending Deliveries', value: waiting.length, icon: Clock3 }, { label: 'In Transit', value: 0, icon: Truck }, { label: 'Completed', value: received.length, icon: CheckCircle2 }], [batches.length, received.length, waiting.length]);

  return <PortalShell title="Distributor Dashboard" description="Manage batches and send deliveries to retailers." icon={Truck}>
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">{summary.map(({ label, value, icon: Icon }) => <Card key={label} className="portal-surface" size="sm"><CardContent className="flex min-h-25 flex-col justify-between"><div className="w-fit rounded-lg bg-green-100 p-2 text-green-700"><Icon className="h-5 w-5" /></div><div><p className="text-xl font-bold text-slate-900">{value}</p><p className="text-sm text-slate-600">{label}</p></div></CardContent></Card>)}</section>
    {message && <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">{message}</div>}
    <Section title="Incoming Batches" icon={Package} description="Verified batches ready to send."><div className="grid gap-3 lg:grid-cols-3">{batches.map((batch) => <Card className="portal-surface" key={batch.id}><CardContent className="p-5"><p className="text-3xl" aria-hidden>{batch.emoji}</p><p className="mt-3 text-lg font-bold text-slate-900">{batch.product}</p><p className="mt-1 font-mono text-xs text-slate-500">{batch.batchId}</p><p className="mt-3 text-lg font-semibold text-slate-800">{batch.quantity} kg available</p><p className="mt-1 text-sm text-slate-600">From: {batch.source}</p><p className="mt-3 text-sm font-semibold text-green-700">✓ Verified</p><Button size="lg" className="portal-action mt-4 h-10 w-full" onClick={() => { setSelectedBatch(batch); setQuantity(String(batch.quantity)); setMessage(''); }}> <Send />Send to Retailer</Button></CardContent></Card>)}</div>{!batches.length && <Card className="portal-surface"><CardContent className="py-6 text-center text-slate-600">No batches are ready to send.</CardContent></Card>}</Section>
    <Section title="Active Deliveries" icon={Truck} description="Deliveries waiting for the retailer."><div className="grid gap-3 md:grid-cols-2">{activeDeliveries.map((delivery) => <DeliveryCard key={delivery.id} delivery={delivery} onClick={() => setDetail(delivery)} />)}</div>{!activeDeliveries.length && <Card className="portal-surface"><CardContent className="py-6 text-center text-slate-600">No deliveries are waiting right now.</CardContent></Card>}</Section>
    <Section title="Delivery History" icon={CheckCircle2} description="Recent deliveries to retailers."><div className="space-y-2">{deliveries.map((delivery) => <button className="w-full text-left" key={delivery.id} onClick={() => setDetail(delivery)}><Card className="portal-surface transition-transform hover:-translate-y-0.5 hover:shadow-xl"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-mono text-xs text-slate-500">{delivery.id.replace('delivery-', 'DLV-')}</p><p className="mt-1 font-semibold text-slate-900">{delivery.emoji} {delivery.product} · {delivery.quantity} kg → {delivery.retailer ?? 'FreshMart Retailer'}</p><p className="mt-1 text-xs text-slate-500">{delivery.batchId} · {delivery.date}</p></div><DeliveryStatus status={delivery.status} /></CardContent></Card></button>)}</div></Section>
    <SendDialog batch={selectedBatch} retailer={retailer} quantity={quantity} date={deliveryDate} message={message} onRetailer={setRetailer} onQuantity={setQuantity} onDate={setDeliveryDate} onClose={() => { setSelectedBatch(null); setMessage(''); }} onSend={sendDelivery} />
    <DeliveryDetails delivery={detail} onClose={() => setDetail(null)} />
  </PortalShell>;
}

function Section({ title, icon: Icon, description, children }: { title: string; icon: typeof Package; description: string; children: React.ReactNode }) { return <section className="mt-8"><div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-green-100 p-3 text-green-700"><Icon className="h-5 w-5" /></div><div><h2 className="text-xl font-bold text-slate-900">{title}</h2><p className="text-sm text-slate-600">{description}</p></div></div>{children}</section>; }
function DeliveryStatus({ status }: { status: RetailerDelivery['status'] }) { const received = status === 'RECEIVED'; const issue = status === 'ISSUE REPORTED'; return <Badge variant="outline" className={received ? 'border-green-200 bg-green-50 text-green-700' : issue ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>{received ? '✓ RECEIVED' : issue ? '⚠ ISSUE REPORTED' : 'WAITING FOR RETAILER'}</Badge>; }
function DeliveryCard({ delivery, onClick }: { delivery: RetailerDelivery; onClick: () => void }) { return <button onClick={onClick} className="text-left"><Card className="portal-surface h-full transition-transform hover:-translate-y-0.5 hover:shadow-xl"><CardContent className="flex items-center justify-between gap-3 p-5"><div><p className="text-lg font-bold text-slate-900">{delivery.emoji} {delivery.product} · {delivery.quantity} kg</p><p className="mt-1 text-sm text-slate-600">To: {delivery.retailer ?? 'FreshMart Retailer'}</p><p className="mt-1 font-mono text-xs text-slate-500">{delivery.batchId}</p></div><DeliveryStatus status={delivery.status} /></CardContent></Card></button>; }

function SendDialog({ batch, retailer, quantity, date, message, onRetailer, onQuantity, onDate, onClose, onSend }: { batch: IncomingBatch | null; retailer: string; quantity: string; date: string; message: string; onRetailer: (value: string) => void; onQuantity: (value: string) => void; onDate: (value: string) => void; onClose: () => void; onSend: () => void }) {
  if (!batch) return null; return <Dialog open={Boolean(batch)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-md p-6"><DialogHeader><DialogTitle className="text-xl">Send to Retailer</DialogTitle><DialogDescription>Choose where this batch should go.</DialogDescription></DialogHeader><div className="rounded-xl bg-green-50 p-4"><p className="text-lg font-bold text-slate-900">{batch.emoji} {batch.product}</p><p className="mt-1 text-xs text-slate-600">Batch {batch.batchId} · {batch.quantity} kg available</p></div><label className="grid gap-1 text-sm font-medium text-slate-700">Select Retailer<select value={retailer} onChange={(event) => onRetailer(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-base font-normal"><option>FreshMart Retailer</option><option>Green Basket Store</option><option>Daily Needs Market</option></select></label><label className="grid gap-1 text-sm font-medium text-slate-700">Quantity to Send (kg)<Input type="number" min="1" max={batch.quantity} value={quantity} onChange={(event) => onQuantity(event.target.value)} className="portal-field h-10 text-base" /></label><label className="grid gap-1 text-sm font-medium text-slate-700">Delivery Date<Input value={date} onChange={(event) => onDate(event.target.value)} className="portal-field h-10 text-base" /></label>{message && <p className="text-sm font-medium text-red-700">{message}</p>}<Button size="lg" className="portal-action mt-1 h-11 w-full text-base" onClick={onSend}><Send />SEND DELIVERY</Button></DialogContent></Dialog>;
}
function DeliveryDetails({ delivery, onClose }: { delivery: RetailerDelivery | null; onClose: () => void }) { if (!delivery) return null; return <Dialog open={Boolean(delivery)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-md p-6"><DialogHeader><DialogTitle className="text-xl">Delivery Details</DialogTitle><DialogDescription>Simple delivery record.</DialogDescription></DialogHeader><div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm"><Detail label="Delivery ID" value={delivery.id.replace('delivery-', 'DLV-')} /><Detail label="Product" value={`${delivery.product} · ${delivery.quantity} kg`} /><Detail label="Batch ID" value={delivery.batchId} /><Detail label="Retailer" value={delivery.retailer ?? 'FreshMart Retailer'} /><Detail label="Date" value={delivery.receivedAt ?? delivery.date} /><Detail label="Status" value={delivery.status === 'RECEIVED' ? 'Received' : delivery.status === 'ISSUE REPORTED' ? 'Issue reported' : 'Waiting for retailer'} /></div></DialogContent></Dialog>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3"><span className="text-slate-500">{label}</span><span className="text-right font-semibold text-slate-800">{value}</span></div>; }
