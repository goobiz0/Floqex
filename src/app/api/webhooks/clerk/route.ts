import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { prisma } from "@/lib/db";
import { getPostHogClient } from "@/lib/posthog-server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const ClerkEmailAddressSchema = z.object({
  id: z.string(),
  email_address: z.string().email(),
});

const ClerkUserDataSchema = z.object({
  id: z.string().max(100),
  email_addresses: z.array(ClerkEmailAddressSchema).optional(),
  primary_email_address_id: z.string().max(100).nullable().optional(),
  first_name: z.string().max(100).nullable().optional(),
  last_name: z.string().max(100).nullable().optional(),
  image_url: z.string().max(2000).nullable().optional(),
});

type ClerkUserData = z.infer<typeof ClerkUserDataSchema>;

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
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  const rateLimitSuccess = await checkRateLimit(`clerk_webhook_${ip}`, 100, "1 m");
  if (!rateLimitSuccess) return new Response("Rate limit exceeded", { status: 429 });

  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const parsedData = ClerkUserDataSchema.safeParse(evt.data);
  if (!parsedData.success) {
    return new Response("Invalid payload schema", { status: 400 });
  }
  const data = parsedData.data;

  const posthog = getPostHogClient();
  const email = primaryEmail(data);

  switch (evt.type) {
    case "user.created": {
      await prisma.user.upsert({
        where: { clerkId: data.id },
        create: {
          clerkId: data.id,
          email,
          firstName: data.first_name ?? null,
          lastName: data.last_name ?? null,
          imageUrl: data.image_url ?? null,
        },
        update: {
          email,
          firstName: data.first_name ?? null,
          lastName: data.last_name ?? null,
          imageUrl: data.image_url ?? null,
        },
      });
      posthog.identify({
        distinctId: email,
        properties: { email, first_name: data.first_name, last_name: data.last_name },
      });
      posthog.capture({
        distinctId: email,
        event: "user_created",
        properties: { clerk_id: data.id, email },
      });
      break;
    }
    case "user.updated": {
      await prisma.user.upsert({
        where: { clerkId: data.id },
        create: {
          clerkId: data.id,
          email,
          firstName: data.first_name ?? null,
          lastName: data.last_name ?? null,
          imageUrl: data.image_url ?? null,
        },
        update: {
          email,
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
