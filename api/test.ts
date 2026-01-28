import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check if DATABASE_URL exists
    if (!process.env.DATABASE_URL) {
      return res.json({
        status: "error",
        message: "DATABASE_URL not set",
        envKeys: Object.keys(process.env).filter(k => !k.includes('SECRET'))
      });
    }

    // Try to import and use neon
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL);

    // Simple query
    const result = await sql`SELECT 1 as test`;

    return res.json({
      status: "ok",
      dbConnected: true,
      testResult: result
    });
  } catch (error) {
    return res.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
