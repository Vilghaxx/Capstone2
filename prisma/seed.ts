/**
 * Production seed script — creates initial staff accounts.
 *
 * Run with: bun run db:seed
 *
 * Creates a dentist and cashier account if they don't already exist.
 * Unlike the old demo seed endpoint, this does NOT create sample patients
 * or appointments — it only provisions the minimum staff needed to log in
 * and start using the system.
 *
 * Override the default credentials via environment variables:
 *   SEED_DENTIST_USERNAME, SEED_DENTIST_PASSWORD, SEED_DENTIST_NAME
 *   SEED_CASHIER_USERNAME, SEED_CASHIER_PASSWORD, SEED_CASHIER_NAME
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedStaffAccounts() {
  console.log("🌱 Seeding initial staff accounts...\n");

  const staffToCreate = [
    {
      username: process.env.SEED_DENTIST_USERNAME ?? "dentist",
      password: process.env.SEED_DENTIST_PASSWORD ?? "dentist123",
      role: "dentist",
      name: process.env.SEED_DENTIST_NAME ?? "Dr. Amara Reyes",
    },
    {
      username: process.env.SEED_CASHIER_USERNAME ?? "cashier",
      password: process.env.SEED_CASHIER_PASSWORD ?? "cashier123",
      role: "cashier",
      name: process.env.SEED_CASHIER_NAME ?? "Marco Dela Cruz",
    },
  ];

  let created = 0;
  for (const staffMember of staffToCreate) {
    const existing = await prisma.user.findUnique({
      where: { username: staffMember.username },
    });
    if (existing) {
      console.log(`  ✓ ${staffMember.role} "${staffMember.username}" already exists — skipping`);
      continue;
    }

    const hashedPassword = bcrypt.hashSync(staffMember.password, 10);
    await prisma.user.create({
      data: {
        username: staffMember.username,
        password: hashedPassword,
        role: staffMember.role,
        name: staffMember.name,
      },
    });
    console.log(`  + Created ${staffMember.role} "${staffMember.username}" (${staffMember.name})`);
    created++;
  }

  console.log(`\n${created === 0 ? "No new accounts needed —" : `Created ${created} account(s).`} Done.`);
  console.log("\n⚠️  Change these default passwords after first login in production.");
}

seedStaffAccounts()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
