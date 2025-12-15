import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;

    // Send custom MTrans-branded verification email
    if (data.user && !data.session) {
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'verification',
            email: email,
            token: data.user.id, // Use user ID as reference
            redirectTo: `${window.location.origin}/`
          }
        });
      } catch (emailError) {
        console.error('Failed to send custom verification email:', emailError);
        // Don't throw - the default Supabase email will still be sent as fallback
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    // First request the password reset from Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) throw error;

    // Send custom MTrans-branded password reset email
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'password_reset',
          email: email,
          redirectTo: `${window.location.origin}/reset-password`
        }
      });
    } catch (emailError) {
      console.error('Failed to send custom password reset email:', emailError);
      // Don't throw - the default Supabase email will still be sent as fallback
    }
  };

  const sendMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });
    if (error) throw error;

    // Send custom MTrans-branded magic link email
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'magic_link',
          email: email,
          redirectTo: `${window.location.origin}/`
        }
      });
    } catch (emailError) {
      console.error('Failed to send custom magic link email:', emailError);
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    sendMagicLink,
    isAuthenticated: !!session,
  };
}
