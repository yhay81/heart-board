# Decisions

## 2026-07-29: advance only the constrained adult OpenChat job

- Decision: 候補全体ではなく、18歳以上・手動交換・LINEオープンチャット限定の探索ジョブだけを`advance`する
- Reason: 現行掲示板には継続需要と乗り換え行動がある一方、個人連絡先、自動化、未成年、危険な外部リンクを含む募集をそのまま扱えない
- Trade-off: 通常のLINEグループや個人間交換を求める利用者は対象外になる
- Stop boundary: 禁止募集が中核需要で、安全制約を維持すると供給が成立しない場合は停止する

## 2026-07-29: structured cards instead of free-form posts

- Decision: ノルマ、時間帯、最低年齢、人数帯、承認方法、初心者歓迎を選択式にし、自由記述を部屋名30字とひとこと60字へ制限する
- Reason: 比較可能性を上げ、個人連絡先・外部誘導・自動化案内の混入面を小さくする
- Trade-off: 複雑な独自ルールはカードに掲載できない

## 2026-07-29: OpenChat g2 invitations only

- Decision: exact hostが`line.me`、pathが`/ti/g2/...`のHTTPS URLだけを正規化して保存する
- Reason: 通常LINEの友だち追加・グループ招待ではなく、普段のLINE名・画像と分離できるオープンチャットに限定する
- Trade-off: 短縮URLと通常グループ招待は、正当なものでも受け付けない

## 2026-07-29: no accounts

- Decision: Better Authを使わず、カード単位の256-bit管理鍵をURL fragmentに保持する
- Reason: 一回の募集にアカウントは過剰で、メール・復旧・共有Cookieの責任を増やす
- Mitigation: D1にはSHA-256 hashだけを保存し、Cookieは使わない。将来認証を追加してもCookieはhost-onlyにする

## 2026-07-29: visual bulletin board

- Decision: 掲示板、ピン、交換数レール、時間帯ダイヤル、年齢スタンプ、人数・承認記号をHTML/CSSで描き、見出しを32px以下にする
- Reason: 説明文や大きな見出しではなく、比較する対象と条件が画面を見た時点で分かるようにする
- Trade-off: 外部画像やゲーム作品のロゴ・キャラクターは使わず、汎用的なハート記号で用途を表す

## 2026-07-29: yhay81.com is canonical

- Decision: 正規URLを`https://heart-board.yhay81.com`とし、Wrangler Custom Domainを配信構成の正本にする
- Reason: 個人プロジェクトの公開面を統一し、検索、共有、将来のhaya-inc移管で変わらない識別子を持たせる
- Boundary: `workers.dev`は公開せず、認証Cookieを追加する場合も`.yhay81.com`共有Cookieを使わない
