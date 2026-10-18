import { useSyncExternalStore } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isLocalMode } from "../config/storageMode";
import {
  Credentials,
  getSession,
  onAuthStateChange,
  signIn,
  signOut,
  signUp,
} from "../services/authService";
import { clearLocalCache } from "../services/syncService";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}

let authState: AuthState = {
  user: null,
  session: null,
  isLoading: !isLocalMode,
  error: null,
};

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function updateState(patch: Partial<AuthState>) {
  authState = { ...authState, ...patch };
  notify();
}

if (!isLocalMode) {
  getSession()
    .then(({ session, error }) => {
      updateState({
        session,
        user: session?.user ?? null,
        isLoading: false,
        error: error ? error.message : null,
      });
    })
    .catch(() => {
      updateState({ isLoading: false });
    });

  onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT") {
      await clearLocalCache();
      updateState({
        user: null,
        session: null,
        isLoading: false,
      });
    } else if (session) {
      updateState({
        session,
        user: session.user,
        isLoading: false,
      });
    } else {
      updateState({
        session: null,
        user: null,
        isLoading: false,
      });
    }
  });
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): AuthState {
  return authState;
}

function getServerSnapshot(): AuthState {
  return {
    user: null,
    session: null,
    isLoading: !isLocalMode,
    error: null,
  };
}

async function handleSignIn(credentials: Credentials) {
  const result = await signIn(credentials);
  if (result.error) {
    updateState({ error: result.error.message });
  } else {
    updateState({
      user: result.user,
      session: result.session,
      error: null,
    });
  }
  return result;
}

async function handleSignUp(credentials: Credentials) {
  const result = await signUp(credentials);
  if (result.error) {
    updateState({ error: result.error.message });
  } else {
    updateState({
      user: result.user,
      session: result.session,
      error: null,
    });
  }
  return result;
}

async function handleSignOut() {
  await clearLocalCache();
  const result = await signOut();
  updateState({
    user: null,
    session: null,
    error: result.error ? result.error.message : null,
  });
  return result;
}

function clearError() {
  updateState({ error: null });
}

export function useAuth() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    user: state.user,
    session: state.session,
    isLoading: state.isLoading,
    isAuthenticated: Boolean(state.user),
    error: state.error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    clearError,
  };
}
