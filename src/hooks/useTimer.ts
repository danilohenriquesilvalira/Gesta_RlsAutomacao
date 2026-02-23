'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsed: number;
}

export function useTimer() {
  const [state, setState] = useState<TimerState>({
    isRunning: false,
    startTime: null,
    elapsed: 0,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Restore from localStorage
    const saved = localStorage.getItem('fieldsync_timer');
    if (saved) {
      const parsed = JSON.parse(saved) as TimerState;
      if (parsed.isRunning && parsed.startTime) {
        setState(parsed);
      }
    }
  }, []);

  useEffect(() => {
    if (state.isRunning && state.startTime) {
      intervalRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          elapsed: Date.now() - (prev.startTime ?? Date.now()),
        }));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Persist
    localStorage.setItem('fieldsync_timer', JSON.stringify(state));

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning, state.startTime]);

  const start = useCallback(() => {
    const now = Date.now();
    setState({ isRunning: true, startTime: now, elapsed: 0 });
  }, []);

  const stop = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: false }));
    localStorage.removeItem('fieldsync_timer');
  }, []);

  const reset = useCallback(() => {
    setState({ isRunning: false, startTime: null, elapsed: 0 });
    localStorage.removeItem('fieldsync_timer');
  }, []);

  const formatElapsed = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRunning: state.isRunning,
    elapsed: state.elapsed,
    startTime: state.startTime,
    formatted: formatElapsed(state.elapsed),
    start,
    stop,
    reset,
  };
}
