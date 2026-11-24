# 山本ゆうへい BASE

福津市議会議員選挙に向け、スタッフ・ボランティアが情報を共有するためのポスター掲示・ポスティング作業アプリです。
現在の地点、掲示場番号、配布区域、利用者名、配布数はすべて架空です。

実装元は [`team-mirai-volunteer/action-board`](https://github.com/team-mirai-volunteer/action-board) です。
コード、データ、素材、設定をほかの既存プロジェクトと共有しない独立プロジェクトです。

## 現在できること

- メールアドレスとパスワードによるログイン
- 管理者・作業担当者・閲覧のみの3権限
- 福津市を表示するポスターマップと、候補者別の状態管理
- ポスティング区域、配布数、進捗の管理
- 非ログイン遮断、担当者制限、同時更新の競合検出、操作履歴
- スマートフォン向け表示

## 初回起動（Windows）

必要なものはNode.js 22以上とDocker Desktopです。Dockerは、Supabaseという認証・データベース環境を
パソコン内だけで動かすために使います。

PowerShellでこのフォルダを開き、順に実行します。

```powershell
npm install
npx supabase start
```

`npx supabase start` の表示から、`Project URL` と `Publishable` キーを `.env.local` に設定します。
秘密権限を持つ `Secret` キーはアプリへ設定しません。

```text
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=ここにPublishableキー
```

アプリを起動します。

```powershell
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## 架空の試作用アカウント

| 権限 | メールアドレス | パスワード |
|---|---|---|
| 管理者 | `admin@yamamoto-map.local` | `demo-admin-2026` |
| 作業担当者 | `worker@yamamoto-map.local` | `demo-worker-2026` |
| 閲覧のみ | `viewer@yamamoto-map.local` | `demo-viewer-2026` |

実運用時は、このアカウントとパスワードを使いません。

## データを初期状態に戻す

次のコマンドで、ローカルデータベースを再作成し、架空データを入れ直せます。

```powershell
npx supabase db reset
```

Supabaseを終了するときは次を実行します。

```powershell
npx supabase stop
```

## 品質確認

```powershell
npm run lint
npm run typecheck
npm test
npm run test:supabase
npm run build
```

`test:supabase` はDocker DesktopとローカルSupabaseが起動しているときに実行します。

## ライセンス

GNU Affero General Public License v3.0 only（AGPL-3.0-only）です。詳細は [LICENSE](./LICENSE) と
[NOTICE.md](./NOTICE.md) を確認してください。ネットワーク経由で実運用する前に、実際の稼働版に対応する
ソースコードの公開先を画面へ設定します。秘密鍵、実データ、ログイン情報は公開リポジトリへ含めません。

## 未完成部分

- 掲示場CSVの確認付き一括登録
- 管理者による担当者変更、区域編集、利用者管理、活動条件設定の画面
- 操作履歴の閲覧画面
- バックアップと復旧の運用手順
- 正式な掲示場番号・位置への差し替え
- 公開ソースURL、クラウドSupabase、本番公開

詳しい状況は [実装報告](./docs/20261123_0238_ローカルMVP実装報告.md) を参照してください。
