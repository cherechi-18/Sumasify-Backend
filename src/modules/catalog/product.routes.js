import { Router } from "express";
import { listProducts, getProduct } from "./product.controller.js";

const router = Router();

router.get("/products", listProducts);
router.get("/products/:productid", getProduct);

export default router;
