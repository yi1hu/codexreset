import { getCollectorHealth, pingDatabase } from "@codexreset/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const checkedAt = new Date().toISOString();

  try {
    await pingDatabase();
    const collectors = await getCollectorHealth();
    const collectorStatus = collectors.some((collector) => collector.status !== "ok")
      ? "degraded"
      : "ok";

    return Response.json({
      status: collectorStatus === "ok" ? "ok" : "degraded",
      checkedAt,
      checks: { application: "ok", database: "ok", collectors: collectorStatus },
      collectors,
    });
  } catch {
    return Response.json(
      {
        status: "degraded",
        checkedAt,
        checks: { application: "ok", database: "unavailable" },
      },
      { status: 503 },
    );
  }
}
