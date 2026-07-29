# Stack

## Heart Board selection

- Runtime: Cloudflare Workers
- Routing/API: Hono
- Server UI: Hono JSX
- Tooling: Vite+ (`vite-plus`, Vite互換)
- Persistence: 募集カード、hash化した管理鍵、通報、匿名集計をD1
- Authentication: Better Authは不採用。カード単位の管理鍵で募集者だけを認可し、参加者登録を避ける
- Assets: 掲示板、カード、ピン、交換レール、時計、記号をHTML/CSSで描画。外部フォント、ゲーム画像、分析SDKなし
- Tests: VitestによるWorker/API contract、実ブラウザによるデスクトップ・モバイルの投稿・参加・管理フロー
- Deployment: Wrangler、Workers Assets、D1 migrations、scheduled cleanup、Custom Domain

## Why no Better Auth

中核ジョブは、条件を比較して一つのオープンチャットへ移動することと、管理者が短期募集を一枚掲載することです。アカウントは閲覧・参加の摩擦を増やし、メール、本人情報、復旧責任を追加します。複数カードの継続管理や課金へ明確な需要が出た段階で、host-only Cookieを使う認証を再評価します。

## Quality constraints

- Node.js 24 LTS、npm lockfile、依存バージョン固定
- formatting、lint、型検査、テスト、build、high severity auditを公開前に必須化
- Cloudflare監視は有効。招待URL、管理鍵、自由記述をアプリログへ出さない
- 管理・詳細ページを検索とキャッシュから除外
- GitHub Actionsでpush/PRごとに同じ監査を再実行
