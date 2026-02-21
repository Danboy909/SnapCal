import type { CalendarEvent } from '../types';
import { Calendar, Clock, MapPin, CheckSquare } from 'lucide-react';
import clsx from 'clsx';

interface EventListProps {
    events: CalendarEvent[];
    onToggleSelect: (id: string) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onEdit: (event: CalendarEvent) => void;
}

export function EventList({ events, onToggleSelect, onSelectAll, onDeselectAll, onEdit }: EventListProps) {
    const selectedCount = events.filter(e => e.selected).length;
    const allSelected = events.length > 0 && selectedCount === events.length;

    return (
        <div className="premium-card rounded-2xl overflow-hidden w-full max-w-4xl mx-auto transition-all duration-300">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex justify-between items-center sticky top-0 z-10">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 py-0.5 px-2 rounded-md text-sm font-bold">{events.length}</span>
                    <span className="text-slate-600 dark:text-slate-300">Events Found</span>
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={allSelected ? onDeselectAll : onSelectAll}
                        className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-slate-700 max-h-[600px] overflow-y-auto custom-scrollbar">
                {events.map((event) => (
                    <div
                        key={event.id}
                        className={clsx(
                            "p-5 transition-all cursor-pointer group border-l-4",
                            event.selected
                                ? "bg-blue-50/30 dark:bg-blue-900/20 border-blue-500 hover:bg-blue-50/60 dark:hover:bg-blue-900/30"
                                : "premium-list-item border-l-slate-200 dark:border-l-slate-700"
                        )}
                        onClick={() => onToggleSelect(event.id!)}
                    >
                        <div className="flex items-start gap-4">
                            <div className="pt-1">
                                <div className={clsx(
                                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                    event.selected
                                        ? "bg-blue-500 border-blue-500 text-white"
                                        : "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-transparent group-hover:border-blue-400 dark:group-hover:border-blue-500"
                                )}>
                                    <CheckSquare size={14} fill="currentColor" />
                                </div>
                            </div>

                            {/* Content info */}
                            <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate text-base">{event.title}</h3>
                                </div>

                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                                        <span>{new Date(event.date).toLocaleDateString()}</span>
                                    </div>
                                    {event.time && (
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={14} className="text-slate-400 dark:text-slate-500" />
                                            <span>{event.time}</span>
                                            {event.durationMinutes && <span className="text-slate-400 dark:text-slate-500 text-xs">({event.durationMinutes}m)</span>}
                                        </div>
                                    )}
                                    {!event.time && (
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={14} className="text-slate-400 dark:text-slate-500" />
                                            <span>All-day</span>
                                        </div>
                                    )}
                                </div>

                                {event.location && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                        <MapPin size={12} className="text-slate-400 dark:text-slate-500" />
                                        <span className="truncate">{event.location}</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(event);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                            >
                                <div className="font-medium text-xs">Edit Details</div>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {selectedCount > 0 && (
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm flex justify-between items-center">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {selectedCount} event{selectedCount !== 1 ? 's' : ''} selected
                    </p>
                </div>
            )}
        </div>
    );
}
