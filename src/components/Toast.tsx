import { CheckCircle, X, ExternalLink } from 'lucide-react';
import { useEffect } from 'react';

interface ToastProps {
    message: string;
    link?: string;
    linkText?: string;
    onClose: () => void;
    autoClose?: boolean;
    duration?: number;
}

export function Toast({ message, link, linkText = 'View in Calendar', onClose, autoClose = true, duration = 5000 }: ToastProps) {
    useEffect(() => {
        if (autoClose) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [autoClose, duration, onClose]);

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 min-w-[320px] max-w-md">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-500">
                            <CheckCircle size={16} className="text-green-600" />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{message}</p>
                        {link && (
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                {linkText}
                                <ExternalLink size={14} />
                            </a>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
