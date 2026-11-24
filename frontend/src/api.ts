import axios from 'axios';

export const API_BASE = 'http://127.0.0.1:8000';

export const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartcorp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface UserInfo {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'HR' | 'Employee';
  org_id: number;
  org_name: string;
}

export interface TaskItem {
  id?: number;
  title: string;
  assignee_name?: string;
  priority: 'Low' | 'Medium' | 'High';
  est_hours: number;
  due_date?: string;
  status?: 'Todo' | 'In Progress' | 'Done';
}

export interface Citation {
  filename: string;
  page: number;
  excerpt: string;
}

export interface RagResponse {
  answer: string;
  citations: Citation[];
}

export interface AuditEvent {
  id: number;
  actor_name: string;
  action_text: string;
  created_at: string;
}

export interface WorkloadItem {
  user_id: number;
  name: string;
  role: string;
  hours: number;
  pending_tasks: number;
}

export interface DashboardSummary {
  kpis: {
    total_tasks: number;
    pending_tasks: number;
    completed_tasks: number;
    total_documents: number;
    total_workload_hours: number;
    team_size: number;
  };
  status_distribution: { name: string; value: number; color: string }[];
  workload: WorkloadItem[];
}
