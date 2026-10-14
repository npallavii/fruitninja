import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

// Wait for the rounded fonts so canvas text and the logo render correctly from the first frame.
const fontsReady = document.fonts?.ready ?? Promise.resolve();
void Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))]).then(() => {
  createRoot(document.getElementById('root')!).render(<App />);
});
