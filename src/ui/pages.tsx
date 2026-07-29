import { product } from "../config/product";
import { Layout } from "./layout";

export type ListingView = {
  activeTime: string;
  approval: string;
  beginnerWelcome: boolean;
  createdAt: string;
  expiresAt: string;
  groupSize: string;
  id: string;
  minAge: number;
  note: string;
  quota: number;
  roomName: string;
  status: "active" | "closed" | "hidden";
};

type Filters = {
  age: number;
  beginner: boolean;
  quota: number;
  time: string;
};

const timeLabels: Record<string, string> = {
  anytime: "いつでも",
  morning: "朝",
  daytime: "昼",
  evening: "夕方",
  night: "夜",
};

const sizeLabels: Record<string, string> = {
  large: "101人〜",
  medium: "31〜100人",
  small: "〜30人",
};

const approvalLabels: Record<string, string> = {
  approval: "承認制",
  instant: "すぐ参加",
  question: "質問あり",
};

function HeartRail({ quota }: { quota: number }) {
  const visibleHearts = Math.min(quota, 10);
  return (
    <div aria-label={`1日${quota}個の交換目安`} class="heart-rail">
      <span class="rail-label">1日</span>
      <span class="heart-track">
        {Array.from({ length: 10 }, (_, index) => (
          <i class={index < visibleHearts ? "filled" : ""} key={index}>
            ♥
          </i>
        ))}
      </span>
      <strong>{quota}</strong>
    </div>
  );
}

function TimeDial({ value }: { value: string }) {
  return (
    <span aria-label={`活動時間は${timeLabels[value] ?? value}`} class={`time-dial ${value}`}>
      <i></i>
      <b>{timeLabels[value] ?? value}</b>
    </span>
  );
}

function ListingCard({ listing }: { listing: ListingView }) {
  return (
    <article class="room-card">
      <span aria-hidden="true" class="push-pin"></span>
      <a aria-label={`${listing.roomName}の詳細を見る`} href={`/rooms/${listing.id}`}>
        <div class="card-topline">
          <TimeDial value={listing.activeTime} />
          <span class="age-stamp">{listing.minAge}+</span>
        </div>
        <h2>{listing.roomName}</h2>
        <HeartRail quota={listing.quota} />
        <div class="card-grid">
          <span>
            <i aria-hidden="true" class="people-mark"></i>
            {sizeLabels[listing.groupSize]}
          </span>
          <span>
            <i aria-hidden="true" class="door-mark"></i>
            {approvalLabels[listing.approval]}
          </span>
        </div>
        {listing.beginnerWelcome ? <span class="beginner-ribbon">はじめて歓迎</span> : null}
        {listing.note ? (
          <p>{listing.note}</p>
        ) : (
          <p class="muted-note">条件はカード内にすべて記載</p>
        )}
      </a>
    </article>
  );
}

function EmptyBoard() {
  return (
    <section class="empty-board">
      <div aria-hidden="true" class="empty-cards">
        <i></i>
        <i></i>
        <i></i>
      </div>
      <div>
        <strong>条件に合うカードはまだありません</strong>
        <span>募集する人が、最初の一枚を貼れます。</span>
      </div>
      <a class="button coral" href="/post">
        カードを貼る
      </a>
    </section>
  );
}

export function HomePage({ filters, listings }: { filters: Filters; listings: ListingView[] }) {
  const filtered = Boolean(filters.time || filters.age || filters.quota || filters.beginner);
  return (
    <Layout script="/board.js">
      <section class="board-intro">
        <div class="intro-visual" aria-hidden="true">
          <span class="orbit orbit-one">
            <i>♥</i>
          </span>
          <span class="orbit orbit-two">
            <i>♥</i>
          </span>
          <span class="orbit-center">♥</span>
        </div>
        <div>
          <p class="eyebrow">18+ · MANUAL ONLY</p>
          <h1>{product.headline}</h1>
          <p>{product.description}</p>
        </div>
        <a class="safety-plaque" href="/guide">
          <span aria-hidden="true" class="shield-mark">
            ✓
          </span>
          <span>
            <b>連絡先を載せない</b>
            <small>オープンチャットだけ</small>
          </span>
        </a>
      </section>

      <section class="board-workspace" data-board>
        <form aria-label="募集カードを絞り込む" class="filter-drawer" method="get">
          <div class="drawer-handle">
            <span>条件トレイ</span>
            {filtered ? <a href="/">すべて外す</a> : null}
          </div>
          <fieldset>
            <legend>活動する時間</legend>
            <div class="dial-choices">
              {[
                ["", "すべて"],
                ["morning", "朝"],
                ["daytime", "昼"],
                ["evening", "夕方"],
                ["night", "夜"],
              ].map(([value, label]) => (
                <label>
                  <input checked={filters.time === value} name="time" type="radio" value={value} />
                  <span>
                    <i class={`mini-dial ${value || "anytime"}`}></i>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label class="select-field">
            <span>あなたの年齢</span>
            <select name="age">
              <option value="">指定しない</option>
              {[18, 20, 25, 30].map((age) => (
                <option selected={filters.age === age} value={age}>
                  {age}歳以上
                </option>
              ))}
            </select>
          </label>
          <label class="select-field">
            <span>1日の交換目安</span>
            <select name="quota">
              <option value="">指定しない</option>
              {[3, 5, 10].map((quota) => (
                <option selected={filters.quota === quota} value={quota}>
                  {quota}個以内
                </option>
              ))}
            </select>
          </label>
          <label class="check-card">
            <input checked={filters.beginner} name="beginner" type="checkbox" value="1" />
            <span aria-hidden="true">♥</span>
            <b>はじめて歓迎だけ</b>
          </label>
          <button class="button ink" type="submit">
            カードを並べる
          </button>
          <div class="drawer-rules">
            <span>
              <i class="rule-dot"></i>18歳以上
            </span>
            <span>
              <i class="rule-dot"></i>手動のみ
            </span>
            <span>
              <i class="rule-dot"></i>14日で終了
            </span>
          </div>
        </form>

        <div class="cork-board">
          <div class="board-status">
            <span>
              <i></i>
              {filtered ? "絞り込み中" : "新しい順"}
            </span>
            <strong>{listings.length}枚</strong>
          </div>
          {listings.length ? (
            <div class="room-grid">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <EmptyBoard />
          )}
        </div>
      </section>
    </Layout>
  );
}

export function PostPage() {
  return (
    <Layout
      description="手動交換オープンチャットの募集条件をカードにして掲載します。"
      path="/post"
      script="/post.js"
      title={`募集カードを貼る | ${product.name}`}
    >
      <section class="post-workbench">
        <header class="compact-heading">
          <p class="eyebrow">NEW CARD</p>
          <h1>募集条件をカードにする</h1>
          <p>個人のLINE IDやQRコードは不要です。公開されるのは下のカード項目だけです。</p>
        </header>
        <div class="post-layout">
          <form class="post-form" id="post-form">
            <div aria-hidden="true" class="honeypot" inert>
              <label>
                Website
                <input autocomplete="off" name="website" tabindex={-1} />
              </label>
            </div>
            <label class="text-field">
              <span>部屋の名前</span>
              <input maxlength={30} name="roomName" placeholder="例：夜のゆっくり交換室" required />
              <small>30文字まで。連絡先は入力できません。</small>
            </label>
            <div class="form-pair">
              <label class="select-field">
                <span>1日の交換目安</span>
                <select name="quota" required>
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((quota) => (
                    <option selected={quota === 3} value={quota}>
                      {quota}個
                    </option>
                  ))}
                </select>
              </label>
              <label class="select-field">
                <span>活動する時間</span>
                <select name="activeTime" required>
                  <option value="anytime">いつでも</option>
                  <option value="morning">朝</option>
                  <option value="daytime">昼</option>
                  <option selected value="evening">
                    夕方
                  </option>
                  <option value="night">夜</option>
                </select>
              </label>
            </div>
            <div class="form-pair">
              <label class="select-field">
                <span>参加できる年齢</span>
                <select name="minAge" required>
                  <option value="18">18歳以上</option>
                  <option selected value="20">
                    20歳以上
                  </option>
                  <option value="25">25歳以上</option>
                  <option value="30">30歳以上</option>
                </select>
              </label>
              <label class="select-field">
                <span>いまの人数</span>
                <select name="groupSize" required>
                  <option value="small">30人まで</option>
                  <option selected value="medium">
                    31〜100人
                  </option>
                  <option value="large">101人以上</option>
                </select>
              </label>
            </div>
            <fieldset class="segmented-field">
              <legend>参加方法</legend>
              <div>
                <label>
                  <input name="approval" type="radio" value="instant" />
                  <span>すぐ参加</span>
                </label>
                <label>
                  <input checked name="approval" type="radio" value="approval" />
                  <span>承認制</span>
                </label>
                <label>
                  <input name="approval" type="radio" value="question" />
                  <span>質問あり</span>
                </label>
              </div>
            </fieldset>
            <label class="check-card wide">
              <input name="beginnerWelcome" type="checkbox" />
              <span aria-hidden="true">♥</span>
              <b>はじめての人も歓迎する</b>
            </label>
            <label class="text-field">
              <span>ひとこと（任意）</span>
              <input maxlength={60} name="note" placeholder="例：無理のないペースで続けています" />
              <small>URL・ID・電話番号・自動化の案内は入力できません。</small>
            </label>
            <label class="text-field">
              <span>オープンチャット招待URL</span>
              <input
                inputmode="url"
                name="openchatUrl"
                placeholder="https://line.me/ti/g2/..."
                required
                type="url"
              />
              <small>「g2」を含むオープンチャットURLだけを受け付けます。</small>
            </label>
            <div class="promise-box">
              <label>
                <input name="confirmedAdult" required type="checkbox" />
                <span>参加対象は18歳以上です</span>
              </label>
              <label>
                <input name="confirmedManual" required type="checkbox" />
                <span>自動送信・BOT・チートツールを使いません</span>
              </label>
            </div>
            <p aria-live="polite" class="form-message" id="form-message"></p>
            <button class="button coral large" type="submit">
              このカードを貼る
            </button>
            <p class="form-footnote">
              掲載は14日で自動終了します。作成後の管理URLからいつでも終了・削除できます。
            </p>
          </form>

          <aside aria-label="募集カードのプレビュー" class="preview-board">
            <span class="preview-label">CARD PREVIEW</span>
            <div class="room-card preview-card">
              <span aria-hidden="true" class="push-pin"></span>
              <div>
                <div class="card-topline">
                  <TimeDial value="evening" />
                  <span class="age-stamp" data-preview-age>
                    20+
                  </span>
                </div>
                <h2 data-preview-name>夜のゆっくり交換室</h2>
                <HeartRail quota={3} />
                <div class="card-grid">
                  <span>
                    <i aria-hidden="true" class="people-mark"></i>
                    <b data-preview-size>31〜100人</b>
                  </span>
                  <span>
                    <i aria-hidden="true" class="door-mark"></i>
                    <b data-preview-approval>承認制</b>
                  </span>
                </div>
                <span class="beginner-ribbon" data-preview-beginner hidden>
                  はじめて歓迎
                </span>
                <p data-preview-note>条件はカード内にすべて記載</p>
              </div>
            </div>
            <div class="preview-safety">
              <span aria-hidden="true" class="shield-mark">
                ✓
              </span>
              <p>
                <b>公開する情報は最小限</b>
                招待URLはカードに直接表示せず、参加ボタンからだけ開きます。
              </p>
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  );
}

export function ListingPage({
  joined = false,
  listing,
}: {
  joined?: boolean;
  listing: ListingView;
}) {
  return (
    <Layout
      description={`${listing.roomName}の手動ハート交換条件`}
      noIndex
      path={`/rooms/${listing.id}`}
      script="/listing.js"
      title={`${listing.roomName} | ${product.name}`}
    >
      <section class="listing-stage" data-listing-id={listing.id}>
        <a class="back-link" href="/">
          ← ボードへ戻る
        </a>
        <div class="listing-focus">
          <article class="room-card detail-card">
            <span aria-hidden="true" class="push-pin"></span>
            <div>
              <div class="card-topline">
                <TimeDial value={listing.activeTime} />
                <span class="age-stamp">{listing.minAge}+</span>
              </div>
              <h1>{listing.roomName}</h1>
              <HeartRail quota={listing.quota} />
              <div class="card-grid">
                <span>
                  <i aria-hidden="true" class="people-mark"></i>
                  {sizeLabels[listing.groupSize]}
                </span>
                <span>
                  <i aria-hidden="true" class="door-mark"></i>
                  {approvalLabels[listing.approval]}
                </span>
              </div>
              {listing.beginnerWelcome ? <span class="beginner-ribbon">はじめて歓迎</span> : null}
              {listing.note ? <p>{listing.note}</p> : null}
            </div>
          </article>
          <aside class="join-dock">
            <div class="manual-seal">
              <span aria-hidden="true">✓</span>
              <p>
                <b>18歳以上 · 手動交換</b>
                個人連絡先を使わず参加できます
              </p>
            </div>
            <form action={`/go/${listing.id}`} method="post" target="_blank" data-go-form>
              <input class="session-field" name="sessionId" type="hidden" />
              <button class="button line-green large" type="submit">
                オープンチャットを開く
              </button>
            </form>
            <noscript>参加するにはJavaScriptを有効にしてください。</noscript>
            <section class={`join-confirmation ${joined ? "visible" : ""}`} data-confirmation>
              <p>参加できましたか？</p>
              <form action={`/confirm/${listing.id}`} method="post">
                <input class="session-field" name="sessionId" type="hidden" />
                <button class="button soft" type="submit">
                  参加できた
                </button>
              </form>
            </section>
            <button class="report-toggle" data-report-toggle type="button">
              このカードを報告
            </button>
            <form class="report-form" data-report-form hidden>
              <label>
                <span>理由</span>
                <select name="reason">
                  <option value="dead">招待先が終了している</option>
                  <option value="minor">未成年を対象にしている</option>
                  <option value="automation">自動化・BOTの案内がある</option>
                  <option value="contact">個人連絡先を求められた</option>
                  <option value="spam">宣伝・スパム</option>
                  <option value="unsafe">その他の安全上の問題</option>
                </select>
              </label>
              <button class="button soft" type="submit">
                報告する
              </button>
              <p aria-live="polite" data-report-message></p>
            </form>
          </aside>
        </div>
      </section>
    </Layout>
  );
}

export function ManagePage({ listingId }: { listingId: string }) {
  return (
    <Layout
      description="募集カードの掲載状態を管理します。"
      noIndex
      path={`/manage/${listingId}`}
      script="/manage.js"
      title={`カード管理 | ${product.name}`}
    >
      <section class="manage-stage" data-listing-id={listingId}>
        <header class="compact-heading">
          <p class="eyebrow">OWNER DESK</p>
          <h1>募集カードを管理する</h1>
          <p>この画面のURLは管理鍵を含みます。共有しないでください。</p>
        </header>
        <div class="manage-panel" data-manage-panel>
          <div aria-hidden="true" class="loading-card">
            <i></i>
            <i></i>
            <i></i>
          </div>
          <p aria-live="polite" data-manage-message>
            カードを確認しています…
          </p>
        </div>
      </section>
    </Layout>
  );
}

export function GuidePage() {
  return (
    <Layout
      description="Heart Boardで安心して手動交換グループを探すための掲載ルール。"
      path="/guide"
      title={`安心ガイド | ${product.name}`}
    >
      <article class="guide-page">
        <header class="compact-heading">
          <p class="eyebrow">SAFE EXCHANGE</p>
          <h1>カードに載せるのは、交換条件だけ</h1>
          <p>個人のLINEアカウントを渡さず、オープンチャットの別プロフィールで参加します。</p>
        </header>
        <section class="rule-board">
          <article class="rule-card allowed">
            <span aria-hidden="true">✓</span>
            <h2>載せられるもの</h2>
            <ul>
              <li>18歳以上の募集</li>
              <li>手動でのハート交換</li>
              <li>オープンチャット招待URL</li>
              <li>ノルマ・時間帯・参加条件</li>
            </ul>
          </article>
          <article class="rule-card blocked">
            <span aria-hidden="true">×</span>
            <h2>載せられないもの</h2>
            <ul>
              <li>個人のLINE ID・QR・電話番号</li>
              <li>未成年を対象にする募集</li>
              <li>自動送信・BOT・チート</li>
              <li>外部サイトや別SNSへの誘導</li>
            </ul>
          </article>
        </section>
        <section class="safety-steps">
          <div>
            <span>1</span>
            <i class="profile-bubble"></i>
            <p>
              <b>別プロフィールで参加</b>
              普段のLINE名・画像を使う必要はありません。
            </p>
          </div>
          <div>
            <span>2</span>
            <i class="inspect-mark"></i>
            <p>
              <b>入る前に確認</b>
              管理者・参加人数・ルールを招待画面で確認します。
            </p>
          </div>
          <div>
            <span>3</span>
            <i class="exit-mark"></i>
            <p>
              <b>違和感があれば退出</b>
              個人連絡先や自動化を求められたら退出し、カードを報告します。
            </p>
          </div>
        </section>
        <aside class="official-note">
          <span aria-hidden="true" class="shield-mark">
            ✓
          </span>
          <p>
            LINEオープンチャットでは、ハート交換目的でもLINE
            ID・個人連絡先・QRコードの投稿が禁止されています。 Heart
            Boardはこの境界を投稿時に検査します。
          </p>
          <a href="https://openchat-jp.line.me/monitoring/warning/230502_8mks37hg" rel="noreferrer">
            公式の注意事項を確認
          </a>
        </aside>
      </article>
    </Layout>
  );
}

export function PrivacyPage() {
  return (
    <Layout
      description="Heart Boardが扱うデータ、保存期間、削除方法。"
      path="/privacy"
      title={`プライバシー | ${product.name}`}
    >
      <article class="prose">
        <p class="eyebrow">PRIVACY</p>
        <h1>募集に必要な情報だけを扱います</h1>
        <section>
          <h2>保存するもの</h2>
          <p>
            部屋名、交換目安、時間帯、年齢条件、人数帯、参加方法、初心者歓迎の有無、60文字以内のひとこと、オープンチャット招待URLを保存します。個人のLINE
            ID、QR画像、電話番号、メールアドレスは受け付けません。
          </p>
        </section>
        <section>
          <h2>匿名の利用記録</h2>
          <p>
            ブラウザ内で作る無作為な識別子を使い、訪問、カード作成、条件の利用、オープンチャット遷移、参加できたという回答を重複なく数えます。IPアドレス、User-Agent、氏名は分析データに保存しません。
          </p>
        </section>
        <section>
          <h2>保存期間と削除</h2>
          <p>
            カードは14日で公開を終了し、招待URLを削除します。終了後30日以内にカード本体を削除し、匿名の集計用記録は120日以内に削除します。作成時に発行する管理URLから、公開終了や即時削除もできます。
          </p>
        </section>
        <section>
          <h2>外部サービス</h2>
          <p>
            参加ボタンを押すとLINEのオープンチャット招待先を新しい画面で開きます。遷移時にHeart
            Boardから参照元情報を送らない設定にしています。以降はLINEヤフー株式会社の規約・プライバシーポリシーが適用されます。
          </p>
        </section>
      </article>
    </Layout>
  );
}

export function MissingPage() {
  return (
    <Layout noIndex title={`見つかりません | ${product.name}`}>
      <section class="missing-page">
        <div aria-hidden="true" class="lost-card">
          <i>♥</i>
        </div>
        <h1>このカードは見つかりません</h1>
        <p>掲載が終了したか、安全上の理由で非表示になった可能性があります。</p>
        <a class="button ink" href="/">
          ボードへ戻る
        </a>
      </section>
    </Layout>
  );
}
