'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Sprout, Calendar, MapPin, Scale, PlusCircle, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getAuthenticatedActor } from '@/lib/blockchain';
import { PortalShell } from '@/components/portal-shell';

export default function FarmerDashboard() {
  const [cropType, setCropType] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedBatch, setGeneratedBatch] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const user = await getAuthenticatedActor();

      // Mock generation of batch code
      const batchCode = `SK-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      const { error } = await supabase.from('batches').insert([
        {
          batch_code: batchCode,
          crop_name: cropType,
          total_weight_kg: parseFloat(quantity),
          harvest_date: harvestDate,
          farm_location: farmLocation,
          farmer_id: user.id,
          status: 'harvested'
        }
      ]);

      if (error) throw error;
      
      setGeneratedBatch(batchCode);
    } catch (error) {
      console.error('Error creating batch:', error);
      alert(error instanceof Error ? error.message : 'Could not create the batch. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCropType('');
    setHarvestDate('');
    setFarmLocation('');
    setQuantity('');
    setGeneratedBatch(null);
  };

  return (
    <PortalShell title="Farmer dashboard" description="Register each harvest and create its traceability record." icon={Sprout} contentClassName="max-w-2xl">
        {!generatedBatch ? (
          <div className="portal-surface p-6 md:p-8">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">Add new harvest</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="flex items-center text-xl font-bold text-slate-700 mb-2">
                  <Sprout className="mr-2 text-green-600 h-6 w-6" /> Crop Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tomatoes"
                  className="portal-field w-full rounded-lg p-3 text-base"
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                />
              </div>

              <div>
                <label className="flex items-center text-xl font-bold text-slate-700 mb-2">
                  <Calendar className="mr-2 text-green-600 h-6 w-6" /> Harvest Date
                </label>
                <input
                  type="date"
                  required
                  className="portal-field w-full rounded-lg p-3 text-base"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                />
              </div>

              <div>
                <label className="flex items-center text-xl font-bold text-slate-700 mb-2">
                  <MapPin className="mr-2 text-green-600 h-6 w-6" /> Farm Location
                </label>
                <input
                  type="text"
                  required
                  placeholder="Village/City Name"
                  className="portal-field w-full rounded-lg p-3 text-base"
                  value={farmLocation}
                  onChange={(e) => setFarmLocation(e.target.value)}
                />
              </div>

              <div>
                <label className="flex items-center text-xl font-bold text-slate-700 mb-2">
                  <Scale className="mr-2 text-green-600 h-6 w-6" /> Total Weight (KG)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 50"
                  className="portal-field w-full rounded-lg p-3 text-base"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="portal-action mt-6 flex w-full items-center justify-center rounded-lg py-3 text-base disabled:opacity-50"
              >
                <PlusCircle className="mr-3 h-8 w-8" />
                {isSubmitting ? 'Saving...' : 'Save & Get QR Code'}
              </button>
            </form>
          </div>
        ) : (
          <div className="portal-surface p-6 text-center md:p-8">
            <div className="portal-status-success mb-6 p-4">
              <h2 className="mb-2 text-2xl font-bold">Harvest registered</h2>
              <p>Your crop has been registered.</p>
            </div>
            
            <div className="mb-8">
              <p className="text-lg text-slate-500 mb-2">Batch ID</p>
              <p className="text-4xl font-mono font-bold text-slate-900 bg-slate-100 py-3 px-6 rounded-lg inline-block">
                {generatedBatch}
              </p>
            </div>

            <div className="flex justify-center mb-8 bg-white p-4 inline-block rounded-xl border-4 border-slate-100">
              <QRCodeSVG 
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/trace/${generatedBatch}`}
                size={250} 
                level="H"
              />
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={() => window.print()}
                className="portal-action flex w-full items-center justify-center rounded-lg py-3 text-base"
              >
                <Printer className="mr-3 h-6 w-6" />
                Print QR Code
              </button>
              
              <button 
                onClick={resetForm}
                className="w-full rounded-lg border border-slate-200 bg-white py-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
              >
                Add Another Crop
              </button>
            </div>
          </div>
        )}
    </PortalShell>
  );
}
