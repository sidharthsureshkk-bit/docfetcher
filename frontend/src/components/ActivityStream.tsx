import React, { useState, useEffect } from 'react';
import { api, AuditEvent } from '../api';
import { Activity, Clock, RefreshCw, Radio } from 'lucide-react';

export const ActivityStream: React.FC<{ wsConnected: boolean; taskVersion?: number }> = ({
  wsConnected,
  taskVersion,
}) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const res = await api.get<AuditEvent[]>('/api/audit-events');
      setEvents(res.data);
    } catch (err) {
      console.error('Failed to load audit events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [taskVersion]);

  const formatTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 shadow-xs space-y-3">
      <div className="flex justify-between items-center pb-3 border-b border-slate-200/50">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium backdrop-blur-xs ${
              wsConnected
                ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/70'
                : 'bg-amber-50/80 text-amber-700 border-amber-200/70'
            }`}
          >
            <Radio className={`w-3 h-3 ${wsConnected ? 'animate-pulse' : ''}`} strokeWidth={1.5} />
            {wsConnected ? 'Live' : 'Polling'}
          </span>
          <button
            onClick={fetchEvents}
            className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-white/60 rounded-lg cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-slate-400 text-center py-6">Loading audit stream...</div>
      ) : events.length === 0 ? (
        <div className="text-xs text-slate-400 text-center py-6">No activity recorded yet.</div>
      ) : (
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {events.map((e) => (
            <div key={e.id} className="flex items-start gap-2.5 text-xs p-1.5 hover:bg-white/50 rounded-xl transition-colors">
              <div className="w-6 h-6 rounded-lg bg-indigo-50/80 text-indigo-700 border border-indigo-100/70 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-2xs">
                {e.actor_name.charAt(0)}
              </div>
              <div className="flex-1 leading-snug">
                <span className="text-slate-900 font-semibold">{e.actor_name} </span>
                <span className="text-slate-600">{e.action_text}</span>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" strokeWidth={1.5} />
                  {formatTime(e.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
