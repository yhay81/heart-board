import type { Child } from "hono/jsx";

import { product } from "../config/product";

type LayoutProps = {
  children: Child;
  description?: string;
  noIndex?: boolean;
  path?: string;
  script?: string;
  title?: string;
};

export function Layout({
  children,
  description = product.description,
  noIndex = false,
  path = "/",
  script,
  title = product.name,
}: LayoutProps) {
  const canonical = new URL(path, product.url).toString();
  const socialImage = new URL("/og.png", product.url).toString();
  return (
    <html itemscope itemtype="https://schema.org/WebApplication" lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <meta content={description} name="description" />
        {noIndex ? <meta content="noindex,nofollow,noarchive" name="robots" /> : null}
        <meta content="#f5ede4" name="theme-color" />
        <meta content={product.name} itemProp="name" />
        <meta content={description} itemProp="description" />
        <meta content={product.url} itemProp="url" />
        <meta content={product.applicationCategory} itemProp="applicationCategory" />
        <meta content="Any" itemProp="operatingSystem" />
        <meta content="true" itemProp="isAccessibleForFree" />
        <meta content={description} property="og:description" />
        <meta content="ja_JP" property="og:locale" />
        <meta content={title} property="og:title" />
        <meta content="website" property="og:type" />
        <meta content={canonical} property="og:url" />
        <meta content={socialImage} property="og:image" />
        <meta content="1200" property="og:image:width" />
        <meta content="630" property="og:image:height" />
        <meta
          content="コルク掲示板に、ハート数・時間・年齢・参加条件のカードが3枚並ぶ"
          property="og:image:alt"
        />
        <meta content="summary_large_image" name="twitter:card" />
        <meta content={socialImage} name="twitter:image" />
        <link href={canonical} rel="canonical" />
        <link href="/styles.css" rel="stylesheet" />
        <script defer src="/common.js"></script>
        {script ? <script defer src={script}></script> : null}
        <title>{title}</title>
      </head>
      <body>
        <a class="skip-link" href="#main">
          本文へ移動
        </a>
        <header class="site-header">
          <a aria-label="Heart Board ホーム" class="brand" href="/">
            <span aria-hidden="true" class="brand-pin">
              <i></i>
            </span>
            <span>Heart Board</span>
          </a>
          <nav aria-label="メイン">
            <a href="/">探す</a>
            <a href="/guide">安心ガイド</a>
            <a class="nav-cta" href="/post">
              カードを貼る
            </a>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer>
          <div class="footer-brand">
            <span aria-hidden="true" class="mini-heart">
              ♥
            </span>
            <span>成人の手動交換グループだけを掲載します。</span>
          </div>
          <nav aria-label="フッター">
            <a href="/guide">安心ガイド</a>
            <a href="/privacy">プライバシー</a>
            <a href="/healthz">稼働状態</a>
          </nav>
          <p>
            非公式サービスです。LINEヤフー株式会社・ウォルト・ディズニー・ジャパン株式会社との関係はありません。
          </p>
        </footer>
      </body>
    </html>
  );
}
