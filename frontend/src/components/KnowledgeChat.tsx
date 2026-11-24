import React, { useState, useEffect, useRef } from 'react';
import { api, Citation, RagResponse, API_BASE } from '../api';
import { 
  Send, Sparkles, FileText, CheckCircle2, X, Download, 
  ExternalLink, Upload, RefreshCw, Bot, User, ArrowRight
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  citations?: Citation[];
  timestamp: string;
}

interface DocItem {
  id: number;
  name: string;
  uploaded_by: string;
  page_count: number;
  created_at: string;
}

export const KnowledgeChat: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Hello! I am SmartCorp AI, your organizational intelligence assistant. You can ask me any question about company policies, leave rules, IT guidelines, or internal procedures.',
      timestamp: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Prompt Template Chips
  const promptChips = [
    'Summarize Leave Policy',
    'IT Security Guidelines',
    'List Overdue High-Priority Tasks',
    'Draft Weekly Status Update',
  ];

  const fetchDocs = async () => {
    try {
      const res = await api.get<DocItem[]>('/api/documents');
      setDocs(res.data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const question = (queryText || input).trim();
    if (!question || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post<RagResponse>('/api/knowledge/ask', { question });
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: res.data.answer,
        citations: res.data.citations,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: `Error connecting to RAG service: ${err.response?.data?.detail || err.message}`,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDownload = (filename: string) => {
    window.open(`${API_BASE}/api/documents/download/by-name?filename=${encodeURIComponent(filename)}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            AI Assistant & Knowledge Intelligence
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Grounded RAG synthesis using ChromaDB vector search and Google Gemini with source citations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            RAG Pipeline Ready
          </span>
        </div>
      </div>

      {/* Main Two-Column Assistant View: Conversation Panel + Side Knowledge Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Large Conversation Panel (8 cols / ~67%) */}
        <div className="lg:col-span-8 glass-card rounded-2xl shadow-xs flex flex-col h-[calc(100vh-12rem)] overflow-hidden">
          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-50/80 border border-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-xs'
                      : 'bg-white/80 backdrop-blur-md border border-white/80 text-slate-800 shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Verbatim Citations Badges */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/50 space-y-1.5">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-3 h-3 text-indigo-600" strokeWidth={1.5} />
                        Verified Source Citations (Click to inspect excerpt)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((c, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/70 border border-white/80 rounded-lg text-[11px] font-medium text-slate-700 hover:border-indigo-300 hover:bg-white transition cursor-pointer shadow-2xs backdrop-blur-xs"
                          >
                            <span 
                              onClick={() => setActiveCitation(c)}
                              className="hover:text-indigo-600 flex items-center gap-1"
                            >
                              <span>{c.filename}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-indigo-600 font-semibold">Page {c.page}</span>
                            </span>

                            {/* Direct Download Icon */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(c.filename);
                              }}
                              className="text-slate-400 hover:text-indigo-600 transition ml-0.5 p-0.5 hover:bg-slate-100/50 rounded"
                              title={`Download ${c.filename}`}
                            >
                              <Download className="w-3 h-3" strokeWidth={1.5} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={`text-[10px] mt-1.5 text-right ${
                      msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-100 to-violet-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5 border border-indigo-200/60 shadow-2xs">
                    U
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 items-center text-xs text-slate-500">
                <div className="w-8 h-8 rounded-xl bg-indigo-50/80 border border-indigo-100/70 text-indigo-600 flex items-center justify-center shadow-2xs">
                  <Bot className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                </div>
                <div className="bg-white/80 backdrop-blur-md border border-white/80 rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-xs">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  <span className="ml-1 text-slate-500 font-medium text-[11px]">Searching ChromaDB and synthesizing with Gemini...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Template Chips */}
          <div className="px-5 pt-2 pb-2 border-t border-slate-200/50 bg-white/40 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                Suggestions:
              </span>
              {promptChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip)}
                  disabled={loading}
                  className="px-3 py-1 glass-button text-slate-600 hover:text-indigo-700 rounded-xl text-[11px] font-medium whitespace-nowrap transition cursor-pointer shrink-0 shadow-2xs"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Clean Message Input Area (Enter key to send) */}
          <div className="p-4 border-t border-slate-200/50 bg-white/50 backdrop-blur-md">
            <div className="flex items-end gap-2 glass-panel rounded-2xl p-2 border border-white/80 shadow-xs focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about company policies, leave rules, IT guidelines... (Press Enter to send)"
                rows={1}
                className="flex-1 bg-transparent border-0 resize-none text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none max-h-24 py-1 px-1.5"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className={`p-2 rounded-xl transition shrink-0 cursor-pointer ${
                  input.trim() && !loading
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-xs ring-1 ring-indigo-500/30'
                    : 'bg-slate-200/70 text-slate-400 cursor-not-allowed'
                }`}
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="text-[10px] text-slate-400 mt-1.5 flex justify-between px-1">
              <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for newline</span>
              <span>Answers strictly grounded in vector context</span>
            </div>
          </div>
        </div>

        {/* Side Knowledge & Documents Panel (4 cols / ~33%) */}
        <div className="lg:col-span-4 glass-card rounded-2xl p-5 shadow-xs h-[calc(100vh-12rem)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" strokeWidth={1.5} />
                <h3 className="text-sm font-semibold text-slate-900">Knowledge Sources</h3>
              </div>
              <button
                onClick={fetchDocs}
                className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-white/60 rounded-lg cursor-pointer"
                title="Refresh Documents"
              >
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mt-2 mb-3">
              Indexed company documents powering the RAG pipeline.
            </p>

            {docsLoading ? (
              <div className="text-xs text-slate-400 text-center py-6">Loading indexed sources...</div>
            ) : docs.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-6">No documents indexed yet.</div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-25rem)] overflow-y-auto pr-1">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2.5 rounded-xl border border-white/80 bg-white/50 hover:bg-white/80 transition flex items-center justify-between text-xs shadow-2xs backdrop-blur-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50/80 text-indigo-600 border border-indigo-100/70 flex items-center justify-center shrink-0 shadow-2xs">
                        <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate" title={doc.name}>
                          {doc.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'} • {doc.created_at}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(doc.name)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition shrink-0 cursor-pointer"
                      title="Download original file"
                    >
                      <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Upload Action */}
          <div className="pt-3 border-t border-slate-200/50">
            <button
              onClick={() => onNavigate('documents')}
              className="w-full py-2.5 glass-button text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer rounded-xl shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
              Upload New Knowledge File
            </button>
          </div>
        </div>
      </div>

      {/* Citation Popover / Modal with Verbatim Excerpt */}
      {activeCitation && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white/85 backdrop-blur-2xl border border-white/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50/80 text-indigo-600 border border-indigo-100/70 flex items-center justify-center shadow-2xs">
                  <FileText className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Verified Citation Excerpt</h3>
                  <div className="text-xs text-indigo-600 font-medium">
                    {activeCitation.filename} • Page {activeCitation.page}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveCitation(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-white/60 transition cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="glass-panel border border-white/80 rounded-2xl p-4 text-xs text-slate-700 leading-relaxed font-mono max-h-60 overflow-y-auto shadow-inner">
              "{activeCitation.excerpt}"
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] text-emerald-600 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>100% Vector-Grounded Excerpt</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(activeCitation.filename)}
                  className="px-3 py-1.5 glass-button text-slate-700 rounded-xl text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" strokeWidth={1.5} />
                  Download PDF
                </button>
                <button
                  onClick={() => setActiveCitation(null)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold transition cursor-pointer ring-1 ring-indigo-500/30"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
