import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json(
      { status: "ok", database: "connected", timestamp },
      { status: 200 },
    );
  } catch (error) {
    console.error("Health check database query failed", {
      error: error instanceof Error ? error.message : "Unknown database error",
    });

    return Response.json(
      { status: "degraded", database: "disconnected", timestamp },
      { status: 503 },
    );
  }
}
