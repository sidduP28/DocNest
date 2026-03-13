import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

// Separate socket URL env var — only set this if you have a dedicated backend (e.g. Render).
// On Vercel-only deploys, leave VITE_SOCKET_URL blank to disable sockets.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || '';

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [everConnected, setEverConnected] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // If no socket URL is available (Vercel serverless), skip connecting entirely
    if (!SOCKET_URL) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setEverConnected(true);
      setShowBanner(false);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      // Only show banner if we were connected before (not on first load)
      if (everConnected) setShowBanner(true);
    });

    socket.on('connect_error', () => {
      setConnected(false);
      // Don't show banner on initial failed attempts — only after we were once connected
    });

    return () => { socket.disconnect(); };
  }, []);

  function joinRoom(userId) {
    if (socketRef.current && userId) {
      socketRef.current.emit('joinRoom', { userId });
    }
  }

  function joinHospitalRoom(hospitalId) {
    if (socketRef.current && hospitalId) {
      socketRef.current.emit('joinHospitalRoom', { hospitalId });
    }
  }

  function on(event, callback) {
    if (socketRef.current) socketRef.current.on(event, callback);
  }

  function off(event, callback) {
    if (socketRef.current) socketRef.current.off(event, callback);
  }

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, joinRoom, joinHospitalRoom, on, off }}>
      {showBanner && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white text-sm px-4 py-2 rounded-full shadow-lg reconnecting flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Connection lost. Reconnecting…
        </div>
      )}
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
