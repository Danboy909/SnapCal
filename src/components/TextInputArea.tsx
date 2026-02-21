import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface TextInputAreaProps {
    onTextSubmit: (text: string) => void;
    isAnalyzing?: boolean;
}

export function TextInputArea({ onTextSubmit, isAnalyzing }: TextInputAreaProps) {
    const [text, setText] = useState('');

    const handleSubmit = () => {
        if (text.trim()) {
            onTextSubmit(text);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Submit on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto">
            <div className="premium-card rounded-2xl overflow-hidden p-6">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your event details here... (e.g., 'Team meeting every Monday at 10am')"
                    className="premium-input w-full h-64 px-6 py-5 resize-none text-lg mb-6"
                    disabled={isAnalyzing}
                />

                <div className="flex items-center justify-between">
                    <div />
                    <button
                        onClick={handleSubmit}
                        disabled={!text.trim() || isAnalyzing}
                        className={clsx(
                            "px-8 py-3 rounded-xl font-semibold text-white transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2.5",
                            !text.trim() || isAnalyzing
                                ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none"
                                : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                        )}
                    >
                        {isAnalyzing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Analyzing...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} />
                                <span>Extract Events</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="mt-6 text-center text-sm text-slate-400 dark:text-slate-500">
                <p>AI will extract event details and add them directly to your <strong className="text-slate-600 dark:text-slate-400">Google Calendar</strong></p>
            </div>
        </div >
    );
}
