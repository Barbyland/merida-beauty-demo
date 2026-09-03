import { copyFile } from 'node:fs/promises';

// Assets contain no credentials; the panel itself is served after authentication.
await Promise.all(['js', 'css'].map(ext => copyFile(
  new URL(`../integration/admin.${ext}`, import.meta.url),
  new URL(`../public/booking-admin.${ext}`, import.meta.url),
)));
