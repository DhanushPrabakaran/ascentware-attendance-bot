import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export default function Shifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Shift>>({
    name: '',
    startTime: '',
    endTime: ''
  });

  const fetchShifts = async () => {
    const res = await fetch('/api/v1/admin/shifts');
    setShifts(await res.json());
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/v1/admin/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    setIsModalOpen(false);
    fetchShifts();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-secondary tracking-tight">Shifts</h2>
          <p className="mt-2 text-sm text-secondary/60 font-medium">Define working hours and schedules.</p>
        </div>
        <button
          onClick={() => { setFormData({name: '', startTime: '', endTime: ''}); setIsModalOpen(true); }}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-secondary bg-primary hover:bg-primaryHover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
        >
          <Plus size={16} className="mr-2" />
          Add Shift
        </button>
      </div>

      <div className="bg-surface border border-borderBase rounded-xl overflow-hidden shadow-2xl shadow-background/50">
        <ul className="divide-y divide-borderBase">
          {shifts.map((shift) => (
            <li key={shift.id} className="p-6 hover:bg-white/5 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-secondary">{shift.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-secondary/80 bg-white/10 px-3 py-1 rounded-full border border-white/20 inline-block shadow-sm">
                    {shift.startTime} - {shift.endTime}
                  </p>
                </div>
              </div>
            </li>
          ))}
          {shifts.length === 0 && (
            <li className="p-12 text-center text-secondary/40 text-sm font-medium">No shifts defined yet.</li>
          )}
        </ul>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surfaceHover rounded-xl shadow-2xl border border-borderBase w-full max-w-md">
            <div className="p-6 border-b border-borderBase">
              <h3 className="text-xl font-bold text-secondary tracking-tight">Add Shift</h3>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-secondary/80 mb-1">Shift Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-colors" placeholder="e.g. India Morning" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-secondary/80 mb-1">Start Time</label>
                    <input required type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-secondary/80 mb-1">End Time</label>
                    <input required type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-colors" />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-borderBase">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-borderBase text-sm font-medium rounded-lg text-secondary/80 bg-surface hover:bg-white/5 hover:text-secondary transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-secondary bg-primary hover:bg-primaryHover transition-colors">Save Shift</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
