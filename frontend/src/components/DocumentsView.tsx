import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  Upload, FileText, CheckCircle2, RefreshCw, AlertCircle, 
  Sparkles, Download, Trash2, MoreVertical, Search, File
} from 'lucide-react';

interface DocItem {
  id: number;
  name: string;
  uploaded_by: string;
  page_count: number;
  created_at: string;
}

export const DocumentsView: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const fetchDocs = async () => {
    try {
      const res = await api.get<DocItem[]>('/api/documents');
      setDocs(res.data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadStatus(res.data.message || `Successfully indexed ${file.name}!`);
      fetchDocs();
    } catch (err: any) {
      alert(`Upload failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    try {
      await api.delete(`/api/documents/${docId}`);
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      setActiveMenuId(null);
      setConfirmDeleteId(null);
      setUploadStatus('Document successfully removed from knowledge base.');
    } catch (err: any) {
      alert(`Delete failed: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleDownload = (filename: string) => {
    window.open(`http://127.0.0.1:8000/api/documents/download/by-name?filename=${encodeURIComponent(filename)}`, '_blank');
  };

  const filteredDocs = docs.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Knowledge Vault & Documents
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage organizational files, policy guidelines, and documents vector-indexed in ChromaDB.
          </p>
        </div>
        <button
          onClick={() => onNavigate('chat')}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Test in AI Assistant
        </button>
      </div>

      {uploadStatus && (
        <div className="bg-emerald-50/80 border border-emerald-200/70 rounded-2xl p-3.5 flex items-center justify-between text-emerald-700 text-xs font-medium backdrop-blur-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" strokeWidth={1.5} />
            <span>{uploadStatus}</span>
          </div>
          <button
            onClick={() => setUploadStatus(null)}
            className="text-emerald-500 hover:text-emerald-700 font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Upload Drop Zone */}
      <div className="glass-card border-2 border-dashed border-indigo-200/70 hover:border-indigo-400/80 rounded-3xl p-8 text-center transition-all shadow-xs">
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50/80 border border-indigo-100/70 text-indigo-600 flex items-center justify-center mb-3 shadow-2xs">
            <Upload className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Upload New Knowledge Document</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
            Supports PDF, DOCX, TXT, and Markdown files. Automatically parsed, chunked, and embedded into local ChromaDB for instant Q&A.
          </p>

          <label className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-2 ring-1 ring-indigo-500/30">
            {uploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                Parsing & Indexing into Vector Store...
              </>
            ) : (
              <>
                <File className="w-3.5 h-3.5" strokeWidth={1.5} />
                Select File to Upload
              </>
            )}
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md,.csv,.json,.rtf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Document Library Table */}
      <div className="glass-card rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200/50">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Indexed Documents ({filteredDocs.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              Files currently searchable by the SmartCorp AI assistant.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by filename..."
              className="w-full glass-input rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" strokeWidth={1.5} />
            Loading documents...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No matching documents found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Document Name</th>
                  <th className="py-2.5 px-3">Pages / Chunks</th>
                  <th className="py-2.5 px-3">Uploaded By</th>
                  <th className="py-2.5 px-3">Date Added</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 text-slate-700">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50/80 text-indigo-600 border border-indigo-100/70 flex items-center justify-center shrink-0 shadow-2xs">
                          <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </div>
                        <span className="truncate max-w-xs">{doc.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md border text-[10px] font-medium bg-slate-50/80 text-slate-600 border-slate-200/60 shadow-2xs">
                        {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{doc.uploaded_by}</td>
                    <td className="py-3 px-3 text-slate-500">{doc.created_at}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="relative inline-flex items-center gap-1.5">
                        {/* Download button */}
                        <button
                          onClick={() => handleDownload(doc.name)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition cursor-pointer"
                          title="Download file"
                        >
                          <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>

                        {/* 3 Dots Menu Button */}
                        <button
                          onClick={() => {
                            setActiveMenuId(activeMenuId === doc.id ? null : doc.id);
                            setConfirmDeleteId(null);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition cursor-pointer"
                          title="Options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>

                        {/* Popover Menu with Clean Delete Option */}
                        {activeMenuId === doc.id && (
                          <div className="absolute right-0 top-full mt-1.5 w-44 glass-panel border border-white/80 rounded-2xl shadow-xl p-1.5 z-40 text-left animate-in fade-in zoom-in-95">
                            {confirmDeleteId === doc.id ? (
                              <div className="p-2 space-y-2">
                                <div className="text-[11px] font-semibold text-rose-600">
                                  Confirm Deletion?
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Removes from ChromaDB vector index.
                                </div>
                                <div className="flex gap-1.5 pt-1">
                                  <button
                                    onClick={() => handleDelete(doc.id)}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-semibold transition cursor-pointer"
                                  >
                                    Yes, Delete
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 glass-button text-slate-600 rounded-lg text-[10px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleDownload(doc.name)}
                                  className="w-full text-left px-2 py-1.5 text-slate-700 hover:bg-white/70 rounded-lg flex items-center gap-2 text-xs transition cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                                  Download File
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(doc.id)}
                                  className="w-full text-left px-2 py-1.5 text-rose-600 hover:bg-rose-50/80 rounded-lg flex items-center gap-2 text-xs font-medium transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" strokeWidth={1.5} />
                                  Delete Document
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
