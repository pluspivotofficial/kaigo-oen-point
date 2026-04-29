# 介護職応援ポイント (hop-point)

介護派遣の勤務時間をポイント化して還元する Web アプリ（PWA対応）。
1時間 = 1ポイント、1ポイント = 1円で還元される。

**本番URL**: https://kaigooenpointo.com

## 技術スタック

- **フロントエンド**: React 18 + Vite 5 + TypeScript
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS
- **状態管理**: TanStack Query + React Hook Form + Zod
- **バックエンド**: Supabase (Auth + Postgres + Storage + RLS)
- **ホスティング**: Vercel
- **その他**: TipTap (リッチエディタ), Recharts (グラフ), date-fns

## ローカル開発

### 前提

- [bun](https://bun.sh) >= 1.3
- [Supabase CLI](https://supabase.com/docs/guides/cli) >= 2.95（DBマイグレーション運用時のみ必要）

### セットアップ

```bash
# 依存関係インストール
bun install

# 環境変数を設定（値はチームで共有）
cp .env.example .env
# .env を開き、Supabase Project URL / anon key 等を記入

# 開発サーバー起動
bun run dev
# → http://localhost:8080
```

### 環境変数

| キー | 説明 | 値の取得元 |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase プロジェクトの API URL | Supabase Dashboard > Settings > API |
| `VITE_SUPABASE_PROJECT_ID` | プロジェクト Reference (URL のサブドメイン部) | 上記 URL から抽出 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon key（公開可） | Supabase Dashboard > Settings > API |

### スクリプト

```bash
bun run dev          # 開発サーバー (Vite, port 8080)
bun run build        # 本番ビルド → dist/
bun run preview      # ビルド結果のプレビュー
bun run lint         # ESLint
bun run test         # Vitest (run)
bun run test:watch   # Vitest (watch)
```

## Supabase マイグレーション

スキーマ変更は `supabase/migrations/` に SQL ファイルとして追加し、
リモートに push する。

```bash
# 初回のみ: プロジェクトに link
supabase login
supabase link --project-ref <PROJECT_REF>

# マイグレーション適用
supabase db push --dry-run   # 事前確認
supabase db push             # 本番適用

# 型定義の再生成（client コードで Database 型を使うため）
supabase gen types typescript --project-id <PROJECT_REF> \
  > src/integrations/supabase/types.ts
```

> Phase 2（メール機能復活）まで `_disabled_20260403015139_email_infra.sql` は
> プレフィックスにより `db push` 対象外になっている。復活時はファイル名を戻す。

## Vercel デプロイ

1. Vercel Dashboard で GitHub リポジトリを Import
2. Framework: **Vite** を自動検出（`vercel.json` で明示済）
3. Environment Variables に `.env` の3つのキーを Production / Preview の両方で登録
4. Deploy

カスタムドメインは `Settings > Domains` で `kaigooenpointo.com` を追加。

## プロジェクトの経緯

本アプリは元々 [Lovable Cloud](https://lovable.dev) でホスティングされていたが、
2026-04 に **自前 Supabase (Tokyo) + Vercel** へ移行した。

### 移行で除去した Lovable 依存
- `lovable-tagger` Vite プラグイン
- `@lovable.dev/email-js` / `@lovable.dev/webhooks-js`（メール機能）
  - 該当 Edge Functions は `supabase/functions/_disabled/` に隔離（Phase 2 復活予定）

### Phase 1（移行完了）
- Auth / Points / Shifts / Q&A / Referrals / Ranking / Admin など全コア機能
- データはテストデータのみだったため引継ぎなし、新規再作成

### Phase 2（予定）
- メール機能の復活（Supabase Auth Email + 自前 SMTP / Resend）
- Storage オブジェクトの本番セットアップ
- OG画像の自前ホスト化
