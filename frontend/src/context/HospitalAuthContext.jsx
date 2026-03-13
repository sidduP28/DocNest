import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, getFirebaseError } from '../utils/firebase';
import axios from 'axios';

const HospitalAuthContext = createContext(null);
const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

export function HospitalAuthProvider({ children }) {
  const [hospital, setHospital] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We need to distinguish hospital auth from patient auth
    // We track hospital session in sessionStorage
    const unsub = onAuthStateChanged(auth, async (user) => {
      const hospitalSession = sessionStorage.getItem('docnest_hospital_session');
      if (user && hospitalSession === user.uid) {
        setFirebaseUser(user);
        try {
          const res = await axios.get(`${API}/api/hospital/profile?uid=${user.uid}`);
          setHospital(res.data);
        } catch {
          setHospital(null);
        }
      } else if (!hospitalSession) {
        setFirebaseUser(null);
        setHospital(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email, password) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const res = await axios.get(`${API}/api/hospital/profile?uid=${cred.user.uid}`);
      sessionStorage.setItem('docnest_hospital_session', cred.user.uid);
      setFirebaseUser(cred.user);
      setHospital(res.data);
      return { success: true };
    } catch (err) {
      const msg = err.response?.status === 404
        ? 'No hospital account found with this email.'
        : getFirebaseError(err.code);
      return { success: false, error: msg };
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
    sessionStorage.removeItem('docnest_hospital_session');
    setHospital(null);
    setFirebaseUser(null);
  }

  async function getToken() {
    return firebaseUser?.getIdToken();
  }

  return (
    <HospitalAuthContext.Provider value={{ hospital, firebaseUser, loading, login, register, logout, getToken, setHospital }}>
      {children}
    </HospitalAuthContext.Provider>
  );
}

export function useHospitalAuth() {
  return useContext(HospitalAuthContext);
}
