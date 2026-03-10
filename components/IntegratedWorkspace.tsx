
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisFile, ChatMessage, ReportDraft } from '../types';
import { analyzeDocument, generateReport } from '../services/geminiService';
import { FileText, File, Trash2, UploadCloud, Search, CheckCircle2, FileCode2, Send, Loader2, FileOutput, FileArchive, Settings2 } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const IntegratedWorkspace: React.FC = () => {
  // --- 状态管理 ---
  const [files, setFiles] = useState<AnalysisFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [focusedFileId, setFocusedFileId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportContent, setReportContent] = useState<string>('');
  const [reportTitle, setReportTitle] = useState('分析报告初稿');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动聊天到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // --- 文件处理逻辑 ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      Array.from(selectedFiles).forEach((file: File) => {
        // Prevent uploading files larger than 10MB to avoid browser OOM crashes
        if (file.size > 10 * 1024 * 1024) {
          alert(`文件 "${file.name}" 过大 (超过10MB)。请上传较小的文件。`);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          const newFile: AnalysisFile = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            content,
            type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'text/plain'),
            uploadDate: new Date(),
          };
          setFiles(prev => [...prev, newFile]);
          setSelectedFileIds(prev => {
            const next = new Set(prev);
            next.add(newFile.id);
            return next;
          });
          if (!focusedFileId) setFocusedFileId(newFile.id);
        };
        
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (focusedFileId === id) setFocusedFileId(null);
  };

  // --- 分析与报告生成逻辑 ---
  const handleAnalysis = async () => {
    const selectedFiles = files.filter(f => selectedFileIds.has(f.id));
    if (!query.trim() || selectedFiles.length === 0) return;

    const userMsg: ChatMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);

    try {
      const docsToAnalyze = selectedFiles.map(f => ({ name: f.name, content: f.content, type: f.type }));
      const result = await analyzeDocument(docsToAnalyze, query, useSearch);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.text,
        groundingUrls: result.sources 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "系统分析出错，请稍后重试。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const [reportRequirements, setReportRequirements] = useState("请针对以上研判内容，生成一份正式的咨询分析报告，包含政策背景、核心影响、企业应对建议。");

  const handleCreateReport = async () => {
    const selectedFiles = files.filter(f => selectedFileIds.has(f.id));
    if (selectedFiles.length === 0) {
      alert("请先上传并选择至少一份政策材料作为报告依据。");
      return;
    }
    if (!reportRequirements.trim()) {
      alert("请输入报告生成要求。");
      return;
    }
    
    setIsGeneratingReport(true);
    try {
      // 综合选中的文件内容、对话历史作为底稿
      const contextSummary = `
        关键研判内容: ${messages.filter(m => m.role === 'assistant').slice(-3).map(m => m.content).join('\n\n')}
      `;
      const docsToAnalyze = selectedFiles.map(f => ({ name: f.name, content: f.content, type: f.type }));
      const result = await generateReport(contextSummary, reportRequirements, docsToAnalyze);
      setReportContent(result);
    } catch (error) {
      alert("生成报告失败。");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const focusedFile = files.find(f => f.id === focusedFileId);

  return (
    <div className="flex h-full w-full bg-[#f8fafc]">
      
      {/* 1. 左侧栏：材料库 (20%) */}
      <aside className="w-[20%] border-r border-slate-200 bg-white flex flex-col min-w-[280px]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-700 flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            政策材料库
          </h2>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded shadow-sm hover:border-indigo-400 hover:text-indigo-600 transition-all font-bold flex items-center"
          >
            <UploadCloud className="w-3 h-3 mr-1" />
            上传材料
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".md,.txt,.pdf" multiple />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {files.map(f => (
            <div 
              key={f.id} 
              className={`p-3 rounded-xl border cursor-pointer transition-all group ${
                focusedFileId === f.id ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-100 hover:bg-slate-50'
              }`}
              onClick={() => setFocusedFileId(f.id)}
            >
              <div className="flex items-start">
                <input 
                  type="checkbox" 
                  checked={selectedFileIds.has(f.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    const next = new Set(selectedFileIds);
                    if (next.has(f.id)) next.delete(f.id); else next.add(f.id);
                    setSelectedFileIds(next);
                  }}
                  className="mt-0.5 w-3.5 h-3.5 text-indigo-600 rounded"
                />
                <div className="ml-2 flex-1 overflow-hidden">
                  <p className="text-xs font-bold text-slate-700 truncate flex items-center">
                    {f.type === 'application/pdf' ? <FileText className="w-3 h-3 mr-1 text-red-400" /> : <FileCode2 className="w-3 h-3 mr-1 text-blue-400" />}
                    {f.name}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {f.type === 'application/pdf' ? 'PDF文件' : `${f.content.length} 字符`} · {f.uploadDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {files.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300">
              <FileArchive className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-[10px] uppercase font-bold tracking-widest text-center">请上传 PDF/Markdown/TXT<br/>参考材料</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/30">
           <div className="bg-indigo-600 rounded-xl p-3 text-white shadow-lg shadow-indigo-100">
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                上下文状态
              </p>
              <p className="text-sm font-bold mt-1">已激活 {selectedFileIds.size} 份核心材料</p>
           </div>
        </div>
      </aside>

      {/* 2. 中间栏：对话研判区 (45%) */}
      <section className="flex-1 flex flex-col bg-white min-w-[400px]">
        <header className="h-14 border-b border-slate-100 flex items-center justify-between px-6 bg-white">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-slate-800">智能研判工作台</span>
            <span className="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full font-bold">GPT-4V Class</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-500 font-medium">联网实时校对</span>
              <button 
                onClick={() => setUseSearch(!useSearch)}
                className={`w-8 h-4 rounded-full relative transition-colors ${useSearch ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${useSearch ? 'translate-x-4.5' : 'translate-x-0.5'}`} style={{ transform: useSearch ? 'translateX(1rem)' : 'translateX(0.125rem)' }}></div>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="max-w-xs text-center space-y-4 opacity-40">
                <svg className="w-12 h-12 mx-auto text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
                <p className="text-sm font-medium">请从左侧选择政策材料，并开始您的深度咨询研判。</p>
              </div>
            </div>
          )}
          
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] p-4 rounded-2xl shadow-sm ${
                m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
              }`}>
                <div className="text-sm leading-relaxed whitespace-pre-wrap markdown-content">
                  <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
                </div>
                {m.groundingUrls && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    {m.groundingUrls.map((url, idx) => (
                      <a key={idx} href={url.uri} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded hover:underline">
                        🔗 {url.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex space-x-2">
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-100"></div>
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
          <div className="relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={selectedFileIds.size > 0 ? "请输入研判指令或提问..." : "请先勾选左侧材料"}
              disabled={selectedFileIds.size === 0 || isLoading}
              rows={2}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all resize-none text-sm pr-16"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAnalysis())}
            />
            <button
              onClick={handleAnalysis}
              disabled={!query.trim() || isLoading}
              className="absolute right-3 bottom-3 p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:bg-slate-300"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-2 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
             <span>Shift + Enter 换行</span>
             <span>Powered by Gemini 2.0 Pro</span>
          </div>
        </div>
      </section>

      {/* 3. 右侧栏：报告预览区 (35%) */}
      <section className="w-[35%] bg-white border-l border-slate-200 flex flex-col min-w-[350px]">
        <header className="h-14 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-800 flex items-center">
            <FileOutput className="w-4 h-4 mr-2 text-indigo-600" />
            正式咨询研报预览
          </h2>
          <div className="flex space-x-2">
            <button 
               onClick={handleCreateReport}
               disabled={isGeneratingReport || selectedFileIds.size === 0}
               className="text-[11px] bg-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-300 font-bold flex items-center transition-all"
            >
              {isGeneratingReport ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1" />}
              {isGeneratingReport ? "编写中..." : "生成专业报告"}
            </button>
            <button className="p-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="p-4 border-b border-slate-100 bg-white">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">报告生成要求</label>
          <textarea
            value={reportRequirements}
            onChange={(e) => setReportRequirements(e.target.value)}
            rows={3}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all resize-none text-xs text-slate-700"
            placeholder="请输入报告的具体要求，例如：包含政策背景、核心影响、企业应对建议..."
          />
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-white relative">
          {!reportContent && !isGeneratingReport && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center text-slate-300">
               <FileOutput className="w-16 h-16 mb-4 opacity-10" />
               <p className="text-sm font-medium text-slate-400">完成分析后，点击上方按钮一键生成标准化咨询报告。</p>
            </div>
          )}

          {isGeneratingReport && (
             <div className="h-full flex flex-col items-center justify-center space-y-4">
                <div className="w-full max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500 animate-[loading_2s_ease-in-out_infinite]" style={{width: '60%'}}></div>
                </div>
                <p className="text-xs font-bold text-slate-400 animate-pulse">正在提取政策要点并进行互联网交叉验证...</p>
             </div>
          )}

          {reportContent && (
            <div className="markdown-content prose prose-slate max-w-none prose-sm">
              <Markdown remarkPlugins={[remarkGfm]}>{reportContent}</Markdown>
            </div>
          )}
        </div>

        {/* 底部文件内容浮动查看 (仅当选中且点击查看时) */}
        {focusedFile && (
          <div className="h-1/3 border-t border-slate-200 bg-slate-50 overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center">
                <Search className="w-3 h-3 mr-1" />
                源文件查阅: {focusedFile.name}
              </span>
              <button onClick={() => setFocusedFileId(null)} className="text-slate-400 hover:text-slate-600">
                 <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-[11px] font-mono text-slate-600 leading-relaxed bg-white">
              {focusedFile.type === 'application/pdf' ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <FileText className="w-8 h-8 mb-2 opacity-50" />
                  <p>PDF文件内容已加载，请在上方进行对话分析</p>
                </div>
              ) : (
                focusedFile.content
              )}
            </div>
          </div>
        )}
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}} />
    </div>
  );
};

export default IntegratedWorkspace;
