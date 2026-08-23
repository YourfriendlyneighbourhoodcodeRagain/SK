'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDollarSign, Package, ShoppingCart, Store, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PortalShell } from '@/components/portal-shell';
import { retailerDemoDeliveries, retailerDemoSales, retailerDemoStock, type RetailerDelivery, type StockItem, type StockStatus } from '@/lib/retailer-demo-data';

const storageKey = 'surakshakhadya-retailer-simple-v1';
const labels = { stock: 'My Stock', delivery: 'New Delivery', purchases: 'My Purchases', sales: 'My Sales', confirm: 'CONFIRM RECEIVED' };
type SavedRetailerState = { deliveries: RetailerDelivery[]; stock: StockItem[] };

function getInitialState(): SavedRetailerState {
  if (typeof window === 'undefined') return { deliveries: retailerDemoDeliveries, stock: retailerDemoStock };
  try { const saved = window.localStorage.getItem(storageKey); return saved ? JSON.parse(saved) as SavedRetailerState : { deliveries: retailerDemoDeliveries, stock: retailerDemoStock }; }
  catch { return { deliveries: retailerDemoDeliveries, stock: retailerDemoStock }; }
}

export default function RetailerDashboard() {
  const [data, setData] = useState<SavedRetailerState>(getInitialState);
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);
  const [step, setStep] = useState<'home' | 'confirm' | 'problem' | 'done'>('home');
  const [problem, setProblem] = useState('');
  const [details, setDetails] = useState<RetailerDelivery | null>(null);
  useEffect(() => { window.localStorage.setItem(storageKey, JSON.stringify(data)); }, [data]);
  const waitingDelivery = data.deliveries.find((delivery) => delivery.status === 'WAITING');
  const activeDelivery = data.deliveries.find((delivery) => delivery.id === activeDeliveryId) ?? waitingDelivery;
  const purchases = useMemo(() => data.deliveries.filter((delivery) => delivery.status !== 'WAITING'), [data.deliveries]);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const openDelivery = (delivery: RetailerDelivery) => { setActiveDeliveryId(delivery.id); setStep('confirm'); };
  const finishReceipt = () => {
    if (!activeDelivery) return;
    const receivedAt = '23 Aug 2026, 10:30';
    setData((current) => ({ deliveries: current.deliveries.map((delivery) => delivery.id === activeDelivery.id ? { ...delivery, status: 'RECEIVED', receivedAt } : delivery), stock: current.stock.map((item) => item.product === activeDelivery.product ? { ...item, quantity: item.quantity + activeDelivery.quantity, batchId: activeDelivery.batchId, status: 'AVAILABLE' } : item) }));
    setStep('done');
  };
  const reportProblem = () => {
    if (!activeDelivery || !problem) return;
    setData((current) => ({ ...current, deliveries: current.deliveries.map((delivery) => delivery.id === activeDelivery.id ? { ...delivery, status: 'ISSUE REPORTED', issue: problem } : delivery) }));
    setStep('done');
  };
  return <PortalShell title="Retailer Dashboard" description="Manage your stock and orders easily." icon={Store}>
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <HomeCard icon={Package} title={labels.stock} value={`Current items: ${data.stock.length}`} onClick={() => scrollTo('stock')} />
      <HomeCard icon={Truck} title={labels.delivery} value={waitingDelivery ? '1 waiting' : 'No new deliveries'} tone={waitingDelivery ? 'amber' : 'green'} onClick={() => waitingDelivery ? openDelivery(waitingDelivery) : scrollTo('purchases')} />
      <HomeCard icon={ShoppingCart} title={labels.purchases} value={`${purchases.length + 21} orders`} onClick={() => scrollTo('purchases')} />
      <HomeCard icon={CircleDollarSign} title={labels.sales} value="156 sales" onClick={() => scrollTo('sales')} />
    </section>
    <section className="mt-6">{waitingDelivery ? <NewDelivery delivery={waitingDelivery} onReceived={() => openDelivery(waitingDelivery)} onProblem={() => { setActiveDeliveryId(waitingDelivery.id); setProblem(''); setStep('problem'); }} /> : <NoDelivery />}</section>
    <SimpleSection id="stock" icon={Package} title={labels.stock} description="What you have in your shop."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.stock.map((item) => <StockCard key={`${item.product}-${item.batchId}`} item={item} />)}</div></SimpleSection>
    <SimpleSection id="purchases" icon={ShoppingCart} title={labels.purchases} description="Goods received from distributors."><div className="grid gap-3 md:grid-cols-2">{purchases.map((purchase) => <PurchaseCard key={purchase.id} purchase={purchase} onClick={() => setDetails(purchase)} />)}</div>{!purchases.length && <p className="rounded-xl bg-slate-50 p-5 text-center text-slate-500">Your received deliveries will appear here.</p>}</SimpleSection>
    <SimpleSection id="sales" icon={CircleDollarSign} title={labels.sales} description="Your recent sales."><div className="grid gap-3 md:grid-cols-3">{retailerDemoSales.map((sale) => <SaleCard key={sale.id} sale={sale} />)}</div></SimpleSection>
    <DeliveryFlow open={step !== 'home'} step={step} delivery={activeDelivery ?? null} problem={problem} onProblemChange={setProblem} onConfirm={finishReceipt} onReport={reportProblem} onClose={() => { setStep('home'); setActiveDeliveryId(null); setProblem(''); }} />
    <PurchaseDetails purchase={details} onClose={() => setDetails(null)} />
  </PortalShell>;
}

function HomeCard({ icon: Icon, title, value, tone = 'green', onClick }: { icon: typeof Package; title: string; value: string; tone?: 'green' | 'amber'; onClick: () => void }) {
  const colours = { green: 'bg-green-100 text-green-700', amber: 'bg-amber-100 text-amber-700' };
  return <button onClick={onClick} className="text-left"><Card className="portal-surface h-full transition-transform hover:-translate-y-0.5 hover:shadow-xl"><CardContent className="flex min-h-30 flex-col justify-between gap-3"><div className={`w-fit rounded-xl p-3 ${colours[tone]}`}><Icon className="h-6 w-6" /></div><div><p className="text-base font-bold text-slate-900 sm:text-lg">{title}</p><p className="mt-0.5 text-sm text-slate-600">{value}</p></div></CardContent></Card></button>;
}

function NewDelivery({ delivery, onReceived, onProblem }: { delivery: RetailerDelivery; onReceived: () => void; onProblem: () => void }) {
  return <Card className="border border-amber-200 bg-amber-50 shadow-lg"><CardContent className="p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="rounded-xl bg-amber-100 p-3 text-amber-700"><Truck className="h-7 w-7" /></div><div><p className="font-bold tracking-wide text-amber-800">NEW DELIVERY</p><p className="mt-1 text-lg font-bold text-slate-900">{delivery.emoji} {delivery.product} · {delivery.quantity} kg</p><p className="text-sm text-slate-600">From: {delivery.distributor}</p><p className="mt-1 text-xs text-slate-500">Batch: {delivery.batchId}</p></div></div><div className="w-full space-y-2 sm:max-w-xs"><p className="text-sm font-medium text-slate-700">Have you received this delivery?</p><Button size="lg" className="portal-action h-11 w-full text-base" onClick={onReceived}><CheckCircle2 />YES, I RECEIVED IT</Button><Button size="lg" variant="outline" className="h-11 w-full border-amber-300 bg-white text-amber-800 hover:bg-amber-100" onClick={onProblem}><AlertTriangle />THERE IS A PROBLEM</Button></div></div></CardContent></Card>;
}
function NoDelivery() { return <Card className="portal-surface"><CardContent className="flex items-center gap-3 py-5"><div className="rounded-xl bg-green-100 p-3 text-green-700"><CheckCircle2 className="h-6 w-6" /></div><div><p className="font-bold text-slate-900">No new deliveries</p><p className="text-sm text-slate-600">You are all caught up.</p></div></CardContent></Card>; }
function SimpleSection({ id, icon, title, description, children }: { id: string; icon: typeof Package; title: string; description: string; children: React.ReactNode }) { const Icon = icon; return <section id={id} className="mt-8 scroll-mt-6"><div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-green-100 p-3 text-green-700"><Icon className="h-5 w-5" /></div><div><h2 className="text-xl font-bold text-slate-900">{title}</h2><p className="text-sm text-slate-600">{description}</p></div></div>{children}</section>; }
function StockCard({ item }: { item: StockItem }) { const styles: Record<StockStatus, string> = { AVAILABLE: 'text-green-700', 'LOW STOCK': 'text-amber-700', 'OUT OF STOCK': 'text-red-700' }; const icon: Record<StockStatus, string> = { AVAILABLE: '🟢', 'LOW STOCK': '🟡', 'OUT OF STOCK': '🔴' }; return <Card className="portal-surface"><CardContent className="p-5"><p className="text-3xl" aria-hidden>{item.emoji}</p><p className="mt-3 text-lg font-bold text-slate-900">{item.product}</p><p className="mt-1 text-xl font-semibold text-slate-800">{item.quantity} kg available</p><p className="mt-2 text-xs text-slate-500">Batch {item.batchId}</p><p className={`mt-3 text-sm font-semibold ${styles[item.status]}`}>{icon[item.status]} {item.status.charAt(0) + item.status.slice(1).toLowerCase()}</p></CardContent></Card>; }
function PurchaseCard({ purchase, onClick }: { purchase: RetailerDelivery; onClick: () => void }) { const good = purchase.status === 'RECEIVED'; return <button onClick={onClick} className="text-left"><Card className="portal-surface h-full transition-transform hover:-translate-y-0.5 hover:shadow-xl"><CardContent className="flex items-center justify-between gap-3 p-5"><div><p className="text-lg font-bold text-slate-900">{purchase.emoji} {purchase.product} · {purchase.quantity} kg</p><p className="mt-1 text-sm text-slate-600">{purchase.distributor}</p><p className="mt-1 text-sm font-medium text-slate-700">₹{purchase.amount.toLocaleString('en-IN')}</p><p className="mt-2 text-xs text-slate-500">{purchase.receivedAt ?? purchase.date}</p></div><span className={`shrink-0 text-sm font-semibold ${good ? 'text-green-700' : 'text-red-700'}`}>{good ? '✓ Received' : '⚠ Reported'}</span></CardContent></Card></button>; }
function SaleCard({ sale }: { sale: typeof retailerDemoSales[number] }) { return <Card className="portal-surface"><CardContent className="p-5"><p className="text-lg font-bold text-slate-900">{sale.emoji} {sale.product}</p><p className="mt-1 text-sm text-slate-600">{sale.quantity} kg sold</p><p className="mt-2 text-lg font-semibold text-slate-800">₹{sale.amount}</p><p className="mt-1 text-xs text-slate-500">{sale.date}</p></CardContent></Card>; }

function DeliveryFlow({ open, step, delivery, problem, onProblemChange, onConfirm, onReport, onClose }: { open: boolean; step: 'home' | 'confirm' | 'problem' | 'done'; delivery: RetailerDelivery | null; problem: string; onProblemChange: (value: string) => void; onConfirm: () => void; onReport: () => void; onClose: () => void }) {
  if (!delivery) return null; const isProblem = step === 'problem'; const isDone = step === 'done';
  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}><DialogContent className="max-w-md p-6"><DialogHeader><DialogTitle className="text-xl">{isDone ? '✓ Done!' : isProblem ? 'What is wrong?' : '✓ Delivery Received'}</DialogTitle><DialogDescription>{isDone ? (problem ? 'We have informed the distributor.' : 'Your stock has been updated.') : isProblem ? 'Choose one option.' : 'Please check the delivery once.'}</DialogDescription></DialogHeader>{isDone ? <Button size="lg" className="portal-action h-11 w-full text-base" onClick={onClose}>OK</Button> : isProblem ? <div className="space-y-3">{['Quantity is wrong', 'Product is damaged', 'Wrong product', 'Other problem'].map((option) => <button key={option} onClick={() => onProblemChange(option)} className={`w-full rounded-xl border p-4 text-left text-base font-semibold ${problem === option ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{option}</button>)}<Button size="lg" variant="destructive" disabled={!problem} className="mt-2 h-11 w-full text-base" onClick={onReport}>SEND REPORT</Button></div> : <div className="space-y-5"><div className="rounded-xl bg-green-50 p-4"><p className="text-xl font-bold text-slate-900">{delivery.emoji} {delivery.product} — {delivery.quantity} kg</p><p className="mt-2 text-sm text-slate-700">Received from:</p><p className="font-semibold text-slate-900">{delivery.distributor}</p></div><Button size="lg" className="portal-action h-11 w-full text-base" onClick={onConfirm}>{labels.confirm}</Button></div>}</DialogContent></Dialog>;
}
function PurchaseDetails({ purchase, onClose }: { purchase: RetailerDelivery | null; onClose: () => void }) { if (!purchase) return null; return <Dialog open={Boolean(purchase)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-md p-6"><DialogHeader><DialogTitle className="text-xl">{purchase.emoji} {purchase.product}</DialogTitle><DialogDescription>Your purchase details</DialogDescription></DialogHeader><div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm"><Detail label="Quantity" value={`${purchase.quantity} kg`} /><Detail label="From" value={purchase.distributor} /><Detail label="Date" value={purchase.receivedAt ?? purchase.date} /><Detail label="Amount" value={`₹${purchase.amount.toLocaleString('en-IN')}`} /><Detail label="Batch ID" value={purchase.batchId} /><Detail label="Status" value={purchase.status === 'RECEIVED' ? 'Received' : 'Problem reported'} /></div></DialogContent></Dialog>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{label}</span><span className="text-right font-semibold text-slate-800">{value}</span></div>; }
