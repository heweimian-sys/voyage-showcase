import { HeroStats, RankingPanel, SiteHeader, SortSelect, WorkCard } from "../components";
import { WorkType, works } from "../data";
import { getSubmittedWorks } from "../../db/submitted-works";

export const dynamic = "force-dynamic";

const filters = [
  { label: "全部", value: "all" },
  { label: "小程序", value: "mini" },
  { label: "热词游戏站", value: "game" },
] as const;

const sorts = [
  { label: "最近更新", value: "latest" },
  { label: "评分最高", value: "score" },
] as const;

function typeFromParam(type?: string): WorkType | "全部" {
  if (type === "mini") return "小程序";
  if (type === "game") return "热词游戏站";
  return "全部";
}

function hrefFor(type: string, sort: string, q: string) {
  const params = new URLSearchParams();
  if (type !== "all") params.set("type", type);
  if (sort !== "latest") params.set("sort", sort);
  if (q) params.set("q", q);
  const query = params.toString();
  return `/works${query ? `?${query}` : ""}`;
}

export default async function WorksPage({ searchParams }: { searchParams?: { type?: string; sort?: string; q?: string } }) {
  const q = String(searchParams?.q || "").trim();
  const activeType = searchParams?.type || "all";
  const activeSort = searchParams?.sort || "latest";
  const typeValue = typeFromParam(activeType);
  const keyword = q.toLowerCase();
  const submittedWorks = await getSubmittedWorks();
  const allWorks = [...submittedWorks, ...works];
  const visibleWorks = allWorks
    .filter((work) => {
      const typeMatched = typeValue === "全部" || work.type === typeValue;
      const keywordMatched =
        !keyword ||
        [work.title, work.subtitle, work.maker, work.group, work.type].some((item) =>
          item.toLowerCase().includes(keyword),
        );
      return typeMatched && keywordMatched;
    })
    .sort((a, b) => activeSort === "score" ? b.score - a.score : b.updatedAt.localeCompare(a.updatedAt));

  return (
    <main>
      <SiteHeader />

      <section className="hero works-hero">
        <div className="hero-copy">
          <span className="eyebrow">船员实战成果库</span>
          <h1>每一个作品，都是一次真实出航</h1>
          <p>查看船员完成的小程序、热词游戏站与实战工具，点击即可进入真实作品体验。</p>
          <div className="hero-actions">
            <a className="primary-btn" href="#latest-works">探索作品 <span>→</span></a>
            <a className="text-btn" href={hrefFor("all", "latest", q)}>查看最新上船 <span>→</span></a>
          </div>
        </div>
        <div className="ship-scene" aria-label="航海作品舱视觉">
          <img src="/assets/hero-ship-engraving.png" alt="青绿色版画帆船" />
          <span className="map-line line-one" />
          <span className="map-line line-two" />
        </div>
        <HeroStats />
      </section>

      <section className="gallery-shell" id="latest-works">
        <div className="gallery-tools" aria-label="作品筛选工具栏">
          <form className="search-filter-group" action="/works">
            {activeType !== "all" && <input type="hidden" name="type" value={activeType} />}
            {activeSort !== "latest" && <input type="hidden" name="sort" value={activeSort} />}
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input name="q" defaultValue={q} placeholder="搜索作品、作者、课程群" aria-label="搜索作品、作者、课程群" />
            </label>
          </form>
          <div className="filter-row" role="group" aria-label="按作品类型筛选">
            {filters.map((filter) => (
              <a className={activeType === filter.value ? "active" : ""} href={hrefFor(filter.value, activeSort, q)} key={filter.value}>
                {filter.label}
              </a>
            ))}
          </div>
          <SortSelect activeType={activeType} activeSort={sorts.some((sort) => sort.value === activeSort) ? activeSort : "latest"} q={q} />
        </div>

        <div className="works-content-shell">
          <div className="section-title gallery-title">
            <h2>最新作品</h2>
            <span>查看全部 · 共 {visibleWorks.length} 个作品</span>
          </div>

          <div className="gallery-layout">
            <div className="work-grid wide">
              {visibleWorks.slice(0, 3).map((work) => <WorkCard key={work.id} work={work} />)}
            </div>
            <RankingPanel />
          </div>
        </div>
      </section>
    </main>
  );
}
