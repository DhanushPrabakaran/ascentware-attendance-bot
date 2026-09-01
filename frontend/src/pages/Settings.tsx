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
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="mt-1 text-sm text-gray-500">Configure global bot parameters and notification channels.</p>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Common Group ID (Teams Chat ID)</label>
            <p className="text-sm text-gray-500 mb-3">
              The Conversation ID where the bot should send generic Leave announcements. <br/>
              <strong className="text-gray-700">How to find it:</strong> Open Microsoft Teams in your web browser, navigate to the group chat, and look at the URL. Copy the value of the <code className="bg-gray-100 px-1 py-0.5 rounded border border-gray-200 text-gray-800 mx-1 font-mono text-xs">chatId</code> parameter (it usually starts with <code className="bg-gray-100 px-1 py-0.5 rounded border border-gray-200 text-gray-800 mx-1 font-mono text-xs">19:</code> and ends with <code className="bg-gray-100 px-1 py-0.5 rounded border border-gray-200 text-gray-800 mx-1 font-mono text-xs">@thread.v2</code>).
            </p>
            <input 
              type="text" 
              value={settings.commonGroupId || ''} 
              onChange={e => setSettings({...settings, commonGroupId: e.target.value})}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary sm:text-sm font-mono" 
              placeholder="19:xxxxxxxxx@thread.v2"
            />
          </div>

          <div className="pt-6 border-t border-gray-200 flex items-center justify-between">
            <button 
              onClick={handleSave}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary hover:bg-primaryHover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Save Changes
            </button>
            {saved && <span className="text-green-600 font-medium text-sm bg-green-50 px-3 py-1 rounded-full border border-green-200">Settings saved successfully!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
