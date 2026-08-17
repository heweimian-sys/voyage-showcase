import Link from "next/link";
import { notFound } from "next/navigation";
import { RankingPanel, SiteHeader, WorkCover } from "../../components";
import { works } from "../../data";
import { getSubmittedWork } from "../../../db/submitted-works";

export const dynamic = "force-dynamic";

export default async function WorkDetailPage({ params }: { params: { id: string } }) {
  const staticWork = works.find((item) => item.id === Number(params.id));
  const work = staticWork ?? await getSubmittedWork(params.id);
  if (!work) notFound();

  return (
    <main>
      <SiteHeader />
      <section className="detail-shell">
        <div className="detail-main">
          <Link className="back-link" href="/works">← 返回作品广场</Link>
          <WorkCover work={work} />
          <h1>{work.title}</h1>
          <p className="detail-intro">{work.intro}</p>
          <div className="detail-meta">
            <span>{work.type}</span>
            <span>{work.maker}</span>
            <span>{work.group}</span>
            <span>评分 {work.score.toFixed(1)}</span>
            <span>更新 {work.updatedAt}</span>
          </div>
          <div className="detail-actions">
            <a className="primary-btn" href={work.url} target="_blank" rel="noreferrer">进入体验 ↗</a>
            <Link className="text-btn" href="/submit">我也要提交作品 →</Link>
          </div>
        </div>

        <aside className="detail-side">
          <h2>为什么值得看</h2>
          <ul>
            {work.highlights.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <RankingPanel compact />
        </aside>
      </section>
    </main>
  );
}
