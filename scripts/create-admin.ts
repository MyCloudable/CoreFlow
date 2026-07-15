// Create (or reset the password of) a platform admin — the only account YOU
// use, at <root domain>/admin. Run this instead of the demo seed in production.
//
//   npm run create-admin -- admin@yourdomain.com "a-strong-password" "Your Name"
//
// Works against whatever DATABASE_URL is set (pass a production URL inline to
// bootstrap a fresh deployment).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const [, , emailArg, password, name] = process.argv;
  const email = (emailArg ?? "").trim().toLowerCase();
  if (!email || !password || password.length < 8) {
    console.error('Usage: npm run create-admin -- <email> <password (8+ chars)> "[name]"');
    process.exit(1);
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const existing = await db.user.findFirst({
    where: { tenantId: null, role: "PLATFORM_ADMIN", email },
  });

  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: { passwordHash, active: true, ...(name ? { name } : {}) },
    });
    console.log(`Updated platform admin ${email} (password reset).`);
  } else {
    await db.user.create({
      data: {
        email,
        name: name || "Platform Admin",
        role: "PLATFORM_ADMIN",
        passwordHash,
      },
    });
    console.log(`Created platform admin ${email}.`);
  }
  console.log("Sign in at /admin on your root domain.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
