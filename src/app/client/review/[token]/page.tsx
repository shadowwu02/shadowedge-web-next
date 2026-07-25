import type { Metadata } from "next";
import { ExternalClientReviewPortal } from "@/features/client-review/ExternalClientReviewPortal";

export const metadata: Metadata = {
  title: "Client Review · ShadowEdge",
  description: "Secure delivery review",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ClientReviewPage({
  params,
}: Readonly<{
  params: Promise<{ token: string }>;
}>) {
  const { token } = await params;
  return <ExternalClientReviewPortal token={token} />;
}
