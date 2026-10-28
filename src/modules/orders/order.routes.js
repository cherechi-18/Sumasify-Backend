import { Router } from "express";
import {authenticate,authorizeRoles,} from "../../middleware/auth/auth.middleware.js";
import {listOrders,getOrder,} from "./order.controller.js";

const router = Router();

router.get("/orders",authenticate,authorizeRoles("BUYER"),listOrders);
router.get("/orders/:orderid",authenticate,authorizeRoles("BUYER", "ADMIN"),getOrder);
export default router;
