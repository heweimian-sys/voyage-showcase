import Link from "next/link";
import { SiteHeader, WorkCover } from "../components";
import { ranking } from "../data";

const tabs = [
  { key: "week", label: "本周榜单" },
  { key: "month", label: "本月榜单" },
  { key: "latest", label: "最新上榜" },
] as const;

export default function RankingPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const activeKey = tabs.some((tab) => tab.key === searchParams?.tab) ? searchParams?.tab : "week";
  const rankedWorks = activeKey === "latest" ? [...ranking].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : ranking;
  const topThree = rankedWorks.slice(0, 3);
  const rest = rankedWorks.slice(3);

  return (
    <main>
      <SiteHeader />
      <section className="page-hero compact ranking-hero">
        <span className="eyebrow">作品榜单</span>
        <h1>看见正在被点击的船员作品</h1>
        <p>综合作品完成度、体验、创意与船员反馈，帮助新船员快速找到值得参考和体验的真实项目。</p>
        <div className="tab-row" role="tablist" aria-label="榜单类型">
          {tabs.map((tab) => (
            <Link className={activeKey === tab.key ? "active" : ""} href={`/ranking?tab=${tab.key}`} key={tab.key}>
              {tab.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="ranking-board">
        <div className="podium-grid">
          {topThree.map((work, index) => (
            <Link className={`podium-card top-${index + 1}`} href={`/works/${work.id}`} key={work.id}>
              <span className={`medal medal-${index + 1}`}>{index + 1}</span>
              <WorkCover work={work} compact />
              <div>
                <strong>{work.title}</strong>
                <small>{work.maker} · {work.group}</small>
              </div>
              <em>{work.type}</em>
              <b>{work.score.toFixed(1)}</b>
              <span className="visit-link">进入体验 ↗</span>
            </Link>
          ))}
        </div>

        <div className="ranking-content">
          <div className="ranking-list">
            {rest.map((work, index) => (
              <Link className="ranking-row" href={`/works/${work.id}`} key={work.id}>
                <span className="rank-number">{index + 4}</span>
                <WorkCover work={work} compact />
                <div>
                  <strong>{work.title}</strong>
                  <small>{work.maker} · {work.group}</small>
                </div>
                <em>{work.type}</em>
                <b>{work.score.toFixed(1)}</b>
                <span className="visit-link">进入体验 ↗</span>
              </Link>
            ))}
          </div>

          <aside className="rule-card">
            <h2>榜单规则</h2>
            <p>评分综合作品完成度、页面体验、创意表达与船员反馈。橙金只标记前三名和最新提交，避免喧宾夺主。</p>
            <div className="newcomer-card">
              <span>本周新晋作品</span>
              <strong>{rankedWorks[0]?.title}</strong>
              <Link href={`/works/${rankedWorks[0]?.id}`}>去看看 ↗</Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
