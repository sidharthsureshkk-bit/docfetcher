import React, { useState, useEffect } from 'react';
import { api, TaskItem, UserInfo } from '../api';
import { 
  CheckCircle2, Clock, AlertTriangle, ArrowRight, 
  User, RefreshCw, Calendar, Plus, Filter, CheckSquare
} from 'lucide-react';

interface TaskBoardProps {
  taskVersion?: number;
  currentUser?: UserInfo | null;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ taskVersion, currentUser }) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Todo' | 'In Progress' | 'Done'>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [newTaskHours, setNewTaskHours] = useState(4.0);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const fetchTasksAndUsers = async () => {
    try {
      const [tRes, uRes] = await Promise.all([
        api.get<TaskItem[]>('/api/tasks'),
        api.get<UserInfo[]>('/api/users'),
      ]);
      setTasks(tRes.data);
      setTeamMembers(uRes.data);
      if (uRes.data.length > 0 && !newTaskAssignee) {
        // Default assignee to Rahul if present, else first member
        const defaultUser = uRes.data.find((m) => m.name === 'Rahul') || uRes.data[0];
        setNewTaskAssignee(defaultUser.name);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndUsers();
  }, [taskVersion]);

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as any } : t))
      );
      await api.patch(`/api/tasks/${taskId}/status`, { status: newStatus });
    } catch (err) {
      console.error('Failed to update task status:', err);
      fetchTasksAndUsers();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/api/tasks', {
        title: newTaskTitle.trim(),
        assignee_name: newTaskAssignee || 'Unassigned',
        priority: newTaskPriority,
        est_hours: newTaskHours,
        due_date: newTaskDueDate || null,
      });
      setShowAddModal(false);
      setNewTaskTitle('');
      fetchTasksAndUsers();
    } catch (err: any) {
      console.error('Failed to create task:', err);
      setError(err.response?.data?.detail || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const isEmployee = currentUser?.role === 'Employee';

  const filteredTasks = tasks.filter((t) => {
    if (isEmployee) {
      const assigned = t.assignee_name?.toLowerCase() === currentUser?.name?.toLowerCase();
      if (!assigned) return false;
    }
    return filter === 'All' ? true : t.status === filter;
  });

  const priorityColor = (p: string) => {
    switch (p) {
      case 'High':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'Medium':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const statusColor = (s?: string) => {
    switch (s) {
      case 'Done':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'In Progress':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-amber-700 bg-amber-50 border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600" strokeWidth={1.5} />
            {isEmployee ? 'My Assigned Tasks' : 'Live Task Board'}
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            {isEmployee
              ? `Action items assigned to you (${currentUser?.name || 'Rahul'}). Update your progress in real time.`
              : 'Real-time status synchronization across multi-tenant team members.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 glass-panel border border-white/80 p-1 rounded-xl text-xs shadow-xs">
            {(['All', 'Todo', 'In Progress', 'Done'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  filter === tab
                    ? 'bg-gradient-to-r from-indigo-50/90 to-violet-50/70 text-indigo-700 font-semibold border border-indigo-100/80 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {!isEmployee && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer ring-1 ring-indigo-500/30"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Task Table */}
      <div className="glass-card rounded-2xl p-5 shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" strokeWidth={1.5} />
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No tasks found in this view.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Assignee</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Est. Hours</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 text-slate-700">
                {filteredTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-900">
                      <div className="max-w-md truncate">{t.title}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-lg bg-indigo-50/80 text-indigo-700 font-bold text-[10px] flex items-center justify-center border border-indigo-100/70 shadow-2xs">
                          {t.assignee_name?.charAt(0) || 'U'}
                        </div>
                        <span className="font-medium text-slate-800">{t.assignee_name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase ${priorityColor(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">{t.est_hours}h</td>
                    <td className="py-3 px-3 text-slate-500">{t.due_date || 'No due date'}</td>
                    <td className="py-3 px-3">
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id!, e.target.value)}
                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold focus:outline-none cursor-pointer transition ${statusColor(t.status)}`}
                      >
                        <option value="Todo">Todo</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white/85 backdrop-blur-2xl border border-white/80 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900">Create New Action Item</h3>
            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Conduct security review on S3 buckets"
                  className="w-full glass-input rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Assignee</label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full glass-input rounded-xl p-2.5 text-slate-900"
                  >
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                    <option value="Unassigned">Unassigned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e: any) => setNewTaskPriority(e.target.value)}
                    className="w-full glass-input rounded-xl p-2.5 text-slate-900"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newTaskHours}
                    onChange={(e) => setNewTaskHours(parseFloat(e.target.value) || 0)}
                    className="w-full glass-input rounded-xl p-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full glass-input rounded-xl p-2.5 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 glass-button text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer ring-1 ring-indigo-500/30"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
