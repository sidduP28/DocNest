import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

let messaging = null;
try {
  messaging = getMessaging(app);
} catch {
  console.warn('Firebase Messaging not supported in this environment');
}

const FIREBASE_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'This email is already registered.',
  'auth/wrong-password':       'Incorrect password.',
  'auth/user-not-found':       'No account found with this email.',
  'auth/weak-password':        'Password must be at least 6 characters.',
  'auth/invalid-email':        'Please enter a valid email address.',
  'auth/invalid-credential':   'Invalid email or password.',
  'auth/too-many-requests':    'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection.',
};

function getFirebaseError(code) {
  return FIREBASE_ERROR_MESSAGES[code] || 'Authentication error. Please try again.';
}

async function requestFCMToken() {
  if (!messaging) return null;
  try {
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    return token;
  } catch {
    return null;
  }
}

export { auth, googleProvider, messaging, getFirebaseError, requestFCMToken, onMessage };
