/// <reference path="../types/gis.d.ts" />
import type { CalendarEvent, CalendarApiResponse } from '../types';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = null;

export const initGoogleClient = (): Promise<void> => {
    return new Promise((resolve) => {
        // Wait for the GIS library to load
        const checkGoogleLoaded = setInterval(() => {
            if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
                clearInterval(checkGoogleLoaded);

                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: (response: google.accounts.oauth2.TokenResponse) => {
                        if (response.error) {
                            console.error('Token error:', response.error, response.error_description);
                            return;
                        }
                        accessToken = response.access_token;
                        console.log('Access token received');
                    },
                    error_callback: (error: { type: string; message: string }) => {
                        console.error('OAuth error:', error);
                    }
                });

                resolve();
            }
        }, 100);
    });
};

export const signIn = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error('Token client not initialized'));
            return;
        }

        // Store the original callback
        const originalCallback = tokenClient.callback;

        // Wrap callback to resolve promise
        tokenClient.callback = (response) => {
            originalCallback(response);
            if (response.error) {
                reject(new Error(response.error_description || response.error));
            } else {
                resolve();
            }
        };

        tokenClient.requestAccessToken({ prompt: '' });
    });
};

export const signOut = (): void => {
    if (accessToken) {
        google.accounts.oauth2.revoke(accessToken, () => {
            console.log('Access token revoked');
        });
        accessToken = null;
    }
};

export const fetchCalendarList = async (): Promise<import('../types').CalendarListItem[]> => {
    if (!accessToken) {
        throw new Error('Not authenticated. Please sign in first.');
    }

    try {
        const response = await fetch(
            'https://www.googleapis.com/calendar/v3/users/me/calendarList',
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Calendar List API error:', errorData);
            throw new Error(errorData.error?.message || 'Failed to fetch calendar list');
        }

        const data = await response.json();
        console.log('Calendar list fetched:', data);

        return data.items.map((item: any) => ({
            id: item.id,
            summary: item.summary,
            backgroundColor: item.backgroundColor || '#039BE5',
            accessRole: item.accessRole
        }));
    } catch (error) {
        console.error('Error fetching calendar list:', error);
        throw error;
    }
};

export const isSignedIn = (): boolean => {
    return accessToken !== null;
};

export const createCalendarEvent = async (
    event: CalendarEvent,
    calendarId: string = 'primary'
): Promise<CalendarApiResponse> => {
    if (!accessToken) {
        throw new Error('User not signed in');
    }

    // Get user's timezone
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Convert to Google Calendar resource format
    const resource: any = {
        summary: event.title,
        location: event.location,
        description: event.description,
        start: event.time ? {
            dateTime: `${event.date}T${event.time}:00`,
            timeZone: timeZone
        } : {
            date: event.date // All-day event
        },
        end: event.time ? {
            dateTime: new Date(new Date(`${event.date}T${event.time}:00`).getTime() + (event.durationMinutes || 60) * 60000).toISOString().slice(0, 19),
            timeZone: timeZone
        } : {
            date: event.date
        }
    };

    // Add reminders if specified
    if (event.reminders && event.reminders.length > 0) {
        resource.reminders = {
            useDefault: false,
            overrides: event.reminders.map(r => ({
                method: r.method,
                minutes: r.minutes
            }))
        };
    }

    // Add recurrence if present
    if (event.recurrence && event.recurrence.length > 0) {
        resource.recurrence = event.recurrence;
    }

    console.log('Creating event with resource:', resource);
    console.log('Calendar ID:', calendarId);
    console.log('Timezone:', timeZone);

    try {
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(resource)
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Calendar API error:', errorData);
            throw new Error(errorData.error?.message || 'Failed to create event');
        }

        const data: CalendarApiResponse = await response.json();
        console.log('Google Calendar API response:', data);
        return data;
    } catch (error) {
        console.error('Error creating calendar event:', error);
        throw error;
    }
};
