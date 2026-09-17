import prisma from "../src/config/prisma.js";
import bcrypt from "bcrypt";

async function main() {
  // Seed Super Admin
  const superAdminPasswordHash = await bcrypt.hash(
    process.env.SUPER_ADMIN_PASSWORD,
    10
  );

  // Seed Super Admin
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

  // Seed default categories
  const categories = [
    { name: "Fashion", slug: "fashion" },
    { name: "Electronics/Gadgets", slug: "electronics-gadgets" },
    { name: "Beauty", slug: "beauty" },
    { name: "Accessories", slug: "accessories" },
    { name: "Books/Textbooks", slug: "books-textbooks" },
    { name: "Services", slug: "services" },
    { name: "Other", slug: "other" },
  ];

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];

    await prisma.category.upsert({
      where: {
        slug: category.slug,
      },

      update: {
        name: category.name,
        isActive: true,
        sortOrder: i,
      },

      create: {
        name: category.name,
        slug: category.slug,
        isActive: true,
        sortOrder: i,
      },
    });
  }

  console.log("Default categories seeded successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });