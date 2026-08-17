import Link from "next/link";
import { HeroStats, RankingPanel, SiteHeader, WorkCard } from "./components";
import { works } from "./data";

export default function Home() {
  return (
    <main>
      <SiteHeader />

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">船员实战成果库</span>
          <h1>每一个作品，都是一次真实出航</h1>
          <p>查看船员完成的小程序、热词游戏站与实战工具，点击即可进入真实作品体验。</p>
          <div className="hero-actions">
            <Link className="primary-btn" href="/works">
              探索作品 <span>→</span>
            </Link>
            <Link className="text-btn" href="/works?sort=latest">
              查看最新上船 <span>→</span>
            </Link>
          </div>
        </div>

        <div className="ship-scene" aria-label="航海作品舱视觉">
          <img src="/assets/hero-ship-engraving.png" alt="青绿色版画帆船" />
          <span className="map-line line-one" />
          <span className="map-line line-two" />
          <span className="birds" aria-hidden="true">⌁⌁</span>
        </div>

        <HeroStats />
      </section>

      <section className="home-tools" aria-label="作品筛选">
        <form className="search-box" action="/works">
          <span aria-hidden="true">⌕</span>
          <input name="q" placeholder="搜索作品、作者、航海群" />
        </form>
        <div className="filter-row" aria-label="作品分类">
          <Link className="active" href="/works">全部</Link>
          <Link href="/works?type=mini">小程序</Link>
          <Link href="/works?type=game">热词游戏站</Link>
        </div>
        <Link className="sort-link" href="/works?sort=latest">最近更新⌄</Link>
      </section>

      <section className="deck" id="works">
        <div className="latest-area" id="latest">
          <div className="section-title">
            <h2>最新作品</h2>
            <Link className="section-more" href="/works">查看全部 →</Link>
          </div>

          <div className="work-grid">
            {works.slice(0, 3).map((work) => <WorkCard key={work.id} work={work} />)}
          </div>
        </div>

        <RankingPanel />
      </section>

      <footer>
        <span>生财航海作品舱</span>
        <p>让实战结果沉淀下来，也让更多船员看见可参考的路径。</p>
      </footer>
    </main>
  );
}
