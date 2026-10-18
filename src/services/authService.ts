import { z } from "zod";
import type {
  AuthChangeEvent,
  Session,
  Subscription,
  User,
} from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export const credentialsSchema = z.object({
  email: z
    .string()
    .min(1, "L'adresse e-mail est requise.")
    .trim()
    .email("Veuillez saisir une adresse e-mail valide."),
  password: z
    .string()
    .min(1, "Le mot de passe est requis.")
    .min(6, "Le mot de passe doit comporter au moins 6 caractères."),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: { message: string } | null;
}

export function translateAuthError(err: unknown): string {
  if (!err) return "Une erreur inattendue est survenue.";

  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : "";
  const message =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message?: unknown }).message ?? "")
      : String(err);

  const lowerCode = code.toLowerCase();
  const lowerMsg = message.toLowerCase();

  if (
    lowerCode === "invalid_credentials" ||
    lowerMsg.includes("invalid login credentials") ||
    lowerMsg.includes("invalid credentials") ||
    lowerMsg.includes("invalid username or password")
  ) {
    return "Adresse e-mail ou mot de passe incorrect.";
  }

  if (
    lowerCode === "email_not_confirmed" ||
    lowerMsg.includes("email not confirmed")
  ) {
    return "Confirmez votre adresse e-mail avant de vous connecter.";
  }

  if (
    lowerCode === "user_already_exists" ||
    lowerMsg.includes("user already registered") ||
    lowerMsg.includes("user already exists")
  ) {
    return "Un compte existe déjà avec cette adresse e-mail.";
  }

  if (
    lowerCode === "weak_password" ||
    lowerMsg.includes("weak password") ||
    lowerMsg.includes("password should be at least")
  ) {
    return "Choisissez un mot de passe plus robuste.";
  }

  if (
    lowerCode.includes("rate_limit") ||
    lowerCode.includes("over_") ||
    lowerMsg.includes("rate limit") ||
    lowerMsg.includes("too many requests")
  ) {
    return "Trop de tentatives. Patientez quelques instants puis réessayez.";
  }

  if (
    lowerMsg.includes("fetch") ||
    lowerMsg.includes("network") ||
    lowerMsg.includes("failed to fetch") ||
    lowerMsg.includes("network request failed")
  ) {
    return "Connexion au serveur impossible. Vérifiez votre connexion réseau puis réessayez.";
  }

  return message || "Une erreur inattendue est survenue.";
}

export async function signIn(credentials: Credentials): Promise<AuthResult> {
  try {
    const validation = credentialsSchema.safeParse(credentials);
    if (!validation.success) {
      return {
        user: null,
        session: null,
        error: { message: validation.error.issues[0]?.message ?? "Identifiants invalides." },
      };
    }

    if (!supabase) {
      return {
        user: null,
        session: null,
        error: { message: "Client Supabase non disponible." },
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: validation.data.email,
      password: validation.data.password,
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: { message: translateAuthError(error) },
      };
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (err) {
    return {
      user: null,
      session: null,
      error: { message: translateAuthError(err) },
    };
  }
}

export async function signUp(credentials: Credentials): Promise<AuthResult> {
  try {
    const validation = credentialsSchema.safeParse(credentials);
    if (!validation.success) {
      return {
        user: null,
        session: null,
        error: { message: validation.error.issues[0]?.message ?? "Identifiants invalides." },
      };
    }

    if (!supabase) {
      return {
        user: null,
        session: null,
        error: { message: "Client Supabase non disponible." },
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: { message: translateAuthError(error) },
      };
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (err) {
    return {
      user: null,
      session: null,
      error: { message: translateAuthError(err) },
    };
  }
}

export async function signOut(): Promise<{ error: { message: string } | null }> {
  try {
    if (!supabase) return { error: null };
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: { message: translateAuthError(error) } };
    }
    return { error: null };
  } catch (err) {
    return { error: { message: translateAuthError(err) } };
  }
}

export async function getSession(): Promise<{
  session: Session | null;
  error: { message: string } | null;
}> {
  try {
    if (!supabase) return { session: null, error: null };
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { session: null, error: { message: translateAuthError(error) } };
    }
    return { session: data.session, error: null };
  } catch (err) {
    return { session: null, error: { message: translateAuthError(err) } };
  }
}

export async function getCurrentUser(): Promise<{
  user: User | null;
  error: { message: string } | null;
}> {
  try {
    if (!supabase) return { user: null, error: null };
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return { user: null, error: { message: translateAuthError(error) } };
    }
    return { user: data.user, error: null };
  } catch (err) {
    return { user: null, error: { message: translateAuthError(err) } };
  }
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): { data: { subscription: Subscription } } {
  if (!supabase) {
    return {
      data: {
        subscription: {
          id: "local-noop",
          callback: () => {},
          unsubscribe: () => {},
        },
      },
    };
  }
  return supabase.auth.onAuthStateChange(callback);
}

export const authService = {
  credentialsSchema,
  translateAuthError,
  signIn,
  signUp,
  signOut,
  getSession,
  getCurrentUser,
  onAuthStateChange,
};
