
import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 4000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade-out animation
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const styles = {
    success: 'bg-green-600 border-green-500 text-white',
    error: 'bg-red-600 border-red-500 text-white',
    info: 'bg-blue-600 border-blue-500 text-white',
    warning: 'bg-orange-500 border-orange-400 text-white',
  };

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    info: 'fa-circle-info',
    warning: 'fa-triangle-exclamation',
  };

  return (
    <div 
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[10000] w-[calc(100%-48px)] max-w-sm px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 transition-all duration-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'} ${styles[type]}`}
    >
      <i className={`fas ${icons[type]} text-lg`}></i>
      <p className="text-xs font-bold flex-1 leading-tight">{message}</p>
      <button onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }} className="p-1 opacity-70 hover:opacity-100">
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};
