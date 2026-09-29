import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";
import { ohneParameter } from "./utils/fehlerdiagnose";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    // Keine personenbezogenen Daten: weder Sentrys Standardangaben (IP, Cookies,
    // Kopfzeilen) noch Adressen mit Kennungen gespeicherter Berechnungen.
    sendDefaultPii: false,
    beforeSend(event) {
      delete event.user;
      if (event.request) {
        event.request.url = ohneParameter(event.request.url);
        delete event.request.query_string;
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data?.url) {
        breadcrumb.data.url = ohneParameter(String(breadcrumb.data.url));
      }
      // Eingaben in Formularen gehören nicht in die Spur
      if (breadcrumb.category === "ui.input") return null;
      return breadcrumb;
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
