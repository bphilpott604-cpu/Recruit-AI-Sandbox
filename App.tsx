
import React, { useState } from 'react';
import { generateRecruitmentSandbox } from './services/gemini';
import { GeneratedAssets } from './types';
import { MarkdownViewer } from './components/MarkdownViewer';
import { ChatBot } from './components/ChatBot';

const App: React.FC = () => {
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [assets, setAssets] = useState<GeneratedAssets | null>(null);
  const [activeTab, setActiveTab] = useState<'jd' | 'guide'>('jd');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;

    setIsLoading(true);
    try {
      const result = await generateRecruitmentSandbox(notes);
      setAssets(result);
    } catch (error) {
      console.error("Generation failed", error);
      alert("Failed to generate assets. Please check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">RecruitAI <span className="text-indigo-600 font-normal">Sandbox</span></h1>
          </div>
          <div className="hidden md:flex gap-4 text-sm text-slate-500 font-medium">
            <span>JD Generator</span>
            <span>Interview Architect</span>
            <span>LinkedIn Optimized</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input */}
        <div className="lg:col-span-5">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
            <h2 className="text-lg font-semibold mb-4 text-slate-800">Raw Hiring Notes</h2>
            <p className="text-sm text-slate-500 mb-6">
              Paste your rough notes, Slack snippets, or bullet points about the role. 
              Gemini 3 Pro will use its thinking capabilities to structure it perfectly.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Senior Frontend Dev, needs 5 years React, must be good with Tailwind, remote ok, salary around 140k, team is small but fast. Need someone who can lead projects..."
                className="w-full h-80 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none text-slate-700 bg-slate-50"
              />
              <button
                type="submit"
                disabled={isLoading || !notes.trim()}
                className="w-full py-3 px-6 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Thinking and Architecting...
                  </>
                ) : (
                  <>
                    Generate Recruitment Package
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="lg:col-span-7">
          {!assets && !isLoading && (
            <div className="bg-white h-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <div className="bg-slate-50 p-6 rounded-full mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-slate-600">Your Sandbox is Empty</h3>
              <p className="max-w-xs mt-2">Enter your hiring notes to generate a LinkedIn Job Description and a custom Interview Guide.</p>
            </div>
          )}

          {isLoading && (
            <div className="space-y-6">
              <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-lg"></div>
              <div className="bg-white p-8 rounded-2xl border border-slate-200 space-y-4">
                <div className="h-4 w-full bg-slate-100 animate-pulse rounded"></div>
                <div className="h-4 w-3/4 bg-slate-100 animate-pulse rounded"></div>
                <div className="h-4 w-5/6 bg-slate-100 animate-pulse rounded"></div>
                <div className="h-4 w-1/2 bg-slate-100 animate-pulse rounded"></div>
                <div className="h-4 w-full bg-slate-100 animate-pulse rounded"></div>
              </div>
            </div>
          )}

          {assets && !isLoading && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex p-1 bg-slate-100 rounded-xl mb-6 w-fit">
                <button
                  onClick={() => setActiveTab('jd')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'jd' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Job Description
                </button>
                <button
                  onClick={() => setActiveTab('guide')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'guide' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Interview Guide
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 relative">
                <div className="absolute top-4 right-4">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(activeTab === 'jd' ? assets.jobDescription : assets.interviewGuide);
                      alert('Copied to clipboard!');
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </div>

                {activeTab === 'jd' ? (
                  <div>
                    <div className="flex items-center gap-2 mb-6">
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">LinkedIn Ready</span>
                      <h3 className="text-xl font-bold text-slate-800">Job Description</h3>
                    </div>
                    <MarkdownViewer content={assets.jobDescription} />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-6">
                      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Strategic Prep</span>
                      <h3 className="text-xl font-bold text-slate-800">10 Behavioral Questions</h3>
                    </div>
                    <MarkdownViewer content={assets.interviewGuide} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <ChatBot />
    </div>
  );
};

export default App;
