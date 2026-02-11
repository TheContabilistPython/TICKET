import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = 'info', duration = 5000 }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`
              pointer-events-auto
              flex items-start gap-3 px-4 py-3 rounded-lg shadow-xl text-white min-w-[300px] max-w-sm
              transform transition-all duration-300 ease-in-out
              ${toast.type === 'error' ? 'bg-red-600' : 
                toast.type === 'success' ? 'bg-green-600' : 
                toast.type === 'warning' ? 'bg-amber-600' : 'bg-gray-800'}
            `}
            role="alert"
          >
            <div className="mt-0.5 shrink-0">
                {toast.type === 'warning' && <AlertTriangle size={20} />}
                {toast.type === 'success' && <CheckCircle size={20} />}
                {toast.type === 'info' && <Info size={20} />}
                {toast.type === 'error' && <Info size={20} />}
            </div>
            
            <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
            
            <button 
                onClick={() => removeToast(toast.id)} 
                className="opacity-70 hover:opacity-100 shrink-0 mt-0.5 transition-opacity"
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
