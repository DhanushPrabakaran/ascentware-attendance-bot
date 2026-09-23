import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import type { Shift } from '../lib/types';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

export default function Shifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<Shift>>({
    name: '',
    startTime: '',
    endTime: ''
  });

  const fetchShifts = async () => {
    setShifts((await api.shifts.list({ pageSize: 100 })).data);
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.shifts.create({
      name: formData.name || '',
      startTime: formData.startTime || '',
      endTime: formData.endTime || '',
    });

    setIsModalOpen(false);
    fetchShifts();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-secondary tracking-tight">Shifts</h2>
          <p className="mt-2 text-sm text-secondary/60 font-medium">Define working hours and schedules.</p>
        </div>
        <Button
          onClick={() => { setFormData({name: '', startTime: '', endTime: ''}); setIsModalOpen(true); }}
        >
          <Plus size={16} />
          Add Shift
        </Button>
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

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Shift">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-secondary/80 mb-1">Shift Name</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors" placeholder="e.g. India Morning" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-secondary/80 mb-1">Start Time</label>
              <input required type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-secondary/80 mb-1">End Time</label>
              <input required type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors" />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-borderBase">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Shift</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
