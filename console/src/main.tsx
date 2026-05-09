import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { initSentry, Sentry } from './lib/sentry';

initSentry('console');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm bg-ink-800 border border-ink-700 rounded-lg p-8 text-center">
        <h1 className="text-ink-50 font-semibold mb-2">Something went wrong</h1>
        <p className="text-ink-300 text-sm mb-6">Refresh to try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-brand-500 hover:bg-brand-600 text-ink-950 font-medium py-2.5 rounded-md transition-colors text-sm"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
