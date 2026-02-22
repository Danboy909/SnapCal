import { useState, useEffect } from 'react';
import { UploadArea } from './components/UploadArea';
import { TextInputArea } from './components/TextInputArea';
import { EventCard } from './components/EventCard';
import { EventList } from './components/EventList';
import { Toast } from './components/Toast';
import { CalendarSelector } from './components/CalendarSelector';
import { ReminderSettings } from './components/ReminderSettings';
import { CalendarProviderSelector } from './components/CalendarProviderSelector';
import { AnalysisProgress, EventListSkeleton } from './components/AnalysisProgress';
import type { AnalysisStep } from './components/AnalysisProgress';
import { ErrorBoundary } from './components/ErrorBoundary';
import { extractEventFromImage, extractEventFromText } from './lib/gemini';
import { track } from '@vercel/analytics';
import { initGoogleClient, signIn, isSignedIn, createCalendarEvent, signOut, fetchCalendarList } from './lib/googleCalendar';
import { initOutlookClient, isOutlookSignedIn, signInOutlook, signOutOutlook, getOutlookUserEmail, createOutlookEvent } from './lib/outlookCalendar';
import { downloadIcs } from './lib/icsDownload';
import type { CalendarEvent, EventReminder, CalendarProvider } from './types';
import { Calendar, Loader2, AlertCircle, X, Camera, PenLine, Sun, Moon, Link2Off } from 'lucide-react';
import clsx from 'clsx';
import logoImage from './Logo/Whisk_0f9ba787d4fc4a694914ad3fae3c3a5ceg.png';

function App() {
  const [currentEvents, setCurrentEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = sessionStorage.getItem('snapcal_events');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(() => {
    try {
      const saved = sessionStorage.getItem('snapcal_editing');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; link?: string; fallbackAction?: () => void }>>([]);
  const [isCreatingEvents, setIsCreatingEvents] = useState(false);
  const [inputMode, setInputMode] = useState<'image' | 'text'>(() => {
    return (sessionStorage.getItem('snapcal_inputMode') as 'image' | 'text') || 'text';
  });

  useEffect(() => {
    sessionStorage.setItem('snapcal_events', JSON.stringify(currentEvents));
  }, [currentEvents]);

  useEffect(() => {
    if (editingEvent) {
      sessionStorage.setItem('snapcal_editing', JSON.stringify(editingEvent));
    } else {
      sessionStorage.removeItem('snapcal_editing');
    }
  }, [editingEvent]);

  useEffect(() => {
    sessionStorage.setItem('snapcal_inputMode', inputMode);
  }, [inputMode]);
  const [selectedGoogleCalendarId, setSelectedGoogleCalendarId] = useState<string>('primary');
  const [defaultReminders, setDefaultReminders] = useState<EventReminder[]>([]);

  // Multi-Account State
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  // Optional: fetch Google email later if needed, but for now we won't show it unless fetched
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);

  const [isMicrosoftSignedIn, setIsMicrosoftSignedIn] = useState(false);
  const [msUserEmail, setMsUserEmail] = useState<string | null>(null);

  const [defaultProvider, setDefaultProvider] = useState<CalendarProvider>('google');
  const [showProviderPicker, setShowProviderPicker] = useState(false);

  // Init block state

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const hasGoogleKeys = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const hasMicrosoftKey = !!import.meta.env.VITE_MICROSOFT_CLIENT_ID;

  // Init auth clients
  useEffect(() => {
    const savedDefault = localStorage.getItem('snapcal_default_provider') as CalendarProvider;
    if (savedDefault) {
      setDefaultProvider(savedDefault);
    }

    if (hasGoogleKeys) {
      initGoogleClient()
        .then(() => {
          setIsGoogleSignedIn(isSignedIn());
          if (isSignedIn()) {
            // Optional: try to fetch email from calendar list or profile
            fetchCalendarList().then(list => {
              const primary = list.find(l => l.id.includes('@'));
              if (primary) setGoogleEmail(primary.id);
            }).catch(() => { });
          }
        })
        .catch((err) => console.error('Failed to init Google', err));
    }

    if (hasMicrosoftKey) {
      initOutlookClient()
        .then(() => {
          setIsMicrosoftSignedIn(isOutlookSignedIn());
          if (isOutlookSignedIn()) {
            setMsUserEmail(getOutlookUserEmail());
          }
        })
        .catch((err: unknown) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error('Failed to init MSAL', errorMessage);
          // Let's not show an error on mount just yet, but log it explicitly.
          // The real issue might be that handleConnectOutlook fires before init finishes.
        });
    }
  }, [hasGoogleKeys, hasMicrosoftKey]);

  const handleSetDefaultProvider = (provider: CalendarProvider) => {
    setDefaultProvider(provider);
    localStorage.setItem('snapcal_default_provider', provider);
  };

  // Auth Action Handlers
  const handleConnectGoogle = async () => {
    try {
      await signIn();
      setIsGoogleSignedIn(true);
      fetchCalendarList().then(list => {
        const primary = list.find(l => l.id.includes('@'));
        if (primary) setGoogleEmail(primary.id);
      }).catch(() => { });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Google Sign In failed: ${errorMessage}`);
    }
  };

  const handleDisconnectGoogle = () => {
    signOut();
    setIsGoogleSignedIn(false);
    setGoogleEmail(null);
  };

  const handleConnectOutlook = async () => {
    try {
      // Ensure MSAL is initialized before proceeding (handles race conditions on fast clicks)
      await initOutlookClient();
      await signInOutlook();
      // Execution stops here as the page redirects to Microsoft.
      // After redirecting back, the useEffect on mount will update isMicrosoftSignedIn and msUserEmail.
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Outlook Sign In failed: ${errorMessage}`);
    }
  };

  const handleDisconnectOutlook = async () => {
    await signOutOutlook();
    setIsMicrosoftSignedIn(false);
    setMsUserEmail(null);
  };

  const handleImageSelect = async (base64: string) => {
    if (!base64) {
      setCurrentEvents([]);
      setEditingEvent(null);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep('uploading');
    setError(null);
    setSuccessMessage(null);

    try {
      // Brief pause so user sees the 'uploading' step
      await new Promise(r => setTimeout(r, 400));
      setAnalysisStep('analyzing');
      const result = await extractEventFromImage(base64);
      setAnalysisStep('extracting');
      await new Promise(r => setTimeout(r, 350));

      if (result.events && result.events.length > 0) {
        const eventsWithIds = result.events.map((event, index) => ({
          ...event,
          id: `event-${Date.now()}-${index}`,
          selected: true,
          durationMinutes: event.durationMinutes || 60
        }));
        setAnalysisStep('done');
        await new Promise(r => setTimeout(r, 600));
        setCurrentEvents(eventsWithIds);
        track('image_analyzed', { event_count: eventsWithIds.length });
      } else {
        setError('No calendar events detected in this image. Try uploading a screenshot with visible dates, times, or event details.');
        track('image_analyzed', { event_count: 0 });
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Gemini API Error: ${errorMessage}`);
      track('analysis_error', { type: 'image', message: errorMessage });
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep(null);
    }
  };

  const handleTextSubmit = async (text: string) => {
    if (!text.trim()) return;

    setIsAnalyzing(true);
    setAnalysisStep('analyzing');
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await extractEventFromText(text);
      setAnalysisStep('extracting');
      await new Promise(r => setTimeout(r, 350));

      if (result.events && result.events.length > 0) {
        const eventsWithIds = result.events.map((event, index) => ({
          ...event,
          id: `event-${Date.now()}-${index}`,
          selected: true,
          durationMinutes: event.durationMinutes || 60
        }));
        setAnalysisStep('done');
        await new Promise(r => setTimeout(r, 600));
        setCurrentEvents(eventsWithIds);
        track('text_analyzed', { event_count: eventsWithIds.length });
      } else {
        setError('No calendar events detected in this text.');
        track('text_analyzed', { event_count: 0 });
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Gemini API Error: ${errorMessage}`);
      track('analysis_error', { type: 'text', message: errorMessage });
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep(null);
    }
  };

  const executeAddBatch = async (provider: CalendarProvider) => {
    const selectedEvents = currentEvents.filter(e => e.selected);
    if (selectedEvents.length === 0) return;

    // --- Client-side rate limiting for calendar event creation ---
    // Max 50 events created per hour, tracked in localStorage
    const EVENT_RATE_LIMIT = 50;
    const HOUR_MS = 60 * 60 * 1000;
    const now = Date.now();
    let creationTimestamps: number[] = [];
    try {
      creationTimestamps = JSON.parse(localStorage.getItem('snapcal_event_creation_log') || '[]');
    } catch { creationTimestamps = []; }
    creationTimestamps = creationTimestamps.filter((t: number) => now - t < HOUR_MS);
    if (creationTimestamps.length + selectedEvents.length > EVENT_RATE_LIMIT) {
      const oldestTs = creationTimestamps[0] || now;
      const resetInMinutes = Math.ceil((oldestTs + HOUR_MS - now) / 60000);
      setError(`Rate limit exceeded: you can only add ${EVENT_RATE_LIMIT} events per hour. Try again in ${resetInMinutes} minute(s).`);
      return;
    }

    setShowProviderPicker(false);
    setIsCreatingEvents(true);
    setError(null);

    try {
      if (provider === 'ics') {
        downloadIcs(selectedEvents);
        setCurrentEvents([]);
        setEditingEvent(null);
        setSuccessMessage(`Downloaded ${selectedEvents.length} event(s) as .ics`);
        setIsCreatingEvents(false);
        return;
      }

      if (provider === 'google') {
        if (!isGoogleSignedIn) {
          await handleConnectGoogle();
        }
        const results = await Promise.all(
          selectedEvents.map(event => {
            const eventWithReminders = {
              ...event,
              reminders: defaultReminders.length > 0 ? defaultReminders : event.reminders
            };
            return createCalendarEvent(eventWithReminders, selectedGoogleCalendarId);
          })
        );
        results.forEach((result, index) => {
          setToasts(prev => [...prev, {
            id: `toast-${Date.now()}-${index}`,
            message: `"${selectedEvents[index].title}" added to Google Calendar`,
            link: result.htmlLink
          }]);
        });
      }

      if (provider === 'outlook') {
        if (!isMicrosoftSignedIn) {
          await handleConnectOutlook();
        }
        const results = await Promise.all(
          selectedEvents.map(event => {
            const eventWithReminders = {
              ...event,
              // Note: MS Graph reminders require extension props, avoiding for now to keep it simple,
              // or just pass as-is if our library maps it eventually.
            };
            return createOutlookEvent(eventWithReminders);
          })
        );
        results.forEach((result, index) => {
          setToasts(prev => [...prev, {
            id: `toast-${Date.now()}-${index}`,
            message: `"${selectedEvents[index].title}" added to Outlook`,
            link: result.htmlLink
          }]);
        });
      }

      // Record timestamps of newly created events for rate limiting
      const newTimestamps = Array(selectedEvents.length).fill(Date.now());
      const updatedLog = [...creationTimestamps, ...newTimestamps];
      localStorage.setItem('snapcal_event_creation_log', JSON.stringify(updatedLog));
      track('events_added', { provider, count: selectedEvents.length });

      setCurrentEvents([]);
      setEditingEvent(null);
    } catch (err: any) {
      console.error('Batch creation error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to add events: ${errorMessage}`);
      track('calendar_error', { provider, message: errorMessage });

      // Offer fallback
      setToasts(prev => [...prev, {
        id: `toast-err-${Date.now()}`,
        message: 'Add to calendar failed. Download .ics instead?',
        fallbackAction: () => downloadIcs(selectedEvents)
      }]);
    } finally {
      setIsCreatingEvents(false);
    }
  };

  const handlePrimaryAddClick = () => {
    // Single provider shortcut or show picker

    // If strict match for default vs connected, we can bypass picker, 
    // but a picker is safer so user can choose ICS if they want.
    // Let's just always show the picker popover if there's multiple, or if nothing is connected.
    // If exactly the default provider is connected, we COULD auto-route, but picker gives better control.
    setShowProviderPicker(true);
  };

  return (
    <div className="app-container min-h-screen pb-20 transition-colors duration-300">
      <header className="premium-header">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <button
            onClick={() => {
              setCurrentEvents([]);
              setEditingEvent(null);
              setError(null);
              setSuccessMessage(null);
              setInputMode('image');
              setShowProviderPicker(false);
            }}
            className="flex items-center gap-3 text-slate-900 dark:text-slate-100 hover:opacity-80 transition-opacity group"
          >
            <img src={logoImage} alt="SnapCal Logo" className="w-10 h-10 object-contain rounded-xl shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform duration-300" />
            <span className="font-bold text-xl tracking-tight">SnapCal</span>
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className="premium-button-icon p-2 rounded-lg"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Google Pill */}
            {isGoogleSignedIn && (
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg pl-2 border border-slate-200 dark:border-slate-700">
                <CalendarSelector
                  selectedCalendarId={selectedGoogleCalendarId}
                  onSelectCalendar={setSelectedGoogleCalendarId}
                />
                <button
                  onClick={handleDisconnectGoogle}
                  className="p-2 text-slate-400 hover:text-red-500 rounded-r-lg border-l border-slate-200 dark:border-slate-700 transition-colors"
                  title="Disconnect Google"
                >
                  <Link2Off size={16} />
                </button>
              </div>
            )}

            {/* Outlook Pill */}
            {isMicrosoftSignedIn && (
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-200 dark:border-slate-700">
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
                  <rect x="1" y="4" width="14" height="16" rx="2" fill="#0072C6" />
                  <path d="M8 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" fill="white" />
                  <path d="M15 6h7v12h-7" fill="#0072C6" />
                  <path d="M15 10l4 2-4 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                  {msUserEmail || 'Outlook'}
                </span>
                <button
                  onClick={handleDisconnectOutlook}
                  className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                  title="Disconnect Outlook"
                >
                  <Link2Off size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        {isGoogleSignedIn && (
          <ReminderSettings
            reminders={defaultReminders}
            onChange={setDefaultReminders}
          />
        )}


        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            {successMessage}
            <button onClick={() => setSuccessMessage(null)} className="ml-auto text-green-600 hover:text-green-800">
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="space-y-6">
          {currentEvents.length === 0 && !isAnalyzing && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Never Manually Add an Event Again.</h1>
                <p className="text-slate-500 dark:text-slate-400">
                  Upload a screenshot or type the details — your calendar updates automatically.
                </p>
              </div>

              <div className="flex justify-center mb-8">
                <div className="bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-2xl inline-flex relative shadow-inner shadow-slate-200/50 dark:shadow-slate-900/50">
                  <button
                    onClick={() => { setInputMode('image'); setError(null); }}
                    className={clsx(
                      "flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300",
                      inputMode === 'image'
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    )}
                  >
                    <Camera size={18} /> Scan Image
                  </button>
                  <button
                    onClick={() => { setInputMode('text'); setError(null); }}
                    className={clsx(
                      "flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300",
                      inputMode === 'text'
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    )}
                  >
                    <PenLine size={18} /> Enter Details
                  </button>
                </div>
              </div>

              <ErrorBoundary section="the image scanner">
                {inputMode === 'image' ? (
                  <UploadArea onImageSelect={handleImageSelect} />
                ) : (
                  <TextInputArea onTextSubmit={handleTextSubmit} isAnalyzing={isAnalyzing} />
                )}
              </ErrorBoundary>
            </div>
          )}

          {isAnalyzing && (
            <div>
              <AnalysisProgress step={analysisStep} />
              {analysisStep === 'extracting' && (
                <div className="mt-4">
                  <EventListSkeleton count={2} />
                </div>
              )}
            </div>
          )}

          {currentEvents.length > 0 && !editingEvent && (
            <div className="animate-in zoom-in-50 duration-300 space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Review Events</h2>
                <p className="text-slate-500 dark:text-slate-400">Select which events to add to your calendar</p>
              </div>

              <ErrorBoundary section="the event list">
                <EventList
                  events={currentEvents}
                  onToggleSelect={(id) => setCurrentEvents(events => events.map(e => e.id === id ? { ...e, selected: !e.selected } : e))}
                  onSelectAll={() => setCurrentEvents(events => events.map(e => ({ ...e, selected: true })))}
                  onDeselectAll={() => setCurrentEvents(events => events.map(e => ({ ...e, selected: false })))}
                  onEdit={setEditingEvent}
                />
              </ErrorBoundary>

              <div className="flex justify-center gap-3 relative">
                <button
                  onClick={() => { setCurrentEvents([]); setError(null); setShowProviderPicker(false); }}
                  className="px-6 py-3 rounded-lg font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>

                <div className="relative">
                  <button
                    onClick={handlePrimaryAddClick}
                    disabled={isCreatingEvents || currentEvents.filter(e => e.selected).length === 0}
                    className={clsx(
                      "px-6 py-3 rounded-lg font-medium text-white transition-all shadow-sm flex items-center gap-2",
                      isCreatingEvents || currentEvents.filter(e => e.selected).length === 0
                        ? "bg-blue-400 dark:bg-blue-800 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"
                    )}
                  >
                    {isCreatingEvents ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
                    ) : (
                      <><Calendar size={18} /> Add {currentEvents.filter(e => e.selected).length} to Calendar</>
                    )}
                  </button>

                  {/* Provider Picker Popover */}
                  {showProviderPicker && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-[340px] bg-white dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-slate-100 dark:border-slate-700/50 p-4 z-50 animate-in slide-in-from-bottom-2 fade-in">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Choose Provider</span>
                        <button onClick={() => setShowProviderPicker(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
                      </div>
                      <CalendarProviderSelector
                        googleSignedIn={isGoogleSignedIn}
                        googleEmail={googleEmail}
                        outlookSignedIn={isMicrosoftSignedIn}
                        outlookEmail={msUserEmail}
                        defaultProvider={defaultProvider}
                        onSelect={executeAddBatch}
                        onSetDefault={handleSetDefaultProvider}
                        onConnectGoogle={handleConnectGoogle}
                        onConnectOutlook={handleConnectOutlook}
                        onDisconnectGoogle={handleDisconnectGoogle}
                        onDisconnectOutlook={handleDisconnectOutlook}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {editingEvent && (
            <div className="animate-in zoom-in-50 duration-300">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Edit Event</h2>
                <p className="text-slate-500 dark:text-slate-400">Adjust the details before adding to calendar</p>
              </div>

              <EventCard
                event={editingEvent}
                onUpdate={(upd) => {
                  setCurrentEvents(evs => evs.map(e => e.id === upd.id ? upd : e));
                  setEditingEvent(null);
                }}
                onConfirm={() => setEditingEvent(null)}
                onCancel={() => setEditingEvent(null)}
                isCreating={false}
              />
            </div>
          )}
        </div>
      </main>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="relative">
            <Toast
              message={toast.message}
              link={toast.link}
              onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            />
            {toast.fallbackAction && (
              <button
                onClick={() => {
                  toast.fallbackAction!();
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                }}
                className="absolute top-1/2 -translate-y-1/2 right-12 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200 transition-colors"
                style={{ zIndex: 60 }} // Above the Toast content but inside its container constraints
              >
                Download .ics
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
