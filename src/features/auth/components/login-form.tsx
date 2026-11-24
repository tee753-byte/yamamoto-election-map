"use client";

import { useActionState } from "react";
import { loginAction } from "@/features/auth/actions/auth-actions";
import { INITIAL_ACTION_STATE } from "@/lib/types/action-state";

type LoginFormProps = {
  showDemoCredentials?: boolean;
};

export function LoginForm({ showDemoCredentials = false }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="login-form">
      <label>
        メールアドレス
        <input
          name="email"
          placeholder="メールアドレスを入力"
          type="email"
          autoComplete="email"
          defaultValue={showDemoCredentials ? "admin@yamamoto-map.local" : undefined}
          required
        />
      </label>
      <label>
        パスワード
        <input
          name="password"
          placeholder="パスワードを入力"
          type="password"
          autoComplete="current-password"
          defaultValue={showDemoCredentials ? "demo-admin-2026" : undefined}
          minLength={8}
          required
        />
      </label>
      {state.message ? (
        <p className="form-message form-error" role="alert">
          {state.message}
        </p>
      ) : null}
      <button
        className="button button-primary button-wide"
        disabled={pending}
        type="submit"
      >
        {pending ? "確認中…" : "ログイン"}
      </button>
    </form>
  );
}
