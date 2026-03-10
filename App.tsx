
import React from 'react';
import IntegratedWorkspace from './components/IntegratedWorkspace';
import { BookOpenText, UserCircle2, Activity } from 'lucide-react';

const App: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* 顶部全局导航栏 */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 z-50 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-sm">
            <BookOpenText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">PolicyInsight <span className="text-indigo-600">Pro</span></h1>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest leading-none mt-0.5">政策业务与营商环境智能分析平台</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">系统就绪：专家研判模式</span>
          </div>
          <div className="flex items-center space-x-3 border-l border-slate-200 pl-6">
            <UserCircle2 className="w-8 h-8 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">咨询专家 01</span>
          </div>
        </div>
      </header>

      {/* 主体一体化工作区 */}
      <main className="flex-1 overflow-hidden">
        <IntegratedWorkspace />
      </main>
    </div>
  );
};

export default App;

