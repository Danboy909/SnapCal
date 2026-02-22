import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
    children: ReactNode;
    /** Optional label shown in the error UI so users know which section failed */
    section?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            const { section } = this.props;
            return (
                <div className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-2xl">
                        ⚠️
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
                            Something went wrong{section ? ` in ${section}` : ''}
                        </h2>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1 max-w-md">
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </p>
                    </div>
                    <button
                        onClick={this.handleRetry}
                        className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                        Try again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
