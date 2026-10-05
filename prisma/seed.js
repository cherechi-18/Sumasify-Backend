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

  const categories = [
    { name: "Fashion", slug: "fashion" },
    { name: "Electronics/Gadgets", slug: "electronics-gadgets" },
    { name: "Beauty", slug: "beauty" },
    { name: "Accessories", slug: "accessories" },
    { name: "Books/Textbooks", slug: "books-textbooks" },
    { name: "Services", slug: "services" },
    { name: "Other", slug: "other" },
  ];

  const seededCategories = {};

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];

    const savedCategory = await prisma.category.upsert({
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

    seededCategories[category.slug] = savedCategory;
  }

  console.log("Default categories seeded successfully.");

  const vendorUser = await prisma.user.upsert({
    where: { email: "vendor@example.com" },
    update: {
      fullName: "Demo Vendor",
      role: "VENDOR",
      accountStatus: "ACTIVE",
    },
    create: {
      email: "vendor@example.com",
      fullName: "Demo Vendor",
      passwordHash: await bcrypt.hash("Password123!", 10),
      role: "VENDOR",
      accountStatus: "ACTIVE",
    },
  });

  const vendor = await prisma.vendor.upsert({
    where: { userId: vendorUser.id },
    update: {
      businessName: "Demo Vendor Store",
      slug: "demo-vendor-store",
      contactPhone: "+2348000000000",
      status: "ACTIVE",
    },
    create: {
      userId: vendorUser.id,
      businessName: "Demo Vendor Store",
      slug: "demo-vendor-store",
      contactPhone: "+2348000000000",
      status: "ACTIVE",
    },
  });

  const demoCategory = seededCategories.fashion;

  await prisma.product.upsert({
    where: {
      id: "11111111-1111-4111-8111-111111111111",
    },
    update: {
      vendorId: vendor.id,
      categoryId: demoCategory.id,
      name: "Sample Product",
      description: "A demo product for testing catalog and cart APIs",
      priceAmount: 2500,
      currency: "NGN",
      stockOnHand: 10,
      stockReserved: 0,
      status: "ACTIVE",
      isAvailable: true,
      publishedAt: new Date(),
    },
    create: {
      id: "11111111-1111-4111-8111-111111111111",
      vendorId: vendor.id,
      categoryId: demoCategory.id,
      name: "Sample Product",
      description: "A demo product for testing catalog and cart APIs",
      priceAmount: 2500,
      currency: "NGN",
      stockOnHand: 10,
      stockReserved: 0,
      status: "ACTIVE",
      isAvailable: true,
      publishedAt: new Date(),
    },
  });

  console.log("Demo vendor and product seeded successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
