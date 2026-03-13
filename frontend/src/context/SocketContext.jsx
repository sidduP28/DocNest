import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);
const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(API, { transports: ['websocket', 'polling'], reconnectionAttempts: 10 });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', () => {
      setConnected(false);
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
      {!connected && (
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
