import type { CalendarEvent } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

function toIcsDate(dateStr: string, timeStr?: string): string {
    if (!timeStr) {
        // All-day: YYYYMMDD
        return dateStr.replace(/-/g, '');
    }
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);
    // Use local time with no Z suffix so calendar apps interpret in local tz
    return `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
}

function escapeIcs(str: string): string {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

function buildVEvent(event: CalendarEvent, uid: string): string {
    const dtStamp = new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');

    const isAllDay = !event.time;
    const startDt = toIcsDate(event.date, event.time);

    let endDt: string;
    if (isAllDay) {
        const d = new Date(event.date);
        d.setDate(d.getDate() + 1);
        endDt = d.toISOString().slice(0, 10).replace(/-/g, '');
    } else {
        const startMs =
            new Date(`${event.date}T${event.time}:00`).getTime() +
            (event.durationMinutes || 60) * 60000;
        endDt = new Date(startMs)
            .toISOString()
            .replace(/[-:]/g, '')
            .replace(/\.\d{3}/, '')
            .slice(0, 15); // YYYYMMDDTHHmmss
    }

    const lines: string[] = [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}Z`,
    ];

    if (isAllDay) {
        lines.push(`DTSTART;VALUE=DATE:${startDt}`, `DTEND;VALUE=DATE:${endDt}`);
    } else {
        lines.push(`DTSTART:${startDt}`, `DTEND:${endDt}`);
    }

    lines.push(`SUMMARY:${escapeIcs(event.title)}`);
    if (event.location) lines.push(`LOCATION:${escapeIcs(event.location)}`);
    if (event.description)
        lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);

    lines.push('END:VEVENT');
    return lines.join('\r\n');
}

export function generateIcs(events: CalendarEvent[]): string {
    const vEvents = events
        .map((e, i) => buildVEvent(e, `snapcal-${Date.now()}-${i}@snapcal.app`))
        .join('\r\n');

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//SnapCal//SnapCal//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        vEvents,
        'END:VCALENDAR',
    ].join('\r\n');
}

export function downloadIcs(events: CalendarEvent[], filename = 'events.ics'): void {
    const ics = generateIcs(events);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
