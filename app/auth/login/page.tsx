"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleGoogle() {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (err) setError(err.message);
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div
      className="tc-login"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-background)",
        padding: 24,
      }}
    >
      <div
        className="tc-login__card"
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--surface-raised)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: 32,
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--font-size-xl)",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          Taste Canvas
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--font-size-sm)",
            color: "var(--text-tertiary)",
            marginBottom: 28,
          }}
        >
          Sign in to your canvas
        </p>

        {error && (
          <div
            className="tc-login__error"
            style={{
              background: "var(--status-error-subtle)",
              border: "1px solid var(--status-error)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 12px",
              marginBottom: 16,
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-xs)",
              color: "var(--status-error)",
            }}
          >
            {error}
          </div>
        )}

        {sent ? (
          <div
            className="tc-login__sent"
            style={{
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--font-size-md)",
                color: "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              Check your email
            </p>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--font-size-sm)",
                color: "var(--text-tertiary)",
              }}
            >
              We sent a sign-in link to {email}
            </p>
          </div>
        ) : (
          <>
            {/* Google OAuth */}
            <button
              onClick={handleGoogle}
              className="tc-login__google"
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-background)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--font-size-sm)",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition:
                  "border-color var(--motion-duration-small) var(--motion-easing-out)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div
              className="tc-login__divider"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "20px 0",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: "var(--border-subtle)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "var(--letter-spacing-wide)",
                }}
              >
                or
              </span>
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: "var(--border-subtle)",
                }}
              />
            </div>

            {/* Magic link */}
            <form onSubmit={handleMagicLink}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--surface-background)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--font-size-sm)",
                  outline: "none",
                  marginBottom: 12,
                  boxSizing: "border-box",
                }}
              />
              <button
                type="submit"
                disabled={loading}
                className="tc-login__magic-link"
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--accent-default)",
                  border: "none",
                  color: "var(--accent-on-accent)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  transition:
                    "opacity var(--motion-duration-small) var(--motion-easing-out)",
                }}
              >
                {loading ? "Sending..." : "Send magic link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
