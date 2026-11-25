# 山本ゆうへい BASE

福津市議会議員選挙に向け、少人数の幹部・運営メンバーがポスター掲示、ポスティング、
予定、参加可能時間を共有し、福津市の公開統計を確認するための内部向けWebアプリです。

- 共有テスト版: [https://yamamotoyuhei-base.vercel.app](https://yamamotoyuhei-base.vercel.app)
- ソースコード: [https://github.com/tee753-byte/yamamoto-election-map](https://github.com/tee753-byte/yamamoto-election-map)
- 最終更新: 2026年11月25日

実装元は [`team-mirai-volunteer/action-board`](https://github.com/team-mirai-volunteer/action-board) です。
必要な機能を選択的に移植・再設計した独立プロジェクトです。

## 現在の状態

VercelとクラウドSupabaseを使った共有テスト環境を公開済みです。
非ログイン利用者は内部データを閲覧できません。共有テスト用アカウントは関係者へ個別に発行し、
メールアドレスやパスワードはこのリポジトリへ掲載しません。

スケジュール機能は本番SupabaseとVercelへ反映済みです。2026年12月7日から12月27日までの
初期予定10件を登録し、未確定の内容は「仮予定」または「要確認」として区別しています。

現在表示している次のデータは、すべて試作用の架空データです。

- ポスター掲示場: 架空の20か所
- ポスティング区域: 架空の6区域
- 掲示場番号、位置、担当名、配布数、進捗

正式なポスター掲示場は全102か所となる見込みです。選挙管理委員会から2026年12月7日に
番号と位置が公表された後、資料を確認して架空データと差し替えます。

## 現在できること

- メールアドレスとパスワードによるログイン
- 管理者・作業担当者・閲覧のみの3権限
- 福津市を表示するポスターマップ
- 候補者ごとに分離した掲示状況の管理
- 未対応・担当中・完了・要確認の状態更新と進捗集計
- ポスティング区域、配布数、進捗の管理
- 管理者による担当名の自由入力・編集・未割当への変更
- 非ログイン遮断、権限確認、同時更新の競合検出、操作履歴
- PC・スマートフォン対応
- ヘッダーの「山本ゆうへい BASE」からホームへ移動
- 福津市の人口・世帯数・高齢化率・地域別統計の閲覧
- 2018年以降の人口・世帯数推移グラフ
- 2020年国勢調査の町丁・字等境界地図
- 公開統計の出典・基準日・利用条件の確認
- 月間カレンダーと時系列の予定一覧
- 終日・複数日・締切・時間未定の予定登録
- 確定・仮予定・要確認・中止の状態管理
- メンバーごとの参加可能日・参加可能時間の共有
- 予定と参加可能時間の登録者・更新者・操作履歴の記録

一般利用者が自分で新規登録する機能はありません。本番運用では、管理者が必要な人だけを
個別に招待する方式を予定しています。

## 今後行うこと

- 12月7日公表予定の掲示場番号・位置資料を入手する
- 正式な掲示場102か所を登録し、番号の欠落・重複・位置を確認する
- 掲示場CSVの確認付き一括登録を実装する
- ポスティング区域と活動条件を実運用向けに確定する
- 管理者向けの利用者招待・停止・権限変更画面を実装する
- 個人のGmailを使った招待、パスワード設定・再設定の運用を整える
- 操作履歴の閲覧画面を実装する
- バックアップと復旧、選挙当日の代替手順を整える
- 実端末と複数人で共有テストを行う

## 技術構成

- Next.js / TypeScript
- Supabase Auth・PostgreSQL・RLS
- Leaflet・国土地理院タイル
- Recharts（人口・世帯数グラフ）
- Vercel

RLS（Row Level Security）は、利用者の権限に応じてデータベース側で閲覧・更新を制限する仕組みです。
秘密権限を持つキーはブラウザや公開リポジトリへ含めません。

## ローカル開発（Windows）

必要なものはNode.js 22以上とDocker Desktopです。Dockerは、Supabaseの認証・データベース環境を
パソコン内だけで動かすために使います。

PowerShellでこのフォルダを開き、順に実行します。

```powershell
npm install
npx supabase start
```

`npx supabase start` の表示から、`Project URL` と `Publishable` キーを `.env.local` に設定します。

```text
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=ここにPublishableキー
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_SOURCE_CODE_URL=https://github.com/tee753-byte/yamamoto-election-map
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
```

アプリを起動します。

```powershell
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### ローカル専用の架空アカウント

次のアカウントは、`supabase/seed.sql` から作られるローカル開発専用です。
共有テスト版や実運用では使用しません。

| 権限 | メールアドレス | パスワード |
|---|---|---|
| 管理者 | `admin@yamamoto-map.local` | `demo-admin-2026` |
| 作業担当者 | `worker@yamamoto-map.local` | `demo-worker-2026` |
| 閲覧のみ | `viewer@yamamoto-map.local` | `demo-viewer-2026` |

### ローカルデータを初期状態に戻す

次のコマンドでローカルデータベースを再作成し、架空データを入れ直せます。

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
[NOTICE.md](./NOTICE.md) を確認してください。稼働中の改変版に対応するソースコードをこの公開リポジトリで
提供します。秘密鍵、実データ、ログイン情報は公開リポジトリへ含めません。

福津インサイトで使用する人口統計・地理データは公開資料です。ソフトウェアとは別に、
CC BY 4.0、e-Stat利用規約、各公開元の利用条件に従います。出典と加工上の注意は
[福津インサイトのデータ出典](./docs/fukutsu-insight-data.md)およびアプリ内の「データ出典」に表示します。

初期MVPを実装した時点の記録は、履歴資料として
[ローカルMVP実装報告](./docs/20261123_0238_ローカルMVP実装報告.md) に残しています。
現在の状態については、このREADMEを正とします。
