// Tiny framework-agnostic event bus so any module (components, plain .ts
// helpers like googleAuth, API wrappers) can trigger a toast notification
// without needing React context plumbing. <Toaster /> (mounted once near
// the app root) subscribes and renders the stack.
export type ToastKind = 'success' | 'error' | 'info';
export interface ToastPayload { id: number; kind: ToastKind; message: string; }
type Listener = (t: ToastPayload) => void;
const listeners = new Set<Listener>();
let counter = 0;

function emit(kind: ToastKind, message: string) {
  const payload: ToastPayload = { id: ++counter, kind, message };
  listeners.forEach(l => l(payload));
}
export const toast = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message),
  info: (message: string) => emit('info', message),
};
export function subscribeToasts(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn); }
