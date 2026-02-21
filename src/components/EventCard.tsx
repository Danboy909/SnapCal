import { useState } from 'react';
import type { CalendarEvent } from '../types';
import { Calendar, Clock, MapPin, AlignLeft, Check, X, Repeat, Sparkles } from 'lucide-react';
import { refineEventWithAI } from '../lib/gemini';
import clsx from 'clsx';

interface EventCardProps {
    event: CalendarEvent;
    onUpdate: (event: CalendarEvent) => void;
    onConfirm: () => void;
    onCancel: () => void;
    isCreating?: boolean;
}

export function EventCard({ event, onUpdate, onConfirm, onCancel, isCreating }: EventCardProps) {
    const [instruction, setInstruction] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    const handleChange = (field: keyof CalendarEvent, value: any) => {
        onUpdate({ ...event, [field]: value });
    };

    const handleRefine = async () => {
        if (!instruction.trim()) return;

        setIsRefining(true);
        try {
            const updatedEvent = await refineEventWithAI(event, instruction);
            onUpdate(updatedEvent);
            setInstruction('');
        } catch (error) {
            console.error('Failed to refine event:', error);
            // Optionally add error handling UI here
        } finally {
            setIsRefining(false);
        }
    };

    return (
        <div className="premium-card rounded-2xl overflow-hidden w-full max-w-lg mx-auto transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60 dark:hover:shadow-slate-900/60">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-slate-900/80">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Event Details</h3>
                <button onClick={onCancel} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* AI Refinement Input */}
            <div className="px-6 pt-6 pb-2">
                <div className="relative group">
                    <input
                        type="text"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                        placeholder="✨ Type to refine... (e.g. 'Change time to 3pm')"
                        disabled={isRefining || isCreating}
                        className="premium-input w-full pl-4 pr-12 py-3 text-sm"
                    />
                    <button
                        onClick={handleRefine}
                        disabled={!instruction.trim() || isRefining || isCreating}
                        className={clsx(
                            "absolute right-2 top-2 p-1.5 rounded-lg text-white transition-all shadow-sm flex items-center justify-center",
                            !instruction.trim() || isRefining || isCreating
                                ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none"
                                : "bg-gradient-to-tr from-blue-600 to-indigo-600 hover:shadow-md hover:scale-105 active:scale-95"
                        )}
                        title="Refine with AI"
                    >
                        {isRefining ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Sparkles size={16} />
                        )}
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-5">
                {/* Title */}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-300 mb-1.5 ml-1">Event Title</label>
                    <input
                        type="text"
                        value={event.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className="premium-input w-full px-4 py-3 font-medium"
                        placeholder="Event Title"
                    />
                </div>

                <div className="grid grid-cols-2 gap-5">
                    {/* Date */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 ml-1 flex items-center gap-1">
                            <Calendar size={12} /> Date
                        </label>
                        <input
                            type="date"
                            value={event.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                            className="premium-input w-full px-4 py-3 text-slate-700 dark:text-slate-200"
                        />
                    </div>

                    {/* Time */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 ml-1 flex items-center gap-1">
                            <Clock size={12} /> Time
                        </label>
                        <input
                            type="time"
                            value={event.time || ''}
                            onChange={(e) => handleChange('time', e.target.value)}
                            className="premium-input w-full px-4 py-3 text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!event.time && event.time === ''}
                        />
                        <label className="flex items-center gap-2 mt-2 text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors select-none">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={!event.time}
                                    onChange={(e) => handleChange('time', e.target.checked ? '' : '09:00')}
                                    className="peer h-4 w-4 shrink-0 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-800"
                                />
                            </div>
                            All-day event
                        </label>
                    </div>
                </div>

                {/* Recurrence (if present) */}
                {event.recurrence && event.recurrence.length > 0 && (
                    <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-300">
                            <Repeat size={16} />
                        </div>
                        <div className="flex-1 py-1">
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Recurring Event</p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 break-all font-mono opacity-80">
                                {event.recurrence[0].replace('RRULE:', '')}
                            </p>
                        </div>
                        <button
                            onClick={() => handleChange('recurrence', undefined)}
                            className="text-blue-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800 p-1.5 rounded-lg transition-colors"
                            title="Remove recurrence"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Duration (only show if time is set) */}
                {event.time && (
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-300 mb-1.5 ml-1">Duration</label>
                        <div className="flex gap-2">
                            {[30, 60, 120].map((minutes) => (
                                <button
                                    key={minutes}
                                    type="button"
                                    onClick={() => handleChange('durationMinutes', minutes)}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm border",
                                        event.durationMinutes === minutes
                                            ? "bg-slate-800 dark:bg-blue-600 text-white border-slate-800 dark:border-blue-600"
                                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300"
                                    )}
                                >
                                    {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
                                </button>
                            ))}
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    value={event.durationMinutes || 60}
                                    onChange={(e) => handleChange('durationMinutes', parseInt(e.target.value) || 60)}
                                    className="premium-input w-full px-4 py-2 pl-4 pr-8 text-sm"
                                    min="15"
                                    step="15"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 font-medium pointer-events-none">min</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Location */}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 ml-1 flex items-center gap-1">
                        <MapPin size={12} /> Location
                    </label>
                    <input
                        type="text"
                        value={event.location || ''}
                        onChange={(e) => handleChange('location', e.target.value)}
                        className="premium-input w-full px-4 py-3"
                        placeholder="Add location"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 ml-1 flex items-center gap-1">
                        <AlignLeft size={12} /> Description
                    </label>
                    <textarea
                        value={event.description || ''}
                        onChange={(e) => handleChange('description', e.target.value)}
                        className="premium-input w-full px-4 py-3 min-h-[100px] resize-none"
                        placeholder="Add description"
                    />
                </div>

                {/* Actions */}
                <div className="pt-6 flex gap-4">
                    <button
                        onClick={onConfirm}
                        disabled={isCreating}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-white transition-all shadow-lg shadow-blue-500/25",
                            isCreating
                                ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none"
                                : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                        )}
                    >
                        {isCreating ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Adding...
                            </>
                        ) : (
                            <>
                                <Check size={20} />
                                Add to Calendar
                            </>
                        )}
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={isCreating}
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
