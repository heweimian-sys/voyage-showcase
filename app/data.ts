export type WorkType = "小程序" | "热词游戏站";

export type Work = {
  id: number;
  title: string;
  subtitle: string;
  maker: string;
  group: string;
  type: WorkType;
  updatedAt: string;
  score: number;
  url: string;
  screenshot?: string;
  screenshotAlt?: string;
  stats: [string, string, string];
  cover: "lighthouse" | "tiles" | "chart" | "journal" | "map";
  latest?: boolean;
  intro: string;
  highlights: string[];
};

export const works: Work[] = [
  {
    id: 1,
    title: "习惯航海日志",
    subtitle: "每日记录 · 见证成长",
    maker: "航海小北",
    group: "生财有术第 87 期",
    type: "小程序",
    updatedAt: "2026-08-17",
    score: 9.8,
    url: "https://example.com/habit",
    stats: ["8/10", "23天", "156次"],
    cover: "lighthouse",
    intro: "把每日行动、复盘和打卡进度做成轻量小程序，适合课程群船员持续记录自己的项目推进。",
    highlights: ["每日打卡数据一屏查看", "适合课程群复盘沉淀", "完成度高，路径清晰"],
  },
  {
    id: 2,
    title: "热词航海局",
    subtitle: "每日热词 · 知识闯关",
    maker: "词海拾贝",
    group: "生财有术第 88 期",
    type: "热词游戏站",
    updatedAt: "2026-08-16",
    score: 9.7,
    url: "https://example.com/hotword",
    stats: ["32关", "64词", "28人"],
    cover: "tiles",
    latest: true,
    intro: "用热点词做闯关游戏，把内容选题、词库整理和互动玩法结合起来，适合做传播测试。",
    highlights: ["热词闯关更有点击欲", "可持续更新词库", "适合做裂变和社群互动"],
  },
  {
    id: 3,
    title: "灵感航线",
    subtitle: "灵感收集与管理工具",
    maker: "灵感船长",
    group: "生财有术第 86 期",
    type: "小程序",
    updatedAt: "2026-08-15",
    score: 9.5,
    url: "https://example.com/inspire",
    stats: ["328条", "64组", "28次"],
    cover: "chart",
    intro: "帮助用户把零散灵感整理成可执行清单，从收藏到行动之间多了一层结构化处理。",
    highlights: ["灵感收集入口轻", "分类和回看体验完整", "适合做个人效率产品"],
  },
  {
    id: 4,
    title: "航海记账本",
    subtitle: "记录项目收入与成本",
    maker: "财务水手",
    group: "生财有术第 86 期",
    type: "小程序",
    updatedAt: "2026-08-14",
    score: 9.3,
    url: "https://example.com/ledger",
    stats: ["12项", "3类", "48笔"],
    cover: "journal",
    intro: "面向实战项目的轻记账工具，记录收入、成本和项目阶段，方便复盘项目是否值得继续投入。",
    highlights: ["收入成本分项记录", "适合小项目复盘", "能沉淀真实经营数据"],
  },
  {
    id: 5,
    title: "词海探险家",
    subtitle: "热点词语反应挑战",
    maker: "热词猎人",
    group: "生财有术第 88 期",
    type: "热词游戏站",
    updatedAt: "2026-08-13",
    score: 9.2,
    url: "https://example.com/explore",
    stats: ["15题", "80秒", "4榜"],
    cover: "map",
    intro: "把热词识别做成限时挑战，适合用来测试用户对热点内容的敏感度和参与兴趣。",
    highlights: ["限时挑战增强参与感", "榜单机制清晰", "适合作为热词训练游戏"],
  },
];

export const ranking = [...works].sort((a, b) => b.score - a.score);
export const miniCount = works.filter((work) => work.type === "小程序").length;
export const gameCount = works.filter((work) => work.type === "热词游戏站").length;
