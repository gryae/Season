'use client';

import { useState, useEffect } from 'react';
import { Activity, Plus, Search, Map, ChevronDown, Ship, Thermometer, Database, Check, Loader2, Save } from 'lucide-react';
import { meterApi, vesselApi, Meter, Vessel, MeterReading } from '@/lib/api';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function MetersPage() {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null);
  
  // Modals
  const [showNewMeter, setShowNewMeter] = useState(false);
  const [showLogReading, setShowLogReading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [mRes, vRes] = await Promise.all([meterApi.getAll(), vesselApi.getAll()]);
      setMeters(mRes);
      setVessels(vRes);
      if (mRes.length > 0 && !selectedMeter) {
        setSelectedMeter(mRes[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0a0514]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-[#120a2e] border-b border-purple-500/20">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-sky-400">Telemetry & Measures</h1>
          <p className="text-sm text-slate-400 mt-1">Monitor custom readings, trigger alarms, and schedule log reminders.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Search measures..." className="season-input pl-9 w-64" />
          </div>
          <button onClick={() => setShowNewMeter(true)} className="btn-primary">
            <Plus size={18} /> New Measure
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - List of Meters */}
        <div className="w-1/3 min-w-[350px] border-r border-purple-500/20 overflow-y-auto p-4 space-y-3 bg-[#0c061a]">
          {isLoading ? (
            <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-purple-500" /></div>
          ) : meters.length === 0 ? (
            <div className="text-center mt-10 text-slate-500 text-sm">No measures created yet.</div>
          ) : (
            meters.map(meter => {
              const latestReading = meter.readings?.[0];
              return (
                <div 
                  key={meter.id}
                  onClick={() => setSelectedMeter(meter)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedMeter?.id === meter.id ? 'border-purple-500 bg-purple-500/10' : 'border-purple-500/10 bg-white/5 hover:bg-white/10'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
                        <Activity size={14} className="text-sky-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm">{meter.name}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Ship size={10} /> {meter.vessel?.name}
                        </p>
                      </div>
                    </div>
                    {latestReading ? (
                      <div className="text-right">
                        <div className="font-bold text-sky-300 text-lg">{latestReading.value} {meter.unit}</div>
                        <div className="text-[10px] text-slate-500">{format(new Date(latestReading.timestamp), 'dd MMM, HH:mm')}</div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 text-right mt-2">No readings</div>
                    )}
                  </div>
                  
                  {/* Triggers summary */}
                  <div className="flex gap-2 mt-3">
                    {meter.lowThreshold !== null && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                        Low &lt; {meter.lowThreshold}
                      </span>
                    )}
                    {meter.highThreshold !== null && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        High &gt; {meter.highThreshold}
                      </span>
                    )}
                    {meter.reminderFrequency && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {meter.reminderFrequency} Reminder
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Content - Chart & Details */}
        <div className="flex-1 bg-[#0a0514] overflow-y-auto">
          {selectedMeter ? (
            <MeterDetails meter={selectedMeter} onLogReading={() => setShowLogReading(true)} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Select a measure to view details.
            </div>
          )}
        </div>
      </div>

      {showNewMeter && <NewMeterModal vessels={vessels} onClose={() => setShowNewMeter(false)} onSuccess={() => { setShowNewMeter(false); fetchData(); }} />}
      {showLogReading && selectedMeter && <LogReadingModal meter={selectedMeter} onClose={() => setShowLogReading(false)} onSuccess={() => { setShowLogReading(false); fetchData(); }} />}
    </div>
  );
}

// ============================================
// METER DETAILS COMPONENT
// ============================================
function MeterDetails({ meter, onLogReading }: { meter: Meter; onLogReading: () => void }) {
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    meterApi.getReadings(meter.id).then(res => {
      if (active) {
        setReadings(res);
        setLoading(false);
      }
    });
    return () => { active = false };
  }, [meter.id]);

  // Format data for Recharts
  const chartData = readings.map(r => ({
    time: format(new Date(r.timestamp), 'dd MMM HH:mm'),
    value: r.value,
  }));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">{meter.name}</h2>
          <div className="flex gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1"><Ship size={14} className="text-purple-400"/> {meter.vessel?.name}</span>
            <span className="flex items-center gap-1"><Database size={14} className="text-sky-400"/> Unit: {meter.unit}</span>
          </div>
        </div>
        <button onClick={onLogReading} className="btn-primary shadow-lg shadow-purple-500/20">
          <Plus size={16} /> Record Reading
        </button>
      </div>

      {/* Chart Section */}
      <div className="bg-[#120a2e] rounded-2xl p-6 border border-purple-500/20 shadow-xl mb-8">
        <h3 className="text-lg font-semibold text-white mb-6">Historical Data</h3>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" /></div>
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-slate-500">No data logged yet.</div>
        ) : (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#120a2e', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', color: 'white' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                
                {/* Threshold Lines */}
                {meter.highThreshold !== null && (
                  <ReferenceLine y={meter.highThreshold} label={{ position: 'top', value: 'High Trigger', fill: '#f97316', fontSize: 10 }} stroke="#f97316" strokeDasharray="3 3" />
                )}
                {meter.lowThreshold !== null && (
                  <ReferenceLine y={meter.lowThreshold} label={{ position: 'bottom', value: 'Low Trigger', fill: '#ef4444', fontSize: 10 }} stroke="#ef4444" strokeDasharray="3 3" />
                )}
                
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#a855f7" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 0 }} 
                  activeDot={{ r: 6, fill: '#fff', stroke: '#a855f7' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Settings Summary */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-[#120a2e] rounded-2xl p-5 border border-purple-500/20 shadow-xl">
          <h4 className="text-xs uppercase text-slate-400 font-semibold mb-4">Alarm Triggers</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
              <span className="text-sm text-slate-300">High Threshold</span>
              <span className="font-semibold text-orange-400">{meter.highThreshold !== null ? `${meter.highThreshold} ${meter.unit}` : 'None'}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
              <span className="text-sm text-slate-300">Low Threshold</span>
              <span className="font-semibold text-red-400">{meter.lowThreshold !== null ? `${meter.lowThreshold} ${meter.unit}` : 'None'}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-[#120a2e] rounded-2xl p-5 border border-purple-500/20 shadow-xl col-span-2">
          <h4 className="text-xs uppercase text-slate-400 font-semibold mb-4">Automation Details</h4>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-sm text-purple-200">
            <p className="mb-2"><strong>Work Order Generation:</strong> If a logged value exceeds the high threshold or drops below the low threshold, a <strong>CRITICAL CORRECTIVE Work Order</strong> will be automatically generated for the vessel.</p>
            <p><strong>Reminder Schedule:</strong> {meter.reminderFrequency ? `A reminder Work Order is automatically generated ${meter.reminderFrequency.toLowerCase()} to remind the crew to log this measure.` : 'No reminders scheduled.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// NEW METER MODAL
// ============================================
function NewMeterModal({ vessels, onClose, onSuccess }: { vessels: Vessel[]; onClose: () => void; onSuccess: () => void }) {
  const [vesselId, setVesselId] = useState(vessels[0]?.id || '');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('°C');
  const [lowThreshold, setLowThreshold] = useState('');
  const [highThreshold, setHighThreshold] = useState('');
  const [reminderFrequency, setReminderFrequency] = useState('NONE');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await meterApi.create({
        vesselId,
        name,
        unit,
        lowThreshold: lowThreshold ? parseFloat(lowThreshold) : null,
        highThreshold: highThreshold ? parseFloat(highThreshold) : null,
        reminderFrequency: reminderFrequency === 'NONE' ? null : reminderFrequency,
      });
      onSuccess();
    } catch(e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#120a2e] rounded-2xl shadow-[0_0_60px_rgba(139,92,246,0.3)] border border-purple-500/20 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-purple-500/20 bg-[#0a0514]/50">
          <h2 className="font-bold text-white text-lg">Create New Measure</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1 uppercase text-slate-400">Target Vessel</label>
            <select value={vesselId} onChange={e => setVesselId(e.target.value)} className="season-select w-full" required>
              {vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 uppercase text-slate-400">Measure Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aux Engine Temp" className="season-input" required />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 uppercase text-slate-400">Measurement Unit</label>
            <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. °C, kPa, %" className="season-input" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase text-slate-400">Low Threshold</label>
              <input type="number" value={lowThreshold} onChange={e => setLowThreshold(e.target.value)} placeholder="Optional" className="season-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase text-slate-400">High Threshold</label>
              <input type="number" value={highThreshold} onChange={e => setHighThreshold(e.target.value)} placeholder="Optional" className="season-input" />
            </div>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 mt-2">
             <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Auto-Reminder Schedule</label>
             <select value={reminderFrequency} onChange={e => setReminderFrequency(e.target.value)} className="season-select w-full text-sm">
                <option value="NONE">No Reminders</option>
                <option value="DAILY">Daily Reminder WO</option>
                <option value="WEEKLY">Weekly Reminder WO</option>
                <option value="MONTHLY">Monthly Reminder WO</option>
             </select>
             <p className="text-[10px] text-slate-500 mt-2">Automatically generates a Work Order to remind the crew to log this value.</p>
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-purple-500/20 mt-6">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={isSaving || !name || !unit} className="btn-primary flex-1 justify-center">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Create Measure'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// LOG READING MODAL
// ============================================
function LogReadingModal({ meter, onClose, onSuccess }: { meter: Meter; onClose: () => void; onSuccess: () => void }) {
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await meterApi.addReading(meter.id, { value: parseFloat(value) });
      onSuccess();
    } catch(e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#120a2e] rounded-2xl shadow-[0_0_60px_rgba(139,92,246,0.3)] border border-purple-500/20 overflow-hidden">
        <div className="p-6 text-center border-b border-purple-500/20">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 flex items-center justify-center mx-auto mb-3 border border-sky-500/30">
            <Activity size={24} className="text-sky-400" />
          </div>
          <h2 className="font-bold text-white text-lg">{meter.name}</h2>
          <p className="text-xs text-slate-400">Log a new reading</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6 relative">
            <input 
              type="number" 
              step="any"
              value={value} 
              onChange={e => setValue(e.target.value)} 
              placeholder="0.0" 
              className="season-input text-center text-3xl font-bold py-6" 
              required 
              autoFocus
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">{meter.unit}</span>
          </div>
          
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={isSaving || !value} className="btn-primary flex-1 justify-center">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
