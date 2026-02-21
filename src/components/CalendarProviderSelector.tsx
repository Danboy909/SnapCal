import type { CalendarProvider } from '../types';
import { Chrome, Mail, Download, Star, Link2, Link2Off } from 'lucide-react';
import clsx from 'clsx';

interface Props {
    googleSignedIn: boolean;
    googleEmail: string | null;
    outlookSignedIn: boolean;
    outlookEmail: string | null;
    defaultProvider: CalendarProvider;
    onSelect: (p: CalendarProvider) => void;
    onSetDefault: (p: CalendarProvider) => void;
    onConnectGoogle: () => void;
    onConnectOutlook: () => void;
    onDisconnectGoogle: () => void;
    onDisconnectOutlook: () => void;
}

interface ProviderOption {
    id: CalendarProvider;
    label: string;
    icon: React.ReactNode;
    email: string | null;
    connected: boolean;
    alwaysAvailable?: boolean;
    onConnect?: () => void;
    onDisconnect?: () => void;
}

export function CalendarProviderSelector({
    googleSignedIn,
    googleEmail,
    outlookSignedIn,
    outlookEmail,
    defaultProvider,
    onSelect,
    onSetDefault,
    onConnectGoogle,
    onConnectOutlook,
    onDisconnectGoogle,
    onDisconnectOutlook,
}: Props) {
    const options: ProviderOption[] = [
        {
            id: 'google',
            label: 'Google Calendar',
            icon: (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
            ),
            email: googleEmail,
            connected: googleSignedIn,
            onConnect: onConnectGoogle,
            onDisconnect: onDisconnectGoogle,
        },
        {
            id: 'outlook',
            label: 'Microsoft Outlook',
            icon: (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                    <rect x="1" y="4" width="14" height="16" rx="2" fill="#0072C6" />
                    <path d="M8 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" fill="white" />
                    <path d="M15 6h7v12h-7" fill="#0072C6" />
                    <path d="M15 10l4 2-4 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            email: outlookEmail,
            connected: outlookSignedIn,
            onConnect: onConnectOutlook,
            onDisconnect: onDisconnectOutlook,
        },
        {
            id: 'ics',
            label: 'Download .ics',
            icon: <Download className="w-5 h-5 text-emerald-500" />,
            email: null,
            connected: true,
            alwaysAvailable: true,
        },
    ];

    return (
        <div className="w-full space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                Add to Calendar
            </p>
            {options.map((opt) => {
                const isDefault = defaultProvider === opt.id;
                return (
                    <div
                        key={opt.id}
                        className={clsx(
                            'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group',
                            'hover:border-blue-400 dark:hover:border-blue-500',
                            'bg-white dark:bg-slate-800/60',
                            'border-slate-200 dark:border-slate-700'
                        )}
                    >
                        {/* Provider icon */}
                        <div className="shrink-0">{opt.icon}</div>

                        {/* Label + email */}
                        <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">
                                    {opt.label}
                                </span>
                                {isDefault && !opt.alwaysAvailable && (
                                    <span className="text-[10px] font-semibold uppercase tracking-wide bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full shrink-0">
                                        Default
                                    </span>
                                )}
                            </div>
                            {opt.email && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {opt.email}
                                </p>
                            )}
                            {!opt.connected && !opt.alwaysAvailable && (
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Not connected</p>
                            )}
                            {opt.alwaysAvailable && opt.id === 'ics' && (
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">Universal format for Apple Calendar,<br />Yahoo, and other apps</p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 justify-end">
                            {/* Set default star (only for connectable providers) */}
                            {!opt.alwaysAvailable && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSetDefault(opt.id);
                                    }}
                                    title={isDefault ? 'Default provider' : 'Set as default'}
                                    className={clsx(
                                        'p-1.5 rounded-lg transition-all',
                                        isDefault
                                            ? 'text-amber-400'
                                            : 'text-slate-300 dark:text-slate-600 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                                    )}
                                >
                                    <Star
                                        size={14}
                                        fill={isDefault ? 'currentColor' : 'none'}
                                        strokeWidth={2}
                                    />
                                </button>
                            )}

                            {/* Connect / disconnect toggle */}
                            {!opt.alwaysAvailable && (
                                opt.connected ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            opt.onDisconnect?.();
                                        }}
                                        title="Disconnect"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Link2Off size={14} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            opt.onConnect?.();
                                        }}
                                        title="Connect"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Link2 size={14} />
                                    </button>
                                )
                            )}

                            {/* Add to this calendar button */}
                            <button
                                onClick={() => onSelect(opt.id)}
                                className={clsx(
                                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                    opt.connected
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-default'
                                )}
                                disabled={!opt.connected}
                            >
                                {opt.alwaysAvailable ? 'Download' : opt.connected ? 'Add' : 'Connect first'}
                            </button>
                        </div>
                    </div>
                );
            })}

            {/* Unused imports suppressed — Chrome/Mail imported for possible future use */}
            <span className="hidden"><Chrome /><Mail /></span>
        </div>
    );
}
