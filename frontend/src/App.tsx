import React, { useState, useEffect, useRef } from 'react';
import { api, UserInfo } from './api';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { KnowledgeChat } from './components/KnowledgeChat';
import { MeetingToTasks } from './components/MeetingToTasks';
import { TaskBoard } from './components/TaskBoard';
import { DocumentsView } from './components/DocumentsView';
import { LoginModal } from './components/LoginModal';
import { ChevronRight, Radio, Bell, ChevronDown, CheckCircle2 } from 'lucide-react';

interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'assigned' | 'completed' | 'info';
}

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [taskCount, setTaskCount] = useState<number>(8);
  const [taskVersion, setTaskVersion] = useState<number>(0);
  const [showTopUserMenu, setShowTopUserMenu] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio playback blocked or unallowed
    }
  };

  const addNotification = (notif: ToastNotification) => {
    setNotifications((prev) => [notif, ...prev.slice(0, 3)]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    }, 6000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // 1. Initial Auth Check
  useEffect(() => {
    const token = localStorage.getItem('smartcorp_token');
    if (token) {
      api.get<UserInfo>('/api/auth/me')
        .then((res) => {
          setCurrentUser(res.data);
          if (res.data.role === 'Employee') {
            setCurrentPage('tasks');
          }
        })
        .catch(() => {
          localStorage.removeItem('smartcorp_token');
          handleSwitchUser('sid@acme.com');
        })
        .finally(() => setIsInitializing(false));
    } else {
      handleSwitchUser('sid@acme.com');
      setIsInitializing(false);
    }
  }, []);

  // Enforce Employee RBAC navigation
  useEffect(() => {
    if (currentUser?.role === 'Employee' && currentPage !== 'tasks' && currentPage !== 'chat') {
      setCurrentPage('tasks');
    }
  }, [currentUser, currentPage]);

  // 2. Fetch task count
  useEffect(() => {
    if (currentUser) {
      api.get<any[]>('/api/tasks')
        .then((res) => setTaskCount(res.data.length))
        .catch(() => {});
    }
  }, [currentUser, currentPage, taskVersion]);

  // 3. Real-time WebSocket connection
  useEffect(() => {
    if (!currentUser) return;

    const orgId = currentUser.org_id;
    const wsUrl = `ws://127.0.0.1:8000/ws/${orgId}`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          console.log('[WebSocket Live Event]', payload);

          if (payload.type === 'TASK_CREATED') {
            setTaskVersion((v) => v + 1);
            setTaskCount((prev) => prev + 1);

            const isTarget = currentUser.name === payload.assignee_name;
            const isAuthor = currentUser.name === payload.created_by;

            playChime();
            if (isTarget) {
              addNotification({
                id: String(Date.now()),
                title: '⚡ New Task Assigned to You!',
                message: `${payload.created_by} assigned you: "${payload.task.title}"`,
                type: 'assigned',
              });
            } else if (isAuthor) {
              addNotification({
                id: String(Date.now()),
                title: '✓ Task Created & Dispatched',
                message: `Assigned "${payload.task.title}" to ${payload.assignee_name}`,
                type: 'info',
              });
            } else {
              addNotification({
                id: String(Date.now()),
                title: '📋 New Workspace Task',
                message: `${payload.created_by} assigned "${payload.task.title}" to ${payload.assignee_name}`,
                type: 'info',
              });
            }
          } else if (payload.type === 'TASK_STATUS_UPDATED') {
            setTaskVersion((v) => v + 1);

            playChime();
            const isDone = payload.status === 'Done';
            if (isDone) {
              addNotification({
                id: String(Date.now()),
                title: `🎉 Task Completed by ${payload.updated_by}!`,
                message: `"${payload.title}" was marked as Done.`,
                type: 'completed',
              });
            } else {
              addNotification({
                id: String(Date.now()),
                title: 'Task Status Updated',
                message: `${payload.updated_by} moved "${payload.title}" to ${payload.status}`,
                type: 'info',
              });
            }
          } else if (payload.type === 'TASK_SYNC') {
            setTaskVersion((v) => v + 1);
            api.get<any[]>('/api/tasks').then((res) => setTaskCount(res.data.length)).catch(() => {});
          }
        } catch (e) {
          console.error('WS Parse Error', e);
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
      };

      socket.onerror = () => {
        setWsConnected(false);
      };

      return () => {
        socket.close();
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
    }
  }, [currentUser]);

  const handleSwitchUser = async (email: string) => {
    try {
      const password = email.startsWith('sid') || email.startsWith('admin')
        ? 'sid123'
        : email.startsWith('anush') || email.startsWith('manager')
        ? 'anush123'
        : email.startsWith('nick') || email.startsWith('hr')
        ? 'nick123'
        : 'rahul123';
      const res = await api.post('/api/auth/login', { email, password });
      const { access_token, user_id, name, email: uEmail, role, org_id, org_name } = res.data;
      localStorage.setItem('smartcorp_token', access_token);
      setCurrentUser({
        id: user_id,
        name,
        email: uEmail,
        role,
        org_id,
        org_name,
      });
      setTaskVersion((v) => v + 1);
      if (role === 'Employee') {
        setCurrentPage('tasks');
      } else {
        setCurrentPage('dashboard');
      }
    } catch (err) {
      console.error('Failed to switch user:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('smartcorp_token');
    setCurrentUser(null);
  };

  const getBreadcrumbTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Control Tower';
      case 'chat':
        return 'AI Assistant';
      case 'meeting-tasks':
        return 'Task Workflow';
      case 'tasks':
        return 'Task Board';
      case 'documents':
        return 'Knowledge Vault';
      default:
        return 'Workspace';
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-500 font-medium text-sm">
        Initializing SmartCorp AI Platform...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-transparent text-slate-800 overflow-hidden font-sans">
      {/* Real-time Floating Toast Notifications (Glass) */}
      <div className="fixed top-16 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto p-4 rounded-2xl glass-panel shadow-[0_12px_36px_rgba(15,23,42,0.08)] flex items-start gap-3 transition transform animate-in slide-in-from-top-2 duration-300 ${
              n.type === 'completed'
                ? 'border-emerald-200/80 bg-emerald-50/70 text-emerald-950'
                : n.type === 'assigned'
                ? 'border-violet-200/80 bg-violet-50/70 text-violet-950'
                : 'border-white/80 bg-white/75 text-slate-900'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-white shadow-xs ${
                n.type === 'completed'
                  ? 'bg-emerald-600/90'
                  : n.type === 'assigned'
                  ? 'bg-violet-600/90'
                  : 'bg-indigo-600/90'
              }`}
            >
              {n.type === 'completed' ? (
                <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <Bell className="w-4 h-4" strokeWidth={1.5} />
              )}
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <div className="font-semibold text-slate-900 leading-tight">{n.title}</div>
              <div className="text-slate-600 mt-0.5 text-[11px] leading-snug">{n.message}</div>
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Login Modal if unauthenticated */}
      {!currentUser && (
        <LoginModal
          onSuccess={(user) => {
            setCurrentUser(user);
            if (user.role === 'Employee') {
              setCurrentPage('tasks');
            } else {
              setCurrentPage('dashboard');
            }
          }}
        />
      )}

      {/* Fixed Frosted Left Sidebar (244px) */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        taskCount={taskCount}
      />

      {/* Main Area with Frosted Glass Top Bar */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Frosted Glass Top Bar */}
        <header className="h-14 bg-white/65 backdrop-blur-xl border-b border-white/60 px-8 flex items-center justify-between shrink-0 z-20 shadow-xs">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="text-slate-400">Workspace</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" strokeWidth={1.5} />
            <span className="text-slate-900 font-semibold">{getBreadcrumbTitle()}</span>
          </div>

          {/* Right Status & Profile Controls */}
          <div className="flex items-center gap-4">
            {/* Live-status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border glass-badge ${
                wsConnected
                  ? 'bg-emerald-50/70 text-emerald-700 border-emerald-200/60'
                  : 'bg-amber-50/70 text-amber-700 border-amber-200/60'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              ></span>
              <span>{wsConnected ? 'Live Sync' : 'Connecting'}</span>
            </div>

            <div className="h-4 w-[1px] bg-slate-200/70"></div>

            {/* User Avatar & Active Role Switcher Dropdown */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setShowTopUserMenu(!showTopUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/90 bg-white/60 backdrop-blur-md border border-white/80 shadow-xs transition cursor-pointer"
                  title="Click to Switch Demo Role"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-100/80 border border-indigo-200/70 text-indigo-700 font-semibold text-xs flex items-center justify-center">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-left text-xs">
                    <div className="font-semibold text-slate-800 leading-tight flex items-center gap-1.5">
                      <span>{currentUser.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded border border-slate-200/60 bg-white/70 font-medium text-slate-500">
                        {currentUser.role}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                </button>

                {showTopUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 glass-panel rounded-2xl shadow-xl p-1.5 text-xs space-y-1 z-50 animate-in fade-in">
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Switch Active Role
                    </div>
                    {[
                      { name: 'Sid', role: 'Admin', email: 'sid@acme.com' },
                      { name: 'Anush', role: 'Manager', email: 'anush@acme.com' },
                      { name: 'Nick', role: 'HR', email: 'nick@acme.com' },
                      { name: 'Rahul', role: 'Employee', email: 'rahul@acme.com' },
                    ].map((u) => (
                      <button
                        key={u.email}
                        onClick={() => {
                          handleSwitchUser(u.email);
                          setShowTopUserMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition cursor-pointer ${
                          currentUser.email === u.email
                            ? 'bg-indigo-50/80 text-indigo-700 font-semibold border border-indigo-100/60 shadow-xs'
                            : 'hover:bg-white/70 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-slate-100/80 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                            {u.name.charAt(0)}
                          </div>
                          <span>{u.name}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200/60 uppercase text-slate-500 font-medium">
                          {u.role}
                        </span>
                      </button>
                    ))}
                    <div className="border-t border-slate-100/70 my-1"></div>
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowTopUserMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-rose-600 hover:bg-rose-50/70 rounded-xl flex items-center gap-1.5 font-medium cursor-pointer"
                    >
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Page Content with ambient light */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {currentPage === 'dashboard' && (
              <Dashboard
                onNavigate={setCurrentPage}
                wsConnected={wsConnected}
                currentUser={currentUser}
                taskVersion={taskVersion}
              />
            )}

            {currentPage === 'chat' && <KnowledgeChat onNavigate={setCurrentPage} />}

            {currentPage === 'meeting-tasks' && <MeetingToTasks onNavigate={setCurrentPage} />}

            {currentPage === 'tasks' && (
              <TaskBoard taskVersion={taskVersion} currentUser={currentUser} />
            )}

            {currentPage === 'documents' && <DocumentsView onNavigate={setCurrentPage} />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
