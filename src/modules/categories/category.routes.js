import { Router } from "express";
import { authenticate } from "../../middleware/utils/authenticate.js";
import { authorizeRoles } from "../../middleware/utils/authorize.js";
import {
  createCategory,
  listCategories,
  updateCategory,
  updateCategoryStatus,
} from "./category.controller.js";

const router = Router();

// Public catalogue metadata.
router.get("/categories", listCategories);

// Category management is restricted to authenticated admins.
router.post(
  "/admin/categories",
  authenticate,
  authorizeRoles("ADMIN"),
  createCategory
);

router.patch(
  "/admin/categories/:categoryId",
  authenticate,
  authorizeRoles("ADMIN"),
  updateCategory
);

router.patch(
  "/admin/categories/:categoryId/status",
  authenticate,
  authorizeRoles("ADMIN"),
  updateCategoryStatus
);

export default router;
