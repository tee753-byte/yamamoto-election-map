# AIエージェント向け開発ルール

## プロジェクトの境界

- ポスター・ポスティング機能の実装元は `team-mirai-volunteer/action-board` のみ。
- 他プロジェクトのコード、設計、文章、ブランド、データは原則として持ち込まない。
- 例外として、利用者が所有する `fukutsu-insight` の公開統計機能・加工済み公開データは、
  「福津インサイト」機能に限って再利用できる。統合後のコードは本プロジェクトと同じ
  AGPL-3.0-onlyで扱い、データごとの出典・利用条件・加工表示を維持する。
- 参考にするのは日本語、初心者向け説明、Windows対応、無断push禁止などの対話規則だけ。
- GitHubへのpush、本番公開、クラウドSupabase作成、有料契約は事前承諾なしに行わない。

## 実装規則

- Next.js App Router、TypeScript strict、Supabaseを使用する。
- 機能ごとに `src/features/{feature}` へ分割する。
- UIコンポーネントからSupabaseを直接呼ばない。
- 読み取りは `services`、更新は認可を行う `actions` から `services` を経由する。
- 利用者IDと権限はサーバー側セッションから取得し、クライアント入力を信用しない。
- 全内部テーブルでRLSを有効化し、未ログイン利用者には公開しない。
- 個人宅、支持者、住民の反応などの個人情報を保存しない。
- 実データ受領前は、明示的に架空と分かるサンプルデータだけを使用する。

## 表示と応答

- ユーザーへの回答、ドキュメント、コメントは日本語にする。
- 専門用語には初出時に短い説明を付ける。
- テーマ主色は `#862D39`。

## 品質確認

変更後は可能な範囲で次を実行する。

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`

Supabaseを起動できる場合は、RLSと同時更新の統合テストも実行する。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
