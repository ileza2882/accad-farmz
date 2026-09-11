/**
 * Firebase Cloud Messaging - browser push notifications.
 *
 * WHAT THIS DOES AND DOES NOT COVER
 *
 * Push reaches a device that has already registered: the staff member opened the portal, granted
 * notification permission, and we stored their token. It is the right channel for "your report was
 * approved" or "a new log needs your review".
 *
 * It is NOT a delivery channel for a brand new account. Someone the ED registered five seconds ago
 * has never opened the app, has granted nothing, and has no token - there is physically nothing to
 * send to. Welcome credentials go by email (see lib/emailService.ts); that is not interchangeable.
 *
 * The Firebase SDK is pulled from Google's CDN on demand rather than bundled. The esbuild config in
 * build-wasm.mjs already carries hand-written shims for node built-ins, and adding a dependency
 * that reaches for them is a good way to break the build for a feature that is inert by default.
 * Loading on demand also means an install with no Firebase config pays nothing at all.
 */

const FIREBASE_SDK_VERSION = '10.12.2';
const SDK_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

export function getFirebaseConfig(): FirebaseWebConfig {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || ''
  };
}

/** True when this build has Firebase credentials AND the browser can actually do web push. */
export function isPushSupported(): boolean {
  const cfg = getFirebaseConfig();
  if (!cfg.projectId || !cfg.messagingSenderId || !cfg.vapidKey) return false;
  if (typeof window === 'undefined') return false;
  // iOS Safari only exposes these once the site is installed to the home screen, so a plain
  // capability check is genuinely the right gate rather than user-agent sniffing.
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/** Current permission state without prompting. */
export function getPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

let sdkPromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

async function loadFirebaseSdk(): Promise<any> {
  if (sdkPromise) return sdkPromise;

  sdkPromise = (async () => {
    await loadScript(`${SDK_BASE}/firebase-app-compat.js`);
    await loadScript(`${SDK_BASE}/firebase-messaging-compat.js`);
    const firebase = (window as any).firebase;
    if (!firebase) throw new Error('Firebase SDK loaded but did not register a global');

    const cfg = getFirebaseConfig();
    if (!firebase.apps.length) {
      firebase.initializeApp({
        apiKey: cfg.apiKey,
        authDomain: cfg.authDomain,
        projectId: cfg.projectId,
        storageBucket: cfg.storageBucket,
        messagingSenderId: cfg.messagingSenderId,
        appId: cfg.appId
      });
    }
    return firebase;
  })();

  try {
    return await sdkPromise;
  } catch (e) {
    // Let a later attempt retry rather than caching the failure for the life of the tab.
    sdkPromise = null;
    throw e;
  }
}

/**
 * Registers the FCM service worker, handing it the config on the query string.
 *
 * public/firebase-messaging-sw.js is copied byte for byte into dist/ and never sees the esbuild
 * define block, so query parameters are how it learns which Firebase project it belongs to.
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const cfg = getFirebaseConfig();
  const params = new URLSearchParams({
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
    messagingSenderId: cfg.messagingSenderId,
    appId: cfg.appId
  });
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`, {
    scope: '/'
  });
}

export interface PushRegistrationResult {
  success: boolean;
  token?: string;
  permission: NotificationPermission | 'unsupported';
  reason?: string;
}

/**
 * Asks for notification permission, obtains an FCM token and stores it against the user.
 *
 * Call this from a user gesture - a "Turn on notifications" button - not automatically on load.
 * A permission prompt fired unprompted is the fastest way to get permanently denied, and a denial
 * cannot be re-asked without the user digging through browser settings.
 */
export async function enablePushNotifications(user: {
  email: string;
  id?: string;
}): Promise<PushRegistrationResult> {
  if (!isPushSupported()) {
    return {
      success: false,
      permission: getPermissionState(),
      reason: 'Push notifications are not configured or not supported in this browser.'
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        permission,
        reason:
          permission === 'denied'
            ? 'Notifications are blocked for this site. Enable them in your browser settings to turn them back on.'
            : 'Notification permission was dismissed.'
      };
    }

    const firebase = await loadFirebaseSdk();
    const registration = await registerServiceWorker();
    const messaging = firebase.messaging();

    const token = await messaging.getToken({
      vapidKey: getFirebaseConfig().vapidKey,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      return { success: false, permission, reason: 'Firebase did not return a device token.' };
    }

    await saveTokenToServer(token, user);
    try {
      localStorage.setItem('accad_push_token', token);
    } catch (e) {}

    return { success: true, token, permission };
  } catch (e: any) {
    console.warn('[Push] Failed to enable notifications:', e);
    return {
      success: false,
      permission: getPermissionState(),
      reason: e?.message || 'Could not enable push notifications.'
    };
  }
}

async function saveTokenToServer(token: string, user: { email: string; id?: string }): Promise<void> {
  const res = await fetch('/api/push-register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      userEmail: user.email,
      userId: user.id,
      platform: 'web',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : ''
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Could not register this device for notifications (HTTP ${res.status}): ${body.slice(0, 200)}`);
  }
}

/**
 * Re-registers an already-permitted device on app start.
 *
 * FCM rotates tokens on its own schedule, and a rotated token that we never hear about is a device
 * that silently stops receiving anything. This is cheap, so run it on every authenticated load.
 * It never prompts: if permission was not already granted it does nothing at all.
 */
export async function refreshPushRegistration(user: { email: string; id?: string }): Promise<void> {
  if (!isPushSupported()) return;
  if (getPermissionState() !== 'granted') return;

  try {
    const firebase = await loadFirebaseSdk();
    const registration = await registerServiceWorker();
    const messaging = firebase.messaging();
    const token = await messaging.getToken({
      vapidKey: getFirebaseConfig().vapidKey,
      serviceWorkerRegistration: registration
    });
    if (!token) return;

    let previous = '';
    try {
      previous = localStorage.getItem('accad_push_token') || '';
    } catch (e) {}

    // Always re-post: the server uses it to bump lastSeenAt, which is what distinguishes a live
    // device from one that was cleared months ago.
    await saveTokenToServer(token, user);
    if (token !== previous) {
      try {
        localStorage.setItem('accad_push_token', token);
      } catch (e) {}
    }
  } catch (e) {
    console.warn('[Push] Token refresh failed:', e);
  }
}

/**
 * Handles notifications that arrive while the tab is focused.
 *
 * FCM deliberately does not display these - the service worker only fires when the page is in the
 * background - so without this a staff member watching the dashboard sees nothing at all.
 * Returns an unsubscribe function.
 */
export async function listenForForegroundMessages(
  onMessage: (n: { title: string; message: string; type: string; url?: string }) => void
): Promise<() => void> {
  if (!isPushSupported() || getPermissionState() !== 'granted') return () => {};

  try {
    const firebase = await loadFirebaseSdk();
    const messaging = firebase.messaging();
    return messaging.onMessage((payload: any) => {
      const data = payload?.data || {};
      onMessage({
        title: data.title || 'ACCAD FARMS',
        message: data.message || '',
        type: data.type || 'info',
        url: data.url
      });
    });
  } catch (e) {
    console.warn('[Push] Could not attach foreground listener:', e);
    return () => {};
  }
}

/**
 * Stops this device receiving notifications.
 *
 * Deletes the FCM token and drops the server row. Browser permission itself is left alone - only
 * the user can revoke that, from browser settings.
 */
export async function disablePushNotifications(): Promise<void> {
  let token = '';
  try {
    token = localStorage.getItem('accad_push_token') || '';
  } catch (e) {}

  try {
    const firebase = await loadFirebaseSdk();
    await firebase.messaging().deleteToken();
  } catch (e) {
    console.warn('[Push] Could not delete FCM token:', e);
  }

  if (token) {
    try {
      await fetch('/api/push-register', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
    } catch (e) {}
  }

  try {
    localStorage.removeItem('accad_push_token');
  } catch (e) {}
}
