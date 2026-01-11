
import React from 'react';

interface MarkdownViewerProps {
  content: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  // Simple regex-based formatter for demonstration; for production, use 'react-markdown'
  const lines = content.split('\n');
  return (
    <div className="prose prose-slate max-w-none text-sm md:text-base">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mt-4 mb-2">{line.replace('# ', '')}</h1>;
        if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-semibold mt-4 mb-2">{line.replace('## ', '')}</h2>;
        if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-medium mt-3 mb-1">{line.replace('### ', '')}</h3>;
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc mb-1">{line.replace(/^[-\*]\s/, '')}</li>;
        if (line.trim() === '') return <br key={i} />;
        return <p key={i} className="mb-2">{line}</p>;
      })}
    </div>
  );
};
