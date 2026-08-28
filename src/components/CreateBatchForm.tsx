'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CalendarDays, CheckCircle2, CircleDot, ExternalLink, Layers3, MapPin, Printer, Save, Scale, Square, Wheat } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { createBatch, type BatchRecord } from '@/lib/batchActions';
import { recordHandoff } from '@/lib/blockchain';
import { supabase } from '@/lib/supabaseClient';

const today = new Date().toISOString().slice(0, 10);
type Language = 'en' | 'hi' | 'as';
const translations = {
  en: { register: 'Register harvest', intro: 'Choose the crop and enter three details.', choose: 'What did you harvest?', other: 'Other crop', cropName: 'Crop name', cropPlaceholder: 'Example: Rice, maize, tea', weight: 'Weight in kilograms', weightPlaceholder: 'Example: 50', date: 'Harvest date', location: 'Farm or village location', locationPlaceholder: 'Example: Boragaon village', save: 'Save harvest', saving: 'Saving harvest...', saved: 'Harvest saved successfully', savedHelp: 'Keep this QR code with the batch for its journey.', print: 'Print QR code', trace: 'Open public trace', cropError: 'Choose a crop or enter its name.', weightError: 'Enter a weight greater than 0 kg.', dateError: 'Select the harvest date.', locationError: 'Enter the farm or village location.' },
  hi: { register: 'फसल दर्ज करें', intro: 'फसल चुनें और तीन जानकारी भरें।', choose: 'आपने क्या उगाया?', other: 'अन्य फसल', cropName: 'फसल का नाम', cropPlaceholder: 'उदाहरण: चावल, मक्का, चाय', weight: 'वजन किलोग्राम में', weightPlaceholder: 'उदाहरण: 50', date: 'फसल की तारीख', location: 'खेत या गांव का स्थान', locationPlaceholder: 'उदाहरण: बोरागांव', save: 'फसल सेव करें', saving: 'फसल सेव हो रही है...', saved: 'फसल सफलतापूर्वक सेव हुई', savedHelp: 'इस QR कोड को फसल के साथ रखें।', print: 'QR कोड प्रिंट करें', trace: 'सार्वजनिक जानकारी खोलें', cropError: 'फसल चुनें या उसका नाम लिखें।', weightError: '0 किलो से अधिक वजन लिखें।', dateError: 'फसल की तारीख चुनें।', locationError: 'खेत या गांव का स्थान लिखें।' },
  as: { register: 'শস্য পঞ্জীয়ন কৰক', intro: 'শস্য বাছক আৰু তিনিটা তথ্য লিখক।', choose: 'আপুনি কি খেতি কৰিছে?', other: 'অন্য শস্য', cropName: 'শস্যৰ নাম', cropPlaceholder: 'উদাহৰণ: ধান, মাকৈ, চাহ', weight: 'কিলোগ্ৰামত ওজন', weightPlaceholder: 'উদাহৰণ: ৫০', date: 'শস্য চপোৱাৰ তাৰিখ', location: 'পথাৰ বা গাঁৱৰ স্থান', locationPlaceholder: 'উদাহৰণ: বৰগাঁও', save: 'শস্য সংৰক্ষণ কৰক', saving: 'শস্য সংৰক্ষণ হৈ আছে...', saved: 'শস্য সফলভাৱে সংৰক্ষণ হ’ল', savedHelp: 'এই QR ক’ডটো শস্যৰ সৈতে ৰাখক।', print: 'QR ক’ড ছপা কৰক', trace: 'ৰাজহুৱা তথ্য খোলক', cropError: 'শস্য বাছক বা নাম লিখক।', weightError: '০ কিলোগ্ৰামতকৈ অধিক ওজন লিখক।', dateError: 'শস্য চপোৱাৰ তাৰিখ বাছক।', locationError: 'পথাৰ বা গাঁৱৰ স্থান লিখক।' },
} as const;
export function CreateBatchForm() {
  const [language, setLanguage] = useState<Language | null>(null);
  const t = translations[language ?? 'en'];
  const [cropName, setCropName] = useState(''); const [weight, setWeight] = useState(''); const [harvestDate, setHarvestDate] = useState(today); const [farmLocation, setFarmLocation] = useState(''); const [batch, setBatch] = useState<BatchRecord | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const totalWeightKg = Number(weight);
    if (!cropName.trim() || cropName === 'Other') { setError(t.cropError); return; }
    if (!Number.isFinite(totalWeightKg) || totalWeightKg <= 0) { setError(t.weightError); return; }
    if (!harvestDate) { setError(t.dateError); return; }
    if (!farmLocation.trim()) { setError(t.locationError); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in as a farmer first.');
      const created = await createBatch({ farmerId: user.id, cropName: cropName.trim(), totalWeightKg, harvestDate, farmLocation: farmLocation.trim() });
      await recordHandoff({ batchId: created.id, stage: 'harvest', location: farmLocation.trim(), notes: 'Harvest batch registered' });
      setBatch(created);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the harvest. Please try again.');
    } finally { setLoading(false); }
  }

  if (batch) return <div className="portal-surface space-y-5 p-5 text-center sm:p-8">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700"><CheckCircle2 className="h-8 w-8" /></div>
    <div><h2 className="text-2xl font-bold text-green-800">{t.saved}</h2><p className="mt-1 text-slate-600">{t.savedHelp}</p></div>
    <div className="mx-auto w-fit rounded-lg border bg-white p-3"><QRCodeSVG value={`${window.location.origin}/trace/${encodeURIComponent(batch.batch_code)}`} size={224} level="H" includeMargin /></div>
    <p className="font-mono text-xl font-bold text-slate-900">{batch.batch_code}</p>
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center"><button onClick={() => window.print()} className="portal-action inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 py-3 font-bold"><Printer className="h-5 w-5" />{t.print}</button><Link href={`/trace/${batch.batch_code}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-green-700 px-5 py-3 font-bold text-green-700"><ExternalLink className="h-5 w-5" />{t.trace}</Link></div>
  </div>;

  if (!language) return <div className="portal-surface space-y-6 p-5 sm:p-8">
    <div className="text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700"><span className="text-2xl">Aa</span></div><h2 className="text-2xl font-bold text-slate-900">Choose your preferred language</h2><p className="mt-2 text-slate-600">अपनी पसंदीदा भाषा चुनें · আপোনাৰ পছন্দৰ ভাষা বাছক</p></div>
    <div className="grid gap-3"><button type="button" onClick={() => setLanguage('en')} className="flex min-h-16 items-center justify-between rounded-xl border-2 border-slate-200 bg-white px-5 text-left text-lg font-bold text-slate-800 hover:border-green-500 hover:bg-green-50"><span>English</span><span className="text-sm font-normal text-slate-500">Continue in English</span></button><button type="button" onClick={() => setLanguage('hi')} className="flex min-h-16 items-center justify-between rounded-xl border-2 border-slate-200 bg-white px-5 text-left text-lg font-bold text-slate-800 hover:border-green-500 hover:bg-green-50"><span>हिंदी</span><span className="text-sm font-normal text-slate-500">आगे बढ़ें</span></button><button type="button" onClick={() => setLanguage('as')} className="flex min-h-16 items-center justify-between rounded-xl border-2 border-slate-200 bg-white px-5 text-left text-lg font-bold text-slate-800 hover:border-green-500 hover:bg-green-50"><span>অসমীয়া</span><span className="text-sm font-normal text-slate-500">আগলৈ যাওক</span></button></div>
  </div>;

  const crops = [{ name: 'Tomato', icon: CircleDot }, { name: 'Potato', icon: Square }, { name: 'Onion', icon: Layers3 }, { name: 'Wheat', icon: Wheat }];
  const isOtherCrop = cropName !== '' && !crops.some((crop) => crop.name === cropName);
  return <form onSubmit={handleSubmit} className="portal-surface space-y-7 p-5 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-green-100 p-2 text-green-700"><Save className="h-6 w-6" /></div><div><h2 className="text-2xl font-bold text-slate-900">{t.register}</h2><p className="mt-1 text-sm text-slate-600">{t.intro}</p></div></div><label className="flex items-center gap-2 text-sm font-semibold text-slate-700">Language<select aria-label="Language" value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="portal-field min-h-10 rounded-lg px-2"><option value="en">English</option><option value="hi">हिंदी</option><option value="as">অসমীয়া</option></select></label></div>
    {error && <div role="alert" className="flex items-start gap-3 rounded-lg border-2 border-red-300 bg-red-50 p-4 text-red-800"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p className="font-medium">{error}</p></div>}
    <fieldset><legend className="mb-3 text-base font-bold text-slate-900">{t.choose}</legend><div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{crops.map(({ name, icon: Icon }) => <button key={name} type="button" aria-pressed={cropName === name} onClick={() => { setCropName(name); setError(''); }} className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 text-center font-bold transition-colors ${cropName === name ? 'border-green-700 bg-green-50 text-green-800 ring-2 ring-green-200' : 'border-slate-200 bg-white text-slate-700 hover:border-green-400 hover:bg-green-50'}`}><Icon className="h-9 w-9" strokeWidth={1.8} /><span>{language === 'hi' ? ({ Tomato: 'टमाटर', Potato: 'आलू', Onion: 'प्याज', Wheat: 'गेहूं' }[name]) : language === 'as' ? ({ Tomato: 'বিলাহী', Potato: 'আলু', Onion: 'পিয়াঁজ', Wheat: 'ঘেঁহু' }[name]) : name}</span></button>)}<button type="button" aria-pressed={isOtherCrop} onClick={() => { setCropName('Other'); setError(''); }} className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 text-center font-bold transition-colors ${isOtherCrop ? 'border-green-700 bg-green-50 text-green-800 ring-2 ring-green-200' : 'border-slate-200 bg-white text-slate-700 hover:border-green-400 hover:bg-green-50'}`}><span className="text-3xl">+</span><span>{t.other}</span></button></div>{isOtherCrop && <div className="mt-4 space-y-2"><label htmlFor="other-crop" className="text-base font-bold text-slate-900">{t.cropName}</label><input id="other-crop" autoFocus className="portal-field min-h-14 w-full rounded-lg px-4 text-lg" placeholder={t.cropPlaceholder} value={cropName === 'Other' ? '' : cropName} onChange={(event) => { setCropName(event.target.value); setError(''); }} required /></div>}</fieldset>
    <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><label htmlFor="weight" className="flex items-center gap-2 text-base font-bold text-slate-900"><Scale className="h-5 w-5 text-green-700" />{t.weight}</label><input id="weight" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder={t.weightPlaceholder} className="portal-field min-h-14 w-full rounded-lg px-4 text-lg" value={weight} onChange={(e) => { setWeight(e.target.value); setError(''); }} required /></div><div className="space-y-2"><label htmlFor="harvest-date" className="flex items-center gap-2 text-base font-bold text-slate-900"><CalendarDays className="h-5 w-5 text-green-700" />{t.date}</label><input id="harvest-date" type="date" className="portal-field min-h-14 w-full rounded-lg px-4 text-lg" value={harvestDate} onChange={(e) => { setHarvestDate(e.target.value); setError(''); }} required /></div></div>
    <div className="space-y-2"><label htmlFor="farm-location" className="flex items-center gap-2 text-base font-bold text-slate-900"><MapPin className="h-5 w-5 text-green-700" />{t.location}</label><input id="farm-location" autoComplete="street-address" placeholder={t.locationPlaceholder} className="portal-field min-h-14 w-full rounded-lg px-4 text-lg" value={farmLocation} onChange={(e) => { setFarmLocation(e.target.value); setError(''); }} required /></div>
    <button type="submit" disabled={loading} className="portal-action inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-lg px-5 py-4 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-60">{loading ? t.saving : <><Save className="h-6 w-6" />{t.save}</>}</button>
  </form>;
}
