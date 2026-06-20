import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type ClerkUserData = {
  id: string;
  email_addresses?: { id: string; email_address: string }[];
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
};

function primaryEmail(data: ClerkUserData): string {
  const primary = data.email_addresses?.find(
    (e) => e.id === data.primary_email_address_id,
  );
  return primary?.email_address ?? data.email_addresses?.[0]?.email_address ?? "";
}

/**
 * Clerk webhook: keeps the local `users` table in sync with Clerk.
 * Set CLERK_WEBHOOK_SIGNING_SECRET and point a Clerk webhook at
 * /api/webhooks/clerk for user.created, user.updated, user.deleted.
 */
export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const data = evt.data as ClerkUserData;

  switch (evt.type) {
    case "user.created":
    case "user.updated": {
      await prisma.user.upsert({
        where: { clerkId: data.id },
        create: {
          clerkId: data.id,
          email: primaryEmail(data),
          firstName: data.first_name ?? null,
          lastName: data.last_name ?? null,
          imageUrl: data.image_url ?? null,
        },
        update: {
          email: primaryEmail(data),
          firstName: data.first_name ?? null,
          lastName: data.last_name ?? null,
          imageUrl: data.image_url ?? null,
        },
      });
      break;
    }
    case "user.deleted": {
      if (data.id) {
        await prisma.user.deleteMany({ where: { clerkId: data.id } });
      }
      break;
    }
  }

  return new Response("ok", { status: 200 });
}
