import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export type AnalysisStep = 'uploading' | 'analyzing' | 'extracting' | 'done' | null;

const STEPS: { key: AnalysisStep; label: string }[] = [
    { key: 'uploading', label: 'Uploading image...' },
    { key: 'analyzing', label: 'Analyzing with AI...' },
    { key: 'extracting', label: 'Extracting events...' },
    { key: 'done', label: 'Done!' },
];

interface Props {
    step: AnalysisStep;
}

export function AnalysisProgress({ step }: Props) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (step) {
            setVisible(true);
        } else {
            const t = setTimeout(() => setVisible(false), 400);
            return () => clearTimeout(t);
        }
    }, [step]);

    if (!visible) return null;

    const currentIndex = STEPS.findIndex(s => s.key === step);

    return (
        <div className={clsx(
            'flex flex-col items-center justify-center py-16 gap-8 transition-opacity duration-300',
            step ? 'opacity-100' : 'opacity-0'
        )}>
            {/* Animated icon */}
            <div className="relative">
                <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    {step === 'done' ? (
                        <CheckCircle2 className="w-10 h-10 text-green-500 animate-in zoom-in-50 duration-300" />
                    ) : (
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    )}
                </div>
                {/* Pulsing ring */}
                {step !== 'done' && (
                    <div className="absolute inset-0 rounded-full border-2 border-blue-300/50 dark:border-blue-600/50 animate-ping" />
                )}
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-2 w-64">
                {STEPS.map((s, i) => {
                    const isDone = i < currentIndex || step === 'done';
                    const isCurrent = s.key === step && step !== 'done';
                    return (
                        <div
                            key={s.key}
                            className={clsx(
                                'flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300',
                                isCurrent && 'bg-blue-50 dark:bg-blue-900/30 scale-105',
                                isDone && 'opacity-50'
                            )}
                        >
                            <div className={clsx(
                                'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 text-xs font-bold',
                                isDone ? 'bg-green-500 text-white' :
                                    isCurrent ? 'bg-blue-500 text-white' :
                                        'bg-slate-200 dark:bg-slate-700 text-slate-400'
                            )}>
                                {isDone ? '✓' : i + 1}
                            </div>
                            <span className={clsx(
                                'text-sm font-medium transition-colors duration-300',
                                isCurrent ? 'text-blue-600 dark:text-blue-400' :
                                    isDone ? 'text-slate-400 dark:text-slate-500 line-through' :
                                        'text-slate-400 dark:text-slate-500'
                            )}>
                                {s.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// --- Skeleton loaders for the event cards ---
export function EventCardSkeleton() {
    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3 animate-pulse bg-white dark:bg-slate-800">
            <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded-lg w-1/2" />
                </div>
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-700" />
            <div className="grid grid-cols-2 gap-2">
                <div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded-lg" />
                <div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded-lg" />
                <div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded-lg" />
            </div>
        </div>
    );
}

export function EventListSkeleton({ count = 2 }: { count?: number }) {
    return (
        <div className="space-y-3 animate-in fade-in duration-300">
            {Array.from({ length: count }).map((_, i) => (
                <EventCardSkeleton key={i} />
            ))}
        </div>
    );
}
