import prisma from "../src/config/prisma.js";
import bcrypt from "bcrypt";

async function main() {
  const superAdminPasswordHash = await bcrypt.hash(
    process.env.SUPER_ADMIN_PASSWORD,
    10,
  );

  await prisma.user.upsert({
    where: {
      email: process.env.SUPER_ADMIN_EMAIL,
    },
    update: {
      fullName: process.env.SUPER_ADMIN_NAME,
      phoneE164: process.env.SUPER_ADMIN_PHONE,
      role: "ADMIN",
      adminRole: "SUPER_ADMIN",
      accountStatus: "ACTIVE",
    },
    create: {
      email: process.env.SUPER_ADMIN_EMAIL,
      phoneE164: process.env.SUPER_ADMIN_PHONE,
      fullName: process.env.SUPER_ADMIN_NAME,
      passwordHash: superAdminPasswordHash,
      role: "ADMIN",
      adminRole: "SUPER_ADMIN",
      accountStatus: "ACTIVE",
    },
  });

  console.log("Super Admin seeded successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
