/**
 * S01-06 ｜ Web entry point.
 *
 * 🔴 It does exactly one thing: mount the App Shell. It creates no service, opens no directory and
 *    performs no read - all of that is behind an explicit user action in `bootstrap.ts`.
 *
 * Compiled by `tsconfig.web.json`; `dist-web/index.html` loads the emitted `app/main.js`.
 */

import { startAppShell } from '../src/ui/bootstrap.js';

startAppShell(document.getElementById('app'));
