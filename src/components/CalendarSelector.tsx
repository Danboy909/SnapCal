import { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import type { CalendarListItem } from '../types';
import { fetchCalendarList } from '../lib/googleCalendar';
import clsx from 'clsx';

interface CalendarSelectorProps {
    selectedCalendarId: string;
    onSelectCalendar: (calendarId: string) => void;
}

export function CalendarSelector({ selectedCalendarId, onSelectCalendar }: CalendarSelectorProps) {
    const [calendars, setCalendars] = useState<CalendarListItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadCalendars();
    }, []);

    const loadCalendars = async () => {
        try {
            const calendarList = await fetchCalendarList();
            setCalendars(calendarList);
        } catch (error) {
            console.error('Failed to load calendars:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const selectedCalendar = calendars.find(c => c.id === selectedCalendarId) || calendars[0];

    if (isLoading || calendars.length === 0) {
        return null;
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="premium-input flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-all text-sm font-medium shadow-sm hover:shadow-md"
            >
                <Calendar size={16} className="text-slate-500 dark:text-slate-400" />
                {selectedCalendar && (
                    <>
                        <div
                            className="w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-800"
                            style={{ backgroundColor: selectedCalendar.backgroundColor }}
                        />
                        <span className="text-slate-700 dark:text-slate-200">{selectedCalendar.summary}</span>
                    </>
                )}
                <ChevronDown size={14} className={clsx("text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 premium-popover rounded-2xl z-20 max-h-96 overflow-y-auto custom-scrollbar p-1 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Calendar</div>
                        {calendars.map((calendar) => (
                            <button
                                key={calendar.id}
                                onClick={() => {
                                    onSelectCalendar(calendar.id);
                                    setIsOpen(false);
                                }}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                                    calendar.id === selectedCalendarId
                                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                        : "hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                                )}
                            >
                                <div
                                    className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-slate-800 shadow-sm"
                                    style={{ backgroundColor: calendar.backgroundColor }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">
                                        {calendar.summary}
                                    </div>
                                    {calendar.accessRole && (
                                        <div className="text-xs opacity-70 truncate">
                                            {calendar.accessRole}
                                        </div>
                                    )}
                                </div>
                                {calendar.id === selectedCalendarId && (
                                    <div className="text-blue-600 dark:text-blue-400 font-bold">✓</div>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
