import { productIdSchema, updateCartItemSchema } from "./cart.validation.js";
import {
  getBuyerCart,
  updateBuyerCartItem,
  removeBuyerCartItem,
} from "./cart.service.js";

export const getCart = async (req, res, next) => {
  try {
    const cart = await getBuyerCart(req.user.id);

    return res.status(200).json({
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (req, res, next) => {
  try {
    const { productid } = productIdSchema.parse(req.params);
    const { quantity } = updateCartItemSchema.parse(req.body);

    const cart = await updateBuyerCartItem({
      buyerId: req.user.id,
      productId: productid,
      quantity,
    });

    return res.status(200).json({
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCartItem = async (req, res, next) => {
  try {
    const { productid } = productIdSchema.parse(req.params);

    await removeBuyerCartItem({
      buyerId: req.user.id,
      productId: productid,
    });

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};
