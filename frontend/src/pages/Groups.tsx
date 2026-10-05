import { useEffect, useState } from 'react';
import { Edit2, Trash2, Plus, Send } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { TeamsGroup } from '../lib/types';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataList, type DataListColumn } from '../components/ui/DataList';
import { ScheduleSettingsPanel } from '../components/ScheduleSettingsPanel';

interface FormState {
  id?: string;
  name: string;
  conversationId: string;
  isDefault: boolean;
}

const emptyForm: FormState = { name: '', conversationId: '', isDefault: false };

const inputClass =
  'block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors';

type TestState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'sent'; conversationId: string }
  | { status: 'failed'; message: string };

export default function Groups() {
  const [groups, setGroups] = useState<TeamsGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  // The conversation ID the group had when the edit modal opened - an unchanged ID
  // doesn't need re-testing, a new/changed one does.
  const [originalConversationId, setOriginalConversationId] = useState<string | null>(null);
  const [test, setTest] = useState<TestState>({ status: 'idle' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rowTest, setRowTest] = useState<Record<string, string>>({});

  const fetchGroups = async () => {
    try {
      setGroups(await api.groups.list());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load groups');
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const trimmedId = formData.conversationId.trim();
  const isTested =
    (test.status === 'sent' && test.conversationId === trimmedId) ||
    (originalConversationId !== null && originalConversationId === trimmedId);

  const openAddModal = () => {
    setFormData(emptyForm);
    setOriginalConversationId(null);
    setTest({ status: 'idle' });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (group: TeamsGroup) => {
    setFormData({
      id: group.id,
      name: group.name,
      conversationId: group.conversationId,
      isDefault: group.isDefault,
    });
    setOriginalConversationId(group.conversationId);
    setTest({ status: 'idle' });
    setError(null);
    setIsModalOpen(true);
  };

  const handleTest = async () => {
    if (!trimmedId) return;
    setTest({ status: 'sending' });
    try {
      await api.groups.test(trimmedId);
      setTest({ status: 'sent', conversationId: trimmedId });
    } catch (err) {
      setTest({
        status: 'failed',
        message: err instanceof ApiError ? err.message : 'Failed to send test message',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTested) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: formData.name.trim(),
        conversationId: trimmedId,
        isDefault: formData.isDefault,
      };
      if (formData.id) {
        await api.groups.update(formData.id, payload);
      } else {
        await api.groups.create(payload);
      }
      setIsModalOpen(false);
      await fetchGroups();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRowTest = async (group: TeamsGroup) => {
    setRowTest((s) => ({ ...s, [group.id]: 'Sending…' }));
    try {
      await api.groups.test(group.conversationId);
      setRowTest((s) => ({ ...s, [group.id]: 'Sent - check the chat' }));
      await fetchGroups();
    } catch (err) {
      setRowTest((s) => ({ ...s, [group.id]: '' }));
      setError(err instanceof ApiError ? err.message : 'Failed to send test message');
    }
  };

  const handleDelete = async (group: TeamsGroup) => {
    const assigned = group.employeeCount
      ? ` ${group.employeeCount} employee(s) assigned to it will fall back to the default groups.`
      : '';
    if (!confirm(`Delete "${group.name}"? The bot stops posting there.${assigned}`)) return;
    try {
      await api.groups.remove(group.id);
      await fetchGroups();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete group');
    }
  };

  const columns: DataListColumn<TeamsGroup>[] = [
    {
      header: 'Group',
      render: (g) => (
        <div className="min-w-0">
          <div className="text-sm font-semibold text-secondary">{g.name}</div>
          <div
            className="text-xs text-secondary/50 font-mono truncate max-w-[16rem] sm:max-w-xs"
            title={g.conversationId}
          >
            {g.conversationId}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (g) => (
        <span className="inline-flex flex-wrap gap-2">
          {g.isActive ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="danger">Bot removed</Badge>
          )}
          {g.isDefault && <Badge variant="info">Default</Badge>}
        </span>
      ),
    },
    {
      header: 'Employees',
      render: (g) => g.employeeCount ?? 0,
    },
    {
      header: 'Last tested',
      render: (g) =>
        rowTest[g.id] ? (
          <span className="text-sm text-primary">{rowTest[g.id]}</span>
        ) : g.lastTestedAt ? (
          new Date(g.lastTestedAt).toLocaleString()
        ) : (
          <span className="text-secondary/30">Never</span>
        ),
    },
    {
      header: 'Actions',
      className: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium',
      render: (g) => (
        <span className="inline-flex gap-4">
          <button
            onClick={() => handleRowTest(g)}
            title="Send test message"
            aria-label={`Send test message to ${g.name}`}
            className="text-primary hover:text-primaryHover transition-colors"
          >
            <Send size={16} />
          </button>
          <button
            onClick={() => openEditModal(g)}
            title="Edit"
            aria-label={`Edit ${g.name}`}
            className="text-primary hover:text-primaryHover transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDelete(g)}
            title="Delete"
            aria-label={`Delete ${g.name}`}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-secondary tracking-tight">Groups</h2>
          <p className="mt-2 text-sm text-secondary/60 font-medium">
            Teams chats where the bot posts check-ins, breaks, check-outs and approved leave.
            Employees post to the groups assigned on their profile, or to the{' '}
            <strong className="text-secondary/80">default</strong> groups if none are assigned.
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus size={16} />
          Add Group
        </Button>
      </div>

      {error && !isModalOpen && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20">
          {error}
        </div>
      )}

      <DataList
        columns={columns}
        rows={groups}
        rowKey={(g) => g.id}
        emptyMessage="No groups yet. Add the bot to a Teams chat, then add the group here."
      />

      <ScheduleSettingsPanel />

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={formData.id ? 'Edit Group' : 'Add Group'}
        maxWidth="max-w-lg"
      >
        {error && (
          <div className="mb-4 bg-red-500/10 text-red-400 p-3 rounded-lg border border-red-500/20 text-sm font-medium">
            {error}
          </div>
        )}
        {!formData.id && (
          <ol className="mb-5 space-y-1 text-sm text-secondary/70 list-decimal list-inside">
            <li>Add the bot to the Teams group chat. It replies with the chat's conversation ID.</li>
            <li>
              Missed it? @mention the bot with{' '}
              <code className="bg-white/10 px-1 py-0.5 rounded border border-white/20 text-primary font-mono text-xs">
                /groupid
              </code>{' '}
              in that chat.
            </li>
            <li>Paste the ID below, send a test message, check it arrived, then save.</li>
          </ol>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-secondary/80 mb-1">Name</label>
            <input
              required
              type="text"
              maxLength={100}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Engineering Team"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-secondary/80 mb-1">
              Conversation ID
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                required
                type="text"
                value={formData.conversationId}
                onChange={(e) => setFormData({ ...formData, conversationId: e.target.value })}
                placeholder="19:xxxxxxxx@thread.v2"
                className={`${inputClass} font-mono`}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleTest}
                disabled={!trimmedId || test.status === 'sending'}
                className="shrink-0"
              >
                <Send size={14} />
                {test.status === 'sending' ? 'Sending…' : 'Send test'}
              </Button>
            </div>
            <div className="mt-2 text-sm" aria-live="polite">
              {test.status === 'sent' && test.conversationId === trimmedId && (
                <span className="text-primary">
                  Test message sent. Check it appeared in the Teams chat before saving.
                </span>
              )}
              {test.status === 'failed' && <span className="text-red-400">{test.message}</span>}
              {!isTested && test.status !== 'failed' && trimmedId && (
                <span className="text-secondary/50">
                  Send a test message to this ID before saving.
                </span>
              )}
            </div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded border-borderBase bg-surfaceHover text-primary focus:ring-primary focus:ring-offset-neutral"
            />
            <span className="text-sm">
              <span className="font-medium text-secondary">Default group</span>
              <span className="block text-secondary/50">
                Employees with no groups assigned post here.
              </span>
            </span>
          </label>
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-borderBase">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isTested}>
              {isSubmitting ? 'Saving...' : formData.id ? 'Save Changes' : 'Save Group'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
