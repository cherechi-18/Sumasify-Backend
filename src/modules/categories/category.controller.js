import { asyncHandler } from "../../middleware/utils/asyncHandler.js";
import {
  categoryIdSchema,
  createCategorySchema,
  listCategoriesSchema,
  updateCategorySchema,
  updateCategoryStatusSchema,
} from "./category.validation.js";
import {
  createAdminCategory,
  listPublicCategories,
  updateAdminCategory,
  updateAdminCategoryStatus,
} from "./category.service.js";

export const listCategories = asyncHandler(async (req, res) => {
  const query = listCategoriesSchema.parse(req.query);
  const categories = await listPublicCategories(query);

  res.status(200).json({
    data: categories,
  });
});

export const createCategory = asyncHandler(async (req, res) => {
  const data = createCategorySchema.parse(req.body);
  const category = await createAdminCategory(data, req.user.id);

  res.status(201).json({
    data: category,
  });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { categoryId } = categoryIdSchema.parse(req.params);
  const data = updateCategorySchema.parse(req.body);
  const category = await updateAdminCategory(
    categoryId,
    data,
    req.user.id
  );

  res.status(200).json({
    data: category,
  });
});

export const updateCategoryStatus = asyncHandler(async (req, res) => {
  const { categoryId } = categoryIdSchema.parse(req.params);
  const { isActive } = updateCategoryStatusSchema.parse(req.body);
  const category = await updateAdminCategoryStatus(
    categoryId,
    isActive,
    req.user.id
  );

  res.status(200).json({
    data: category,
  });
});
