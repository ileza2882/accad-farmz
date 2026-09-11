/// <reference types="vite/client" />

/**
 * Build-time configuration substituted by esbuild.
 *
 * These are declared explicitly because the values are injected through the `define` block in
 * build-wasm.mjs and dev-server.mjs rather than being read from a .env file by Vite itself, so
 * Vite's own ImportMetaEnv typing does not know about them.
 *
 * Everything here ships inside the client bundle and is public by definition. Server-only secrets
 * (FIREBASE_SERVICE_ACCOUNT, RESEND_API_KEY, GMAIL_APP_PASSWORD) must never be given a VITE_ prefix
 * or they would be published to every visitor.
 */
interface ImportMetaEnv {
  readonly VITE_INSFORGE_PROJECT_NAME: string;
  readonly VITE_INSFORGE_URL: string;
  readonly VITE_INSFORGE_API_KEY: string;
  readonly VITE_DISCONNECT_DATABASE: string;

  // Firebase Cloud Messaging web config.
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  /** Web Push certificate public key, from Firebase Console -> Cloud Messaging -> Web Push. */
  readonly VITE_FIREBASE_VAPID_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
