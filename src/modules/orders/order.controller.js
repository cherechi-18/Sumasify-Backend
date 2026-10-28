import { asyncHandler } from "../../middleware/utils/asyncHandler.js";

import {orderListQuerySchema,orderIdSchema} from "./order.validation.js";

import {getBuyerOrders,getOrderById} from "./order.service.js";

export const listOrders = asyncHandler(async (req, res) => {
  const filters = orderListQuerySchema.parse(req.query);

  const result = await getBuyerOrders({
    buyerId: req.user.id,
    status: filters.status,
    page: filters.page,
    pageSize: filters.pagesize,
  });

  res.status(200).json(result);
});

export const getOrder = asyncHandler(async (req, res) => {
  const { orderid } = orderIdSchema.parse(req.params);

  const order = await getOrderById({
    orderId: orderid,
    userId: req.user.id,
    userRole: req.user.role,
  });

  res.status(200).json({
    data: order,
  });
});