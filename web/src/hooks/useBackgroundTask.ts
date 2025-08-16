import { useState, useCallback } from 'react';

export interface BackgroundTask {
  taskState: 'idle' | 'processing' | 'completed' | 'error';
  taskId: string | null;
  result: unknown | null;
  error: string | null;
  startTask: (taskFn: () => Promise<unknown>) => Promise<void>;
  cancelTask: () => void;
  reset: () => void;
}

export function useBackgroundTask(): BackgroundTask {
  const [taskState, setTaskState] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startTask = useCallback(async (taskFn: () => Promise<unknown>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setTaskId(id);
    setTaskState('processing');
    setError(null);
    setResult(null);

    try {
      const taskResult = await taskFn();
      setResult(taskResult);
      setTaskState('completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Task failed');
      setTaskState('error');
    }
  }, []);

  const cancelTask = useCallback(() => {
    setTaskState('idle');
    setTaskId(null);
    setError(null);
    setResult(null);
  }, []);

  const reset = useCallback(() => {
    setTaskState('idle');
    setTaskId(null);
    setError(null);
    setResult(null);
  }, []);

  return {
    taskState,
    taskId,
    result,
    error,
    startTask,
    cancelTask,
    reset,
  };
}