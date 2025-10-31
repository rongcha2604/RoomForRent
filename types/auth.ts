export interface User {
  id: number;
  email: string;
  passwordHash: string;
  authProvider: 'local'; // Authentication provider
  createdAt: string;
}

export interface Session {
  userId: number;
  email: string;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
}

const SESSION_KEY = 'nhatro_session';

export function getSession(): Session | null {
  try {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (!sessionStr) return null;
    return JSON.parse(sessionStr);
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
