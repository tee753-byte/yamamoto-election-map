"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>画面を読み込めませんでした</h1>
      <p>Supabaseが起動しているか、接続設定が正しいか確認してください。</p>
      <button className="button button-primary" onClick={reset} type="button">
        もう一度試す
      </button>
    </main>
  );
}
