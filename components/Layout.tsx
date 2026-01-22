
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, onBack, actions }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto shadow-xl relative overflow-hidden">
      {title && (
        <header className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <i className="fas fa-chevron-left text-slate-600"></i>
              </button>
            )}
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {title}
            </h1>
          </div>
          <div>{actions}</div>
        </header>
      )}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>
    </div>
  );
};
