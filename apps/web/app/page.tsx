const foundations = [
  "Next.js Web 与 Node Worker 独立运行",
  "PostgreSQL + Drizzle 数据骨架",
  "证据、事件与预测对象分层存储",
];

export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">CODEX RESET OBSERVATORY</p>
        <h1>工程底座已就绪</h1>
        <p className="lede">
          当前是阶段 2 基础版本。采集、分类、预测和完整仪表盘将在后续阶段接入。
        </p>
        <div className="status-row">
          <span className="status-dot" aria-hidden="true" />
          <span>Foundation ready</span>
        </div>
      </section>

      <section className="foundation" aria-labelledby="foundation-title">
        <p id="foundation-title" className="section-label">
          CURRENT FOUNDATION
        </p>
        <ul>
          {foundations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
