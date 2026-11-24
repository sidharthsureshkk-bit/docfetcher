import React, { useState, useEffect } from 'react';
import { api, DashboardSummary, TaskItem, UserInfo } from '../api';
import { ActivityStream } from './ActivityStream';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  CheckCircle, Clock, FileText, Users, Sliders, 
  ArrowRight, RefreshCw, Sparkles, CheckSquare
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: string) => void;
  wsConnected: boolean;
  currentUser?: UserInfo | null;
  taskVersion?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  wsConnected,
  currentUser,
  taskVersion,
}) => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [recentTasks, setRecentTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [shiftHours, setShiftHours] = useState<number>(0);
  const [sourceUser, setSourceUser] = useState<string>('');
  const [targetUser, setTargetUser] = useState<string>('');

  const fetchDashboardData = async () => {
    try {
      const [sumRes, tasksRes] = await Promise.all([
        api.get<DashboardSummary>('/api/dashboard/summary'),
        api.get<TaskItem[]>('/api/tasks'),
      ]);
      setData(sumRes.data);
      setRecentTasks(tasksRes.data.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [taskVersion]);

  useEffect(() => {
    if (data?.workload && data.workload.length >= 2) {
      if (!sourceUser) setSourceUser(data.workload[0].name);
      if (!targetUser) setTargetUser(data.workload[1].name);
    }
  }, [data]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-600" />
        Loading workspace dashboard...
      </div>
    );
  }

  // Workload Rebalancing Simulation (Algorithm 2)
  const origA = data.workload.find((u) => u.name === sourceUser)?.hours || 0;
  const origB = data.workload.find((u) => u.name === targetUser)?.hours || 0;
  const newA = Math.max(0, origA - shiftHours);
  const newB = origB + shiftHours;

  const baselineDays = Math.ceil(Math.max(origA, origB) / 8);
  const simulatedDays = Math.ceil(Math.max(newA, newB) / 8);
  const daysSaved = Math.max(0, baselineDays - simulatedDays);

  const chartData = data.workload.map((u) => {
    const shortName = u.name.split(' ')[0];
    if (u.name === sourceUser) {
      return {
        name: shortName,
        'Current': u.hours,
        'Simulated': newA,
      };
    }
    if (u.name === targetUser) {
      return {
        name: shortName,
        'Current': u.hours,
        'Simulated': newB,
      };
    }
    return {
      name: shortName,
      'Current': u.hours,
      'Simulated': u.hours,
    };
  });

  const priorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const statusBadgeStyle = (status?: string) => {
    switch (status) {
      case 'Done':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Good morning, {currentUser?.name?.split(' ')[0] || 'Sid'} 👋
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Thursday, Nov 21 • Q4 Sprint 4 — Unified organizational intelligence and live workload telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('meeting-tasks')}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ring-1 ring-indigo-500/30"
          >
            <Sliders className="w-3.5 h-3.5" strokeWidth={1.5} />
            Meeting to Tasks
          </button>
          <button
            onClick={() => onNavigate('chat')}
            className="px-3.5 py-2 glass-button text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.5} />
            Ask Assistant
          </button>
        </div>
      </div>

      {/* Responsive Four-Card KPI Row with Pastel Icon Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Tasks (Pastel Blue) */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Tasks
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50/80 text-blue-600 border border-blue-100/70 shadow-2xs flex items-center justify-center">
              <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{data.kpis.total_tasks}</div>
            <div className="text-xs text-slate-500 mt-1">
              <span className="text-emerald-600 font-semibold">{data.kpis.completed_tasks} completed</span> ({Math.round((data.kpis.completed_tasks / (data.kpis.total_tasks || 1)) * 100)}%)
            </div>
          </div>
        </div>

        {/* KPI 2: Active Workload (Pastel Violet) */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Workload
            </span>
            <div className="w-9 h-9 rounded-xl bg-violet-50/80 text-violet-600 border border-violet-100/70 shadow-2xs flex items-center justify-center">
              <Clock className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{data.kpis.total_workload_hours}h</div>
            <div className="text-xs text-slate-500 mt-1">
              <span className="text-amber-600 font-semibold">{data.kpis.pending_tasks} work items</span> in backlog
            </div>
          </div>
        </div>

        {/* KPI 3: Indexed Documents (Pastel Orange/Amber) */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Knowledge Documents
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50/80 text-amber-600 border border-amber-100/70 shadow-2xs flex items-center justify-center">
              <FileText className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{data.kpis.total_documents}</div>
            <div className="text-xs text-slate-500 mt-1">
              Grounded in local ChromaDB
            </div>
          </div>
        </div>

        {/* KPI 4: Team Capacity (Pastel Green/Emerald) */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Team Capacity
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50/80 text-emerald-600 border border-emerald-100/70 shadow-2xs flex items-center justify-center">
              <Users className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{data.kpis.team_size}</div>
            <div className="text-xs text-slate-500 mt-1">
              Multi-tenant role isolated
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Dashboard: Larger Workload & Status Cards + Narrower Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Workload & Status Breakdown Cards (8 cols / ~65%) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Workload BarChart */}
            <div className="md:col-span-7 glass-card rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Team Workload Distribution</h3>
                <p className="text-[11px] text-slate-500">Active assigned workload hours per team member</p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '12px', boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.08)' }}
                      labelStyle={{ color: '#0f172a', fontWeight: 'bold', fontSize: '11px' }}
                      itemStyle={{ fontSize: '11px' }}
                    />
                    {shiftHours > 0 ? (
                      <>
                        <Bar dataKey="Current" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Simulated" fill="#6366f1" radius={[6, 6, 0, 0]} />
                      </>
                    ) : (
                      <Bar dataKey="Current" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Task Status Donut Chart */}
            <div className="md:col-span-5 glass-card rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Task Status Breakdown</h3>
                <p className="text-[11px] text-slate-500">Real-time status synchronization</p>
              </div>

              <div className="h-56 w-full my-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.status_distribution}
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {data.status_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '12px', boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.08)' }}
                      itemStyle={{ fontSize: '11px' }}
                    />
                    <Legend verticalAlign="bottom" height={32} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Executive "What-If" Workload Simulator Card */}
          <div className="glass-card rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/50 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50/80 text-indigo-600 border border-indigo-100/70 shadow-2xs flex items-center justify-center">
                  <Sliders className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Executive "What-If" Workload Simulator
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Interactive rebalancing model (Algorithm 2) — Client-side simulation, zero DB side effects
                  </p>
                </div>
              </div>
              {shiftHours > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50/80 text-emerald-700 border border-emerald-200/70 flex items-center gap-1 shadow-2xs">
                    <Sparkles className="w-3 h-3" strokeWidth={1.5} />
                    {daysSaved > 0 ? `Saves ${daysSaved} ${daysSaved === 1 ? 'day' : 'days'}` : 'Schedule neutral'}
                  </span>
                  <button
                    onClick={() => setShiftHours(0)}
                    className="text-[11px] text-slate-500 hover:text-slate-700 underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400">Baseline Workload</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center text-xs">
              <div className="sm:col-span-4 flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">Transfer from:</span>
                <select
                  value={sourceUser}
                  onChange={(e) => {
                    setSourceUser(e.target.value);
                    setShiftHours(0);
                  }}
                  className="w-full glass-input rounded-xl px-2.5 py-1.5 text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  {data.workload.map((u) => (
                    <option key={u.name} value={u.name}>
                      {u.name} ({u.hours}h)
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4 flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">To:</span>
                <select
                  value={targetUser}
                  onChange={(e) => {
                    setTargetUser(e.target.value);
                    setShiftHours(0);
                  }}
                  className="w-full glass-input rounded-xl px-2.5 py-1.5 text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  {data.workload
                    .filter((u) => u.name !== sourceUser)
                    .map((u) => (
                      <option key={u.name} value={u.name}>
                        {u.name} ({u.hours}h)
                      </option>
                    ))}
                </select>
              </div>

              <div className="sm:col-span-4 flex items-center gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Shift Hours:</span>
                    <span className="font-bold text-indigo-600 font-mono">{shiftHours}h</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.min(30, origA)}
                    value={shiftHours}
                    onChange={(e) => setShiftHours(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200/80 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Narrower Recent Activity Feed (4 cols / ~35%) */}
        <div className="lg:col-span-4">
          <ActivityStream wsConnected={wsConnected} taskVersion={taskVersion} />
        </div>
      </div>

      {/* Full-Width Task Table */}
      <div className="glass-card rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 mb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-indigo-600" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-slate-900">Workspace Tasks Overview</h3>
          </div>
          <button
            onClick={() => onNavigate('tasks')}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 cursor-pointer transition"
          >
            <span>View Full Task Board</span>
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Task Title</th>
                <th className="py-2.5 px-3">Assignee</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Est. Hours</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 text-slate-700">
              {recentTasks.map((t) => (
                <tr key={t.id} className="hover:bg-white/60 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-slate-900">{t.title}</td>
                  <td className="py-2.5 px-3">{t.assignee_name || 'Unassigned'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase ${priorityBadgeStyle(t.priority)}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">{t.est_hours}h</td>
                  <td className="py-2.5 px-3 text-slate-500">{t.due_date || 'No due date'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${statusBadgeStyle(t.status)}`}>
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
