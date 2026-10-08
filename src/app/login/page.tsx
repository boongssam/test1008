"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";
import { useAuth } from "@/components/AuthProvider";

function authMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (code.includes("email-already-in-use")) return "이미 가입된 이메일입니다.";
  if (code.includes("weak-password")) return "비밀번호는 6자 이상이어야 합니다.";
  if (code.includes("invalid-email")) return "이메일 형식이 올바르지 않습니다.";
  if (code.includes("popup-closed")) return "로그인 창이 닫혔습니다.";
  return "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function run(fn: () => Promise<unknown>) {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    run(() =>
      mode === "login"
        ? signInWithEmailAndPassword(clientAuth(), email, password)
        : createUserWithEmailAndPassword(clientAuth(), email, password),
    );
  }

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h1>활동지 AI 평가</h1>
        <p className="muted small" style={{ marginTop: 0 }}>
          교사 계정으로 로그인하세요.
        </p>

        {error && <div className="alert">{error}</div>}

        <button
          className="btn ghost block"
          disabled={busy}
          onClick={() => run(() => signInWithPopup(clientAuth(), new GoogleAuthProvider()))}
        >
          Google 계정으로 로그인
        </button>

        <div className="divider">또는</div>

        <form onSubmit={onSubmit}>
          <label className="field">
            <span>이메일</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="field">
            <span>비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
              required
            />
          </label>
          <button className="btn block" type="submit" disabled={busy}>
            {mode === "login" ? "로그인" : "계정 만들기"}
          </button>
        </form>

        <p className="small muted" style={{ textAlign: "center", marginBottom: 0 }}>
          {mode === "login" ? "처음이신가요? " : "이미 계정이 있나요? "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "계정 만들기" : "로그인"}
          </a>
        </p>
      </div>
    </div>
  );
}
