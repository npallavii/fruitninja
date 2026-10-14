// Serves the built game (dist/) on $PORT — used by hosts like Render when set up as a "Web Service".
import { preview } from 'vite';

const port = Number(process.env.PORT) || 4173;
const server = await preview({ preview: { host: '0.0.0.0', port, strictPort: true, allowedHosts: true } });
server.printUrls();
