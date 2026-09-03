import { useEffect, useState } from 'react';

export default function Settings() {
  const [settings, setSettings] = useState({ commonGroupId: '', autoReject: false });
  const [saved, setSaved] = useState(false);

  const fetchSettings = async () => {
    const res = await fetch('/api/v1/admin/settings');
    const data = await res.json();
    setSettings(data);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    await fetch('/api/v1/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-3xl font-bold text-secondary tracking-tight">Settings</h2>
        <p className="mt-2 text-sm text-secondary/60 font-medium">Configure global bot parameters and notification channels.</p>
      </div>

      <div className="bg-surface shadow-2xl shadow-background/50 rounded-xl border border-borderBase p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-secondary/80 mb-1">Common Group ID (Teams Chat ID)</label>
            <p className="text-sm text-secondary/60 mb-3">
              The Conversation ID where the bot should send generic Leave announcements. <br/>
              <strong className="text-secondary">How to find it:</strong> Open Microsoft Teams in your web browser, navigate to the group chat, and look at the URL. Copy the value of the <code className="bg-white/10 px-1 py-0.5 rounded border border-white/20 text-primary mx-1 font-mono text-xs">chatId</code> parameter (it usually starts with <code className="bg-white/10 px-1 py-0.5 rounded border border-white/20 text-primary mx-1 font-mono text-xs">19:</code> and ends with <code className="bg-white/10 px-1 py-0.5 rounded border border-white/20 text-primary mx-1 font-mono text-xs">@thread.v2</code>).
            </p>
            <input 
              type="text" 
              value={settings.commonGroupId || ''} 
              onChange={e => setSettings({...settings, commonGroupId: e.target.value})}
              className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm font-mono transition-colors" 
              placeholder="19:xxxxxxxxx@thread.v2"
            />
          </div>

          <div className="pt-6 border-t border-borderBase flex items-center justify-between">
            <button 
              onClick={handleSave}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-secondary bg-primary hover:bg-primaryHover transition-colors"
            >
              Save Changes
            </button>
            {saved && <span className="text-primary font-medium text-sm bg-primary/10 px-3 py-1 rounded-full border border-primary/20">Settings saved successfully!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
