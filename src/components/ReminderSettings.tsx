import { useState } from 'react';
import { Bell, Check, X, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import type { EventReminder } from '../types';

interface ReminderSettingsProps {
    reminders: EventReminder[];
    onChange: (reminders: EventReminder[]) => void;
}

const PRESET_REMINDERS: EventReminder[] = [
    { method: 'popup', minutes: 15 },
    { method: 'popup', minutes: 60 },
    { method: 'email', minutes: 1440 }, // 1 day
];

export function ReminderSettings({ reminders, onChange }: ReminderSettingsProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const togglePreset = (preset: EventReminder) => {
        const exists = reminders.some(r => r.method === preset.method && r.minutes === preset.minutes);
        if (exists) {
            onChange(reminders.filter(r => !(r.method === preset.method && r.minutes === preset.minutes)));
        } else {
            onChange([...reminders, preset]);
        }
    };

    const isPresetActive = (preset: EventReminder) => {
        return reminders.some(r => r.method === preset.method && r.minutes === preset.minutes);
    };

    const formatReminderTime = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        if (minutes < 1440) return `${minutes / 60} hour${minutes / 60 > 1 ? 's' : ''}`;
        return `${minutes / 1440} day${minutes / 1440 > 1 ? 's' : ''}`;
    };

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 overflow-hidden transition-all duration-300">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="text-slate-400 dark:text-slate-500">
                        <Bell size={16} />
                    </div>
                    <div className="text-left flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <div className="font-medium text-sm text-slate-700 dark:text-slate-300">Default Reminders</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">•</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                            {reminders.length === 0 ? 'No reminders set' : `${reminders.length} active`}
                        </div>
                    </div>
                </div>
                <div className={clsx("text-slate-400 transition-transform duration-300", isExpanded ? "rotate-180 text-slate-600 dark:text-slate-300" : "")}>
                    <ChevronDown size={14} />
                </div>
            </button>

            {isExpanded && (
                <div className="px-4 pb-4 pt-0 space-y-3 animate-in slide-in-from-top-1 duration-200">
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {PRESET_REMINDERS.map((preset, index) => {
                            const active = isPresetActive(preset);
                            return (
                                <button
                                    key={index}
                                    onClick={() => togglePreset(preset)}
                                    className={clsx(
                                        "flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-all",
                                        active
                                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                                    )}
                                >
                                    <span>{formatReminderTime(preset.minutes)}</span>
                                    {active && <Check size={12} className="text-blue-600 dark:text-blue-400" />}
                                </button>
                            );
                        })}
                    </div>

                    {reminders.length > 0 && (
                        <div className="flex justify-end pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                            <button
                                onClick={() => onChange([])}
                                className="text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center gap-1"
                            >
                                <X size={10} /> Clear all
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
