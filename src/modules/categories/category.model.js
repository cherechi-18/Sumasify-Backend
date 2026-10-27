import prisma from "../../config/prisma.js";

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
};

export function findCategories({ active = true } = {}) {
  return prisma.category.findMany({
    where: { isActive: active },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: categorySelect,
  });
}

export function findCategoryById(id) {
  return prisma.category.findUnique({
    where: { id },
    select: categorySelect,
  });
}

export function createCategoryWithAudit(data, audit) {
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.create({
      data,
      select: categorySelect,
    });

    await tx.adminAuditLog.create({
      data: {
        ...audit,
        entityId: category.id,
        before: null,
        after: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          isactive: category.isActive,
          sortorder: category.sortOrder,
        },
      },
    });

    return category;
  });
}

export function updateCategoryWithAudit(id, data, audit) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.category.findUnique({
      where: { id },
      select: categorySelect,
    });

    if (!existing) return null;

    const category = await tx.category.update({
      where: { id },
      data,
      select: categorySelect,
    });

    await tx.adminAuditLog.create({
      data: {
        ...audit,
        entityId: category.id,
        before: {
          id: existing.id,
          name: existing.name,
          slug: existing.slug,
          isactive: existing.isActive,
          sortorder: existing.sortOrder,
        },
        after: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          isactive: category.isActive,
          sortorder: category.sortOrder,
        },
      },
    });

    return category;
  });
}
