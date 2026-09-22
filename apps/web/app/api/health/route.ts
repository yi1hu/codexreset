import { pingDatabase } from "@codexreset/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const checkedAt = new Date().toISOString();

  try {
    await pingDatabase();
    return Response.json({
      status: "ok",
      checkedAt,
      checks: { application: "ok", database: "ok" },
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
