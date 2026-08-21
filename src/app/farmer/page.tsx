'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Sprout, Calendar, MapPin, Scale, PlusCircle, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { generateHash, getAuthenticatedActor } from '@/lib/blockchain';

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
      
      const { data: batch, error } = await supabase.from('batches').insert([
        {
          batch_code: batchCode,
          crop_type: cropType,
          quantity_kg: parseFloat(quantity),
          harvest_date: harvestDate,
          farm_location: farmLocation,
          farmer_id: user.id,
          status: 'harvested'
        }
      ]).select('id').single();

      if (error) throw error;
      
      // Also add initial handoff
      const currentHash = generateHash({ batchCode, stage: 'harvest', location: farmLocation, quantity });
      const { error: handoffError } = await supabase.from('handoffs').insert([
        {
          batch_id: batch.id,
          actor_id: user.id,
          stage: 'harvest',
          location: farmLocation,
          notes: `Harvested ${quantity}kg of ${cropType}`,
          prev_hash: '0',
          current_hash: currentHash
        }
      ]);
      if (handoffError) throw handoffError;

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
    <div className="min-h-screen bg-green-50 p-4">
      <header className="mb-6 flex items-center bg-green-700 text-white p-4 rounded-lg shadow">
        <Sprout className="h-8 w-8 mr-3" />
        <h1 className="text-2xl font-bold">Farmer Dashboard</h1>
      </header>

      <main className="max-w-2xl mx-auto">
        {!generatedBatch ? (
          <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-green-200">
            <h2 className="text-3xl font-extrabold text-green-800 mb-6 text-center">Add New Crop</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="flex items-center text-xl font-bold text-slate-700 mb-2">
                  <Sprout className="mr-2 text-green-600 h-6 w-6" /> Crop Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tomatoes"
                  className="w-full text-2xl p-4 border-2 border-slate-300 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-200 transition-all"
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
                  className="w-full text-2xl p-4 border-2 border-slate-300 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-200 transition-all"
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
                  className="w-full text-2xl p-4 border-2 border-slate-300 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-200 transition-all"
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
                  className="w-full text-2xl p-4 border-2 border-slate-300 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-200 transition-all"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-2xl font-bold py-6 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 shadow-lg mt-8"
              >
                <PlusCircle className="mr-3 h-8 w-8" />
                {isSubmitting ? 'Saving...' : 'Save & Get QR Code'}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl shadow-lg border-2 border-green-200 text-center">
            <div className="bg-green-100 text-green-800 p-4 rounded-xl mb-6">
              <h2 className="text-3xl font-extrabold mb-2">Success!</h2>
              <p className="text-xl">Your crop has been registered.</p>
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-2xl font-bold py-4 rounded-xl flex items-center justify-center transition-all shadow"
              >
                <Printer className="mr-3 h-6 w-6" />
                Print QR Code
              </button>
              
              <button 
                onClick={resetForm}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 text-xl font-bold py-4 rounded-xl transition-all"
              >
                Add Another Crop
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
