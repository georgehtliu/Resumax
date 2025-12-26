import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import './Toast.css';

const TOAST_TYPES = {
  success: { icon: CheckCircle2, className: 'toast-success' },
  error: { icon: XCircle, className: 'toast-error' },
  info: { icon: Info, className: 'toast-info' },
  warning: { icon: AlertTriangle, className: 'toast-warning' },
};

function Toast({ id, type = 'info', message, duration = 5000, onClose }) {
  const Icon = TOAST_TYPES[type]?.icon || Info;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <div className={`toast ${TOAST_TYPES[type]?.className || ''}`}>
      <Icon className="toast-icon" size={20} />
      <span className="toast-message">{message}</span>
      <button
        className="toast-close"
        onClick={() => onClose(id)}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default Toast;

