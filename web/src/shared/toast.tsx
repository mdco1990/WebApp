import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

type Toast = { id: string; message: string; type?: 'info' | 'success' | 'error' }

type Ctx = {
  toasts: Toast[]
  push: (message: string, type?: Toast['type']) => void
  remove: (id: string) => void
}

const ToastCtx = createContext<Ctx | null>(null)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), [])

  const push = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => remove(id), 3500)
  }, [remove])

  const value = useMemo(() => ({ toasts, push, remove }), [toasts, push, remove])

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} className={`alert alert-${t.type === 'error' ? 'danger' : t.type === 'success' ? 'success' : 'secondary'} py-2 px-3`} role="alert">
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('ToastProvider missing')
  return ctx
}
