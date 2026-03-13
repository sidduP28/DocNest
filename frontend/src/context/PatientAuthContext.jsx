import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, getFirebaseError } from '../utils/firebase';
import axios from 'axios';

const PatientAuthContext = createContext(null);

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

export function PatientAuthProvider({ children }) {
  const [patient, setPatient] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const res = await axios.get(`${API}/api/patient/profile?uid=${user.uid}`);
          setPatient(res.data);
        } catch {
          setPatient(null);
        }
      } else {
        setPatient(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email, password) {
    // Step 1: Firebase auth (must succeed)
    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error('Firebase Login Error:', err.code, err.message);
      return { success: false, error: getFirebaseError(err.code) };
    }
    // Step 2: Fetch profile (best-effort — don't block login if API is down)
    try {
      const res = await axios.get(`${API}/api/patient/profile?uid=${cred.user.uid}`);
      setPatient(res.data);
    } catch (profileErr) {
      console.warn('Profile fetch failed (API may be unavailable):', profileErr.message);
      // onAuthStateChanged will retry when context re-mounts
    }
    return { success: true };
  }

  async function loginWithGoogle() {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      try {
        const res = await axios.get(`${API}/api/patient/profile?uid=${cred.user.uid}`);
        setPatient(res.data);
      } catch {
        // Profile doesn't exist yet — will be created on register
        setPatient(null);
      }
      return { success: true, user: cred.user };
    } catch (err) {
      return { success: false, error: getFirebaseError(err.code) };
    }
  }

  async function register(email, password) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      return { success: true, uid: cred.user.uid };
    } catch (err) {
      return { success: false, error: getFirebaseError(err.code) };
    }
  }

  async function logout() {
    await signOut(auth);
    setPatient(null);
    setFirebaseUser(null);
  }

  async function updatePatient(id, updates) {
    try {
      const token = await firebaseUser?.getIdToken();
      const res = await axios.patch(`${API}/api/patient/profile/${id}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPatient(res.data);
      return res.data;
    } catch (err) {
      console.error('Update patient error:', err);
    }
  }

  async function getToken() {
    return firebaseUser?.getIdToken();
  }

  return (
    <PatientAuthContext.Provider value={{ patient, firebaseUser, loading, login, loginWithGoogle, register, logout, updatePatient, getToken, setPatient }}>
      {children}
    </PatientAuthContext.Provider>
  );
}

export function usePatientAuth() {
  return useContext(PatientAuthContext);
}
