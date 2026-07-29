# Security

脆弱性の報告は、公開Issueへ管理URL、招待URL、実データを貼らず、GitHubのPrivate vulnerability reportingを利用してください。

## Controls

- 128-bitのカードIDと256-bit管理鍵。D1には管理鍵のSHA-256 hashだけを保存し、一定時間比較を行う
- exact host `line.me`、HTTPS、`/ti/g2/...` pathだけを受け付け、queryとfragmentを除去
- 個人連絡先、URL、電話、メール、SNS handle、未成年、自動送信、BOT、チート、親型・子型を可視文字列から拒否
- JSON content type、body size、same-origin、ID、enum、文字数、honeypotを検証
- 一つの匿名セッションから1日3枚まで。異なる3セッションの報告で即時非表示し、招待URLを消去
- 管理者による公開終了・再開・削除。14日で招待URL削除、カード30日、匿名イベント120日の期限削除
- CSP、HSTS、COOP、CORP、frame拒否、MIME sniffing拒否、権限API拒否、no-referrer
- 管理・カード詳細を`noindex,nofollow,noarchive`と`Cache-Control: no-store`で検索・キャッシュから除外
- ユーザー生成HTMLを描画せず、Hono JSXまたは`textContent`で出力

## Known boundaries

- 招待先オープンチャット内の内容を自動監査しません。参加前の確認、退出、カード報告が必要です。
- 匿名セッションは端末で作るため、複数端末・ブラウザを使う濫用を厳密には識別しません。
- 公開招待URLは推測不能な秘密ではありません。カード上に直接表示しませんが、参加操作をした利用者は取得できます。
- 管理URLを受け取った人はカードを操作できます。URL転送を完全には防げません。
- メール、外部ログイン、ファイル、決済、個人連絡先を扱わず、攻撃面と継続責任を限定します。
