import { createRoot } from 'react-dom/client';
import App from './App';

// Fonts are bundled so the event runs without internet
import '@fontsource/noto-sans-arabic/400.css';
import '@fontsource/noto-sans-arabic/500.css';
import '@fontsource/noto-sans-arabic/600.css';
import '@fontsource/noto-sans-arabic/700.css';
import '@fontsource/noto-sans-arabic/800.css';
import '@fontsource/noto-sans-arabic/900.css';
import './index.css';

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => console.error(error, errorInfo.componentStack),
}).render(<App />);
