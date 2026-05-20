import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export const initSentry = () => {
  const environment = import.meta.env.MODE || 'development';
  const isDev = environment === 'development';

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || 'https://your-sentry-dsn@sentry.io/project-id',
    environment,
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: isDev ? 1.0 : 0.1,
    replaysSessionSampleRate: isDev ? 1.0 : 0.1,
    replaysOnErrorSampleRate: 1.0,
    enabled: !isDev, // Desabilita em desenvolvimento
    beforeSend(event, hint) {
      // Filtra erros de rede conhecidos
      if (event.exception) {
        const error = hint.originalException;
        if (error?.message?.includes('Network')) {
          return null; // Ignora erros de rede genéricos
        }
      }
      return event;
    },
  });
};

export const captureException = (error, context = {}) => {
  Sentry.captureException(error, {
    contexts: {
      application: context,
    },
  });
};

export const captureMessage = (message, level = 'info') => {
  Sentry.captureMessage(message, level);
};

export const setUser = (user) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.full_name,
    });
  } else {
    Sentry.setUser(null);
  }
};

export const addBreadcrumb = (message, category = 'user-action', data = {}) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};