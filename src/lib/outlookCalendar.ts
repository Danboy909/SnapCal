import {
    PublicClientApplication,
    type AccountInfo,
    InteractionRequiredAuthError,
} from '@azure/msal-browser';
import type { CalendarEvent, CalendarApiResponse } from '../types';

const CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID as string;
const REDIRECT_URI = window.location.origin + '/';
const SCOPES = ['Calendars.ReadWrite', 'User.Read'];

const msalConfig = {
    auth: {
        clientId: CLIENT_ID,
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: REDIRECT_URI,
        navigateToLoginRequestUrl: true,
    },
    cache: {
        cacheLocation: 'localStorage' as const,
        storeAuthStateInCookie: false,
    },
};

let msalInstance: PublicClientApplication | null = null;
let initPromise: Promise<void> | null = null;

export const initOutlookClient = (): Promise<void> => {
    if (!CLIENT_ID) return Promise.resolve();

    // Return existing promise if currently initializing to prevent race conditions
    if (initPromise) return initPromise;

    // If it's already fully initialized (e.g. strict mode re-render), skip
    if (msalInstance) return Promise.resolve();

    initPromise = (async () => {
        const newInstance = new PublicClientApplication(msalConfig);
        await newInstance.initialize();

        // Set global only after successful initialization
        msalInstance = newInstance;

        // Handle redirect response if returning from redirect flow
        await msalInstance.handleRedirectPromise();
    })();

    return initPromise;
};

export const isOutlookSignedIn = (): boolean => {
    if (!msalInstance) return false;
    return msalInstance.getAllAccounts().length > 0;
};

export const getOutlookAccount = (): AccountInfo | null => {
    if (!msalInstance) return null;
    const accounts = msalInstance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
};

export const getOutlookUserEmail = (): string | null => {
    return getOutlookAccount()?.username ?? null;
};

export const signInOutlook = async (): Promise<void> => {
    if (!msalInstance) throw new Error('MSAL not initialized');
    await msalInstance.loginRedirect({
        scopes: SCOPES,
        prompt: 'select_account',
    });
};

export const switchOutlookAccount = async (): Promise<void> => {
    if (!msalInstance) throw new Error('MSAL not initialized');
    await msalInstance.loginRedirect({
        scopes: SCOPES,
        prompt: 'select_account',
    });
};

export const signOutOutlook = async (): Promise<void> => {
    if (!msalInstance) return;
    const account = getOutlookAccount();
    if (!account) return;
    await msalInstance.logoutRedirect({ account });
};

export const acquireOutlookToken = async (): Promise<string> => {
    if (!msalInstance) throw new Error('MSAL not initialized');
    const account = getOutlookAccount();
    if (!account) throw new Error('No Outlook account signed in');

    try {
        const result = await msalInstance.acquireTokenSilent({
            scopes: SCOPES,
            account,
        });
        return result.accessToken;
    } catch (err) {
        if (err instanceof InteractionRequiredAuthError) {
            await msalInstance.acquireTokenRedirect({
                scopes: SCOPES,
                account,
            });
            // It will navigate away, so throw a cancellation error locally
            throw new Error('Redirecting for authentication...');
        }
        throw err;
    }
};

export const createOutlookEvent = async (
    event: CalendarEvent
): Promise<CalendarApiResponse> => {
    const accessToken = await acquireOutlookToken();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    let startObj: { dateTime: string; timeZone: string } | { date: string };
    let endObj: { dateTime: string; timeZone: string } | { date: string };

    if (event.time) {
        const startIso = `${event.date}T${event.time}:00`;
        const endIso = new Date(
            new Date(startIso).getTime() + (event.durationMinutes || 60) * 60000
        )
            .toISOString()
            .slice(0, 19);
        startObj = { dateTime: startIso, timeZone };
        endObj = { dateTime: endIso, timeZone };
    } else {
        // All-day event: Microsoft Graph expects the next day as end
        const nextDay = new Date(event.date);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().slice(0, 10);
        startObj = { date: event.date };
        endObj = { date: nextDayStr };
    }

    // Strip placeholder/empty values – Graph API rejects them with "unable to deserialize"
    const locationValue = event.location?.trim();
    const isRealLocation = locationValue && locationValue.toLowerCase() !== 'tbd' && locationValue !== 'N/A';
    const descriptionValue = event.description?.trim();

    const body: Record<string, unknown> = {
        subject: event.title,
        start: startObj,
        end: endObj,
        ...(isRealLocation && { location: { displayName: locationValue } }),
        ...(descriptionValue && {
            body: { contentType: 'text', content: descriptionValue },
        }),
    };

    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.json();
        console.error('Graph API error body:', JSON.stringify(err, null, 2));
        throw new Error(
            err?.error?.message || `Graph API error ${response.status}`
        );
    }

    const data = await response.json();
    // Map Graph response to our shared CalendarApiResponse shape
    return {
        id: data.id,
        htmlLink: data.webLink,
        summary: data.subject,
        start: data.start,
        end: data.end,
    };
};
