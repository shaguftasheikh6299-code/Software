import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import MobileScanner from './components/MobileScanner.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

function getRoute() {
  const path = window.location.pathname;
  const match = path.match(/^\/scanner\/([A-Za-z0-9]+)/);
  if (match) {
    return { type: 'mobile-scanner' as const, sessionId: match[1] };
  }
  return { type: 'app' as const };
}

const route = getRoute();
const root = createRoot(document.getElementById('root')!);

if (route.type === 'mobile-scanner') {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <MobileScanner sessionId={route.sessionId} />
      </ErrorBoundary>
    </StrictMode>
  );
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
