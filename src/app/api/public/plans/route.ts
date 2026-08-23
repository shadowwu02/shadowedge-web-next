import { getPublicPlanCatalog } from "@/config/public-plan-catalog";

export const dynamic = "force-static";

export function GET() {
  return Response.json(getPublicPlanCatalog(), {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
