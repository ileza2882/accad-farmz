/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging service worker.
 *
 * This is what receives notifications when the ACCAD FARMS tab is closed or in the background. It
 * runs outside the app bundle in its own worker context, so it cannot import anything from lib/ and
 * has to pull the Firebase SDK in itself.
 *
 * Config arrives as query parameters on the registration URL rather than being baked in, because
 * this file is copied verbatim from public/ to dist/ by build-wasm.mjs and never passes through
 * esbuild - there is no build step here that could substitute import.meta.env values.
 * See registerServiceWorker() in lib/pushNotifications.ts for the matching registration call.
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);

const firebaseConfig = {
  apiKey: params.get('apiKey') || '',
  authDomain: params.get('authDomain') || '',
  projectId: params.get('projectId') || '',
  storageBucket: params.get('storageBucket') || '',
  messagingSenderId: params.get('messagingSenderId') || '',
  appId: params.get('appId') || ''
};

// Without a projectId there is nothing to initialise against. Staying silent beats throwing on
// every page load in an install that has not configured Firebase yet.
if (firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(payload => {
    const data = payload.data || {};
    const title = data.title || 'ACCAD FARMS';
    const options = {
      body: data.message || '',
      icon: '/accad_logo.png',
      badge: '/accad_logo.png',
      // Collapse repeat notifications about the same record instead of stacking a dozen of them.
      tag: data.notificationId || data.kind || 'accad-notification',
      renotify: true,
      data: {
        url: data.url || '/notifications',
        notificationId: data.notificationId || ''
      }
    };
    return self.registration.showNotification(title, options);
  });
}

/**
 * Focus an already-open ACCAD FARMS tab rather than opening a duplicate, then route it to the page
 * the notification refers to.
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            return client.navigate(targetUrl).then(c => c && c.focus());
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});

// A newly deployed worker should take over immediately. Otherwise a staff member who leaves the
// tab open for days keeps running the old handler and silently misses notifications.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
