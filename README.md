# Heart Board

大人だけの手動ハート交換オープンチャットを、ノルマ、活動時間、年齢条件、人数帯から探せる日本語の募集ボードです。

- サービス: <https://heart-board.yhay81.com>
- 安心ガイド: <https://heart-board.yhay81.com/guide>
- プライバシー: <https://heart-board.yhay81.com/privacy>
- 運営: [yhay81](https://github.com/yhay81)

## Product boundary

掲載できるのは、18歳以上を対象にした手動交換グループと`https://line.me/ti/g2/...`形式のLINEオープンチャット招待URLだけです。個人のLINE ID、QR、電話番号、メールアドレス、通常のLINEグループ、外部サイト、自動送信、BOT、チートツール、未成年向け募集を入力時に拒否します。

カードは14日で公開終了し、招待URLを消去します。募集者は作成時の256-bit管理鍵で終了、再開、削除できます。アカウント、メール、ファイル、決済は扱いません。

## Local development

Node.js 24 LTSとnpm 11を使います。

```powershell
npm ci
npx wrangler d1 migrations apply heart-board --local
npm run dev
```

## Verification

```powershell
npm run release:check
npm run check
npm test
npm run build
npm audit --audit-level=high
```

## Deployment

正規URLは`https://heart-board.yhay81.com`です。`workers.dev`は公開せず、Wrangler Custom Domainを使います。

```powershell
npx wrangler d1 migrations apply heart-board --remote
npm run deploy
npm run indexnow
npm run metrics
```

## Documents

- [EXPERIMENT.md](EXPERIMENT.md): 対象ジョブと反証可能な公開判定
- [METRICS.md](METRICS.md): 実利用指標と収益判断
- [PRIVACY.md](PRIVACY.md): 保存データと削除境界
- [SECURITY.md](SECURITY.md): 入力制約、権限、通報、既知の境界
- [STACK.md](STACK.md): 共通技術選択と例外
- [DECISIONS.md](DECISIONS.md): 重要な製品判断
