export interface CalendarEvent {
    id?: string;
    title: string;
    date: string; // YYYY-MM-DD
    time?: string; // HH:MM
    location?: string;
    description?: string;
    durationMinutes?: number;
    selected?: boolean;
    reminders?: EventReminder[];
    recurrence?: string[]; // RRULE strings (e.g. "RRULE:FREQ=WEEKLY;BYDAY=MO")
}

export type CalendarProvider = 'google' | 'outlook' | 'ics';


export interface EventReminder {
    method: 'email' | 'popup';
    minutes: number;
}

export interface CalendarListItem {
    id: string;
    summary: string;
    backgroundColor: string;
    accessRole: string;
}

export interface ExtractionResult {
    events: CalendarEvent[];
    confidence: number;
}

export interface CalendarApiResponse {
    id: string;
    htmlLink: string;
    summary: string;
    start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    timeZone?: string;
}
