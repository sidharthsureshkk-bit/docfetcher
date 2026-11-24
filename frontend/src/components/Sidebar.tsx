import React from 'react';
import { UserInfo } from '../api';
import { 
  LayoutDashboard, MessageSquareText, Sliders, CheckSquare, 
  FileText, LogOut, ChevronDown, Sparkles, HelpCircle, 
  UserCheck, Shield, ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  currentUser: UserInfo | null;
  onSwitchUser: (email: string) => void;
  onLogout: () => void;
  taskCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  currentUser,
  onSwitchUser,
  onLogout,
  taskCount = 8,
}) => {
  const [showOrgMenu, setShowOrgMenu] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const role = currentUser?.role || 'Employee';
  const isEmployee = role === 'Employee';
  const canAccessControlTower = role === 'Admin' || role === 'Manager';
  const canAccessMeetingWorkflow = role === 'Admin' || role === 'Manager';
  const canAccessDocuments = role === 'Admin' || role === 'HR';

  const roleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-violet-50/80 text-violet-700 border-violet-200/60';
      case 'Manager':
        return 'bg-blue-50/80 text-blue-700 border-blue-200/60';
      case 'HR':
        return 'bg-amber-50/80 text-amber-700 border-amber-200/60';
      default:
        return 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60';
    }
  };

  return (
    <aside className="w-[244px] min-w-[244px] bg-white/70 backdrop-blur-xl border-r border-white/60 shadow-[1px_0_15px_-3px_rgba(0,0,0,0.03)] flex flex-col justify-between h-screen sticky top-0 select-none z-30">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-500/20 ring-1 ring-white/40">
              SC
            </div>
            <div>
              <div className="font-semibold text-slate-900 tracking-tight text-sm leading-tight">
                SmartCorp AI
              </div>
              <div className="text-[11px] text-slate-500 font-medium">Enterprise Suite</div>
            </div>
          </div>
        </div>

        {/* Workspace Switcher */}
        <div className="p-3 border-b border-slate-200/50">
          <button
            onClick={() => setShowOrgMenu(!showOrgMenu)}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-white/50 backdrop-blur-md border border-white/80 hover:bg-white/80 hover:border-indigo-200/60 transition shadow-xs text-left cursor-pointer"
          >
            <div className="truncate pr-1">
              <div className="text-xs font-semibold text-slate-800 truncate">
                {currentUser?.org_name || 'Acme Tech Pvt Ltd'}
              </div>
              <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Production Workspace
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.5} />
          </button>

          {showOrgMenu && (
            <div className="mt-1.5 p-1.5 glass-panel rounded-xl shadow-xl border border-white/80 text-xs space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Workspaces
              </div>
              <div className="px-2.5 py-1.5 bg-indigo-50/80 text-indigo-700 font-medium rounded-lg border border-indigo-100/60">
                Acme Tech Pvt Ltd (Active)
              </div>
              <div className="px-2.5 py-1.5 text-slate-600 hover:bg-white/60 rounded-lg cursor-pointer transition">
                Staging Sandbox
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items Grouped with Role-Based Access Control */}
        <nav className="p-3 space-y-4 overflow-y-auto">
          {isEmployee ? (
            /* Employee View: Only My Tasks and AI Assistant */
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase px-2.5 mb-1.5">
                My Workspace
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => onNavigate('tasks')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                    currentPage === 'tasks'
                      ? 'bg-gradient-to-r from-indigo-50/90 to-violet-50/70 text-indigo-700 font-semibold border border-indigo-100/80 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckSquare className={`w-4 h-4 ${currentPage === 'tasks' ? 'text-indigo-600' : 'text-slate-400'}`} strokeWidth={1.5} />
                    <span>My Tasks</span>
                  </div>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white/70 border border-slate-200/60 text-slate-600 shadow-2xs">
                    {taskCount}
                  </span>
                </button>

                <button
                  onClick={() => onNavigate('chat')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                    currentPage === 'chat'
                      ? 'bg-gradient-to-r from-indigo-50/90 to-violet-50/70 text-indigo-700 font-semibold border border-indigo-100/80 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquareText className={`w-4 h-4 ${currentPage === 'chat' ? 'text-indigo-600' : 'text-slate-400'}`} strokeWidth={1.5} />
                    <span>AI Assistant</span>
                  </div>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-100/70 border border-violet-200/60 text-violet-700">
                    RAG
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Admin / Manager / HR View: Executive High Features */
            <>
              {/* Group 1: Workspace */}
              <div>
                <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase px-2.5 mb-1.5">
                  Workspace
                </div>
                <div className="space-y-1">
                  {canAccessControlTower && (
                    <button
                      onClick={() => onNavigate('dashboard')}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                        currentPage === 'dashboard'
                          ? 'bg-gradient-to-r from-indigo-50/90 to-violet-50/70 text-indigo-700 font-semibold border border-indigo-100/80 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <LayoutDashboard className={`w-4 h-4 ${currentPage === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`} strokeWidth={1.5} />
                        <span>Control Tower</span>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => onNavigate('tasks')}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                      currentPage === 'tasks'
                        ? 'bg-gradient-to-r from-indigo-50/90 to-violet-50/70 text-indigo-700 font-semibold border border-indigo-100/80 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckSquare className={`w-4 h-4 ${currentPage === 'tasks' ? 'text-indigo-600' : 'text-slate-400'}`} strokeWidth={1.5} />
                      <span>Task Board</span>
                    </div>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white/70 border border-slate-200/60 text-slate-600 shadow-2xs">
                      {taskCount}
                    </span>
                  </button>
                </div>
              </div>

              {/* Group 2: Intelligence */}
              <div>
                <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase px-2.5 mb-1.5">
                  Intelligence
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => onNavigate('chat')}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                      currentPage === 'chat'
                        ? 'bg-gradient-to-r from-indigo-50/90 to-violet-50/70 text-indigo-700 font-semibold border border-indigo-100/80 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquareText className={`w-4 h-4 ${currentPage === 'chat' ? 'text-indigo-600' : 'text-slate-400'}`} strokeWidth={1.5} />
                      <span>AI Assistant</span>
                    </div>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-100/70 border border-violet-200/60 text-violet-700">
                      RAG
                    </span>
                  </button>

                  {canAccessMeetingWorkflow && (
                    <button
                      onClick={() => onNavigate('meeting-tasks')}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                        currentPage === 'meeting-tasks'
                          ? 'bg-gradient-to-r from-indigo-50/90 to-violet-50/70 text-indigo-700 font-semibold border border-indigo-100/80 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Sliders className={`w-4 h-4 ${currentPage === 'meeting-tasks' ? 'text-indigo-600' : 'text-slate-400'}`} strokeWidth={1.5} />
                        <span>Task Workflow</span>
                      </div>
                    </button>
                  )}

                  {canAccessDocuments && (
                    <button
                      onClick={() => onNavigate('documents')}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                        currentPage === 'documents'
                          ? 'bg-gradient-to-r from-indigo-50/90 to-violet-50/70 text-indigo-700 font-semibold border border-indigo-100/80 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className={`w-4 h-4 ${currentPage === 'documents' ? 'text-indigo-600' : 'text-slate-400'}`} strokeWidth={1.5} />
                        <span>Knowledge Vault</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </nav>
      </div>

      {/* Bottom Section: User Profile */}
      <div className="p-3 border-t border-slate-200/50 space-y-3 bg-transparent">
        {/* User Profile Card */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 hover:bg-white/90 hover:border-indigo-200/70 transition shadow-xs cursor-pointer text-left"
              title="Click to Switch Demo Account"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-100 to-violet-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200/50">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{currentUser.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border uppercase tracking-wider backdrop-blur-xs ${roleBadgeStyle(currentUser.role)}`}>
                  {currentUser.role}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
              </div>
            </button>

            {/* Quick Demo Switcher Menu */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 p-1.5 glass-panel rounded-2xl shadow-2xl border border-white/80 text-xs space-y-0.5 z-40 backdrop-blur-2xl">
                <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Demo Account
                </div>
                <button
                  onClick={() => { onSwitchUser('sid@acme.com'); setShowUserMenu(false); }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-white/70 rounded-lg flex items-center justify-between transition cursor-pointer"
                >
                  <span className="font-medium text-slate-800">Sid (Admin)</span>
                  <span className="text-[10px] text-slate-400">sid@acme.com</span>
                </button>
                <button
                  onClick={() => { onSwitchUser('anush@acme.com'); setShowUserMenu(false); }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-white/70 rounded-lg flex items-center justify-between transition cursor-pointer"
                >
                  <span className="font-medium text-slate-800">Anush (Manager)</span>
                  <span className="text-[10px] text-slate-400">anush@acme.com</span>
                </button>
                <button
                  onClick={() => { onSwitchUser('nick@acme.com'); setShowUserMenu(false); }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-white/70 rounded-lg flex items-center justify-between transition cursor-pointer"
                >
                  <span className="font-medium text-slate-800">Nick (HR)</span>
                  <span className="text-[10px] text-slate-400">nick@acme.com</span>
                </button>
                <button
                  onClick={() => { onSwitchUser('rahul@acme.com'); setShowUserMenu(false); }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-white/70 rounded-lg flex items-center justify-between transition cursor-pointer"
                >
                  <span className="font-medium text-slate-800">Rahul (Employee)</span>
                  <span className="text-[10px] text-slate-400">rahul@acme.com</span>
                </button>
                <div className="border-t border-slate-200/50 my-1"></div>
                <button
                  onClick={() => { onLogout(); setShowUserMenu(false); }}
                  className="w-full text-left px-2.5 py-1.5 text-rose-600 hover:bg-rose-50/80 rounded-lg flex items-center gap-2 font-medium transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
