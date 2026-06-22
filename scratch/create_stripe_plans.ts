import Stripe from "stripe";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-04-10", // use whatever recent version
});

async function main() {
  console.log("Creating Trader Plan ($19/mo)...");
  const traderProduct = await stripe.products.create({
    name: "Trader Plan",
    description: "Go live across multiple accounts. Max 3 accounts / bots.",
  });
  const traderPrice = await stripe.prices.create({
    product: traderProduct.id,
    unit_amount: 1900,
    currency: "usd",
    recurring: { interval: "month" },
  });
  console.log("Trader Price ID:", traderPrice.id);

  console.log("Creating Pro Plan ($49/mo)...");
  const proProduct = await stripe.products.create({
    name: "Pro Plan",
    description: "Scale with advanced bots and tooling. Max 10 accounts / bots.",
  });
  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 4900,
    currency: "usd",
    recurring: { interval: "month" },
  });
  console.log("Pro Price ID:", proPrice.id);

  // Update plans.ts automatically
  const plansPath = path.join(process.cwd(), "src/lib/plans.ts");
  let content = fs.readFileSync(plansPath, "utf-8");
  content = content.replace(
    /export const PRICE_IDS = \{([\s\S]*?)\} as const;/,
    `export const PRICE_IDS = {\n  TRADER: process.env.NEXT_PUBLIC_STRIPE_PRICE_TRADER ?? "${traderPrice.id}",\n  PRO: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "${proPrice.id}",\n} as const;`
  );
  fs.writeFileSync(plansPath, content);
  console.log("Updated src/lib/plans.ts successfully.");
}

main().catch(console.error);
