import React, { useState, useEffect } from 'react';
import { api, TaskItem, UserInfo } from '../api';
import { 
  Sparkles, CheckCircle2, ArrowRight, User, Clock, 
  Calendar, AlertCircle, Plus, Trash2, Send, Sliders, CheckSquare, RefreshCw
} from 'lucide-react';

export const MeetingToTasks: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [meetingNotes, setMeetingNotes] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState<TaskItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserInfo[]>([]);
  const [currentTasks, setCurrentTasks] = useState<TaskItem[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const sampleNotes = `Engineering Sync Notes - Nov 21
Attendees: Alice Admin, Bob Manager, Charlie Dev

Action items discussed:
1. Charlie to implement OAuth2 token revocation endpoints and verify refresh token security by Friday (urgent, est 8 hours).
2. Bob to draft Q4 engineering roadmap and review hiring budget (est 6 hours, priority high, due Nov 28).
3. Charlie needs to fix mobile overflow bug on task board (renderflex issue) before next sprint demo (est 4 hours).
4. Alice to run security audit on S3/cloud storage permissions (est 5 hours, medium priority).
5. Team to document API endpoints for mobile client release.`;

  const fetchTasksAndUsers = async () => {
    try {
      const [uRes, tRes] = await Promise.all([
        api.get<UserInfo[]>('/api/users'),
        api.get<TaskItem[]>('/api/tasks'),
      ]);
      setTeamMembers(uRes.data);
      setCurrentTasks(tRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchTasksAndUsers();
  }, []);

  const handleExtract = async () => {
    if (!meetingNotes.trim()) return;
    setExtracting(true);
    setSuccessMessage(null);
    try {
      const res = await api.post<{ tasks: TaskItem[] }>('/api/meetings/extract', {
        notes: meetingNotes,
      });
      setExtractedTasks(res.data.tasks);
    } catch (err: any) {
      alert(`Error extracting tasks: ${err.response?.data?.detail || err.message}`);
    } finally {
      setExtracting(false);
    }
  };

  const handleUpdateTask = (index: number, field: keyof TaskItem, value: any) => {
    setExtractedTasks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteTask = (index: number) => {
    setExtractedTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddTask = () => {
    setExtractedTasks((prev) => [
      ...prev,
      {
        title: 'New action item',
        assignee_name: teamMembers[0]?.name || 'Unassigned',
        priority: 'Medium',
        est_hours: 4.0,
        due_date: '2026-11-28',
      },
    ]);
  };

  const handlePublish = async () => {
    if (extractedTasks.length === 0) return;
    setPublishing(true);
    try {
      await api.post('/api/tasks/batch', { tasks: extractedTasks });
      setSuccessMessage(`Successfully committed ${extractedTasks.length} tasks to live board!`);
      setExtractedTasks([]);
      setMeetingNotes('');
      fetchTasksAndUsers();
    } catch (err: any) {
      alert(`Failed to publish tasks: ${err.response?.data?.detail || err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            Meeting to Tasks Workflow
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Convert unstructured meeting notes into structured action items with assignees, priorities, and deadlines.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-2.5 text-emerald-700 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
          <button
            onClick={() => onNavigate('tasks')}
            className="ml-auto underline hover:text-emerald-800 cursor-pointer"
          >
            View on Task Board
          </button>
        </div>
      )}

      {/* Meeting Notes Input Card */}
      <div className="glass-card rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Meeting Notes & Transcript Input</h3>
            <p className="text-[11px] text-slate-500">Paste raw sync notes or load demo sprint minutes.</p>
          </div>
          <button
            onClick={() => setMeetingNotes(sampleNotes)}
            className="text-xs text-indigo-600 hover:text-indigo-700 glass-button rounded-xl px-3 py-1.5 font-medium transition cursor-pointer"
          >
            Load Demo Notes
          </button>
        </div>

        <textarea
          value={meetingNotes}
          onChange={(e) => setMeetingNotes(e.target.value)}
          rows={5}
          placeholder="Paste meeting notes or voice transcription here... (e.g., 'Charlie to review PR #42 by Friday, Bob needs to update roadmap...')"
          className="w-full glass-input rounded-2xl p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
        />

        <div className="flex justify-end">
          <button
            onClick={handleExtract}
            disabled={!meetingNotes.trim() || extracting}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
              meetingNotes.trim() && !extracting
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-xs ring-1 ring-indigo-500/30'
                : 'bg-slate-200/70 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
            {extracting ? 'Synthesizing with Gemini AI...' : 'Extract Action Items'}
          </button>
        </div>
      </div>

      {/* Editable Extracted Task Preview Cards */}
      {extractedTasks.length > 0 && (
        <div className="glass-card border border-indigo-100/70 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200/50 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Human-in-the-Loop Review ({extractedTasks.length} Action Items)
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-50/80 text-indigo-700 border border-indigo-200/70 rounded-lg">
                  Editable Before Commit
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Review, edit assignees, priorities, or estimated hours before committing to the live task board.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddTask}
                className="px-3 py-1.5 glass-button rounded-xl text-xs font-medium text-slate-700 transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                Add Item
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer ring-1 ring-emerald-500/30"
              >
                <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                {publishing ? 'Publishing...' : 'Approve & Publish to Task Board'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {extractedTasks.map((task, idx) => (
              <div
                key={idx}
                className="glass-card-hover rounded-2xl p-4 space-y-3 transition text-xs border border-white/80 bg-white/50 backdrop-blur-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <input
                    type="text"
                    value={task.title}
                    onChange={(e) => handleUpdateTask(idx, 'title', e.target.value)}
                    className="font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full"
                  />
                  <button
                    onClick={() => handleDeleteTask(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-white transition shrink-0 cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase">
                      Assignee
                    </label>
                    <select
                      value={task.assignee_name || ''}
                      onChange={(e) => handleUpdateTask(idx, 'assignee_name', e.target.value)}
                      className="w-full mt-1 glass-input rounded-xl px-2 py-1 text-slate-800"
                    >
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                      <option value="Unassigned">Unassigned</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase">
                      Priority
                    </label>
                    <select
                      value={task.priority}
                      onChange={(e) => handleUpdateTask(idx, 'priority', e.target.value)}
                      className="w-full mt-1 glass-input rounded-xl px-2 py-1 text-slate-800"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase">
                      Est. Hours
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={task.est_hours}
                      onChange={(e) => handleUpdateTask(idx, 'est_hours', parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 glass-input rounded-xl px-2 py-1 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={task.due_date || ''}
                      onChange={(e) => handleUpdateTask(idx, 'due_date', e.target.value)}
                      className="w-full mt-1 glass-input rounded-xl px-2 py-1 text-slate-800"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Task Table */}
      <div className="glass-card rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-indigo-600" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-slate-900">Current Task Board ({currentTasks.length} Tasks)</h3>
          </div>
          <button
            onClick={() => onNavigate('tasks')}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 cursor-pointer transition"
          >
            <span>Open Task Board</span>
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-2 px-3">Title</th>
                <th className="py-2 px-3">Assignee</th>
                <th className="py-2 px-3">Priority</th>
                <th className="py-2 px-3">Hours</th>
                <th className="py-2 px-3">Due Date</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 text-slate-700">
              {currentTasks.map((t) => (
                <tr key={t.id} className="hover:bg-white/60 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-slate-900">{t.title}</td>
                  <td className="py-2.5 px-3">{t.assignee_name || 'Unassigned'}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase bg-slate-50/80 text-slate-700 border-slate-200/60">
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">{t.est_hours}h</td>
                  <td className="py-2.5 px-3 text-slate-500">{t.due_date || 'None'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                      t.status === 'Done' ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60' :
                      t.status === 'In Progress' ? 'bg-blue-50/80 text-blue-700 border-blue-200/60' :
                      'bg-amber-50/80 text-amber-700 border-amber-200/60'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
