import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../middleware/utils/AppError.js";
import {
  findCartByBuyerId,
  findOrCreateCartByBuyerId,
  findCartItem,
  upsertCartItem,
  deleteCartItem,
} from "./cart.model.js";
import prisma from "../../config/prisma.js";

function toDecimal(value) {
  if (value instanceof Prisma.Decimal) return value;

  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }

  return new Prisma.Decimal(String(value));
}

function getAvailableStock(product) {
  return Math.max(0, product.stockOnHand - product.stockReserved);
}

function getAvailability(product) {
  return getAvailableStock(product) > 0 ? "IN_STOCK" : "OUT_OF_STOCK";
}

function toMoney(amount, currency = "NGN") {
  return {
    amount: toDecimal(amount).toFixed(2),
    currency,
  };
}

function toCartItemDto(item) {
  const product = item.product;
  const availableStock = getAvailableStock(product);

  return {
    product: {
      id: product.id,
      name: product.name,
    },
    quantity: item.quantity,
    unitPrice: toMoney(product.priceAmount, product.currency),
    availability: availableStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
  };
}

function toCartDto(cart) {
  const items = cart.items.map(toCartItemDto);

  const subtotal = cart.items.reduce(
    (total, item) =>
      total.add(toDecimal(item.product.priceAmount).mul(item.quantity)),
    new Prisma.Decimal(0),
  );

  const notices = [];

  for (const item of cart.items) {
    const availableStock = getAvailableStock(item.product);

    if (item.product.status !== "ACTIVE") {
      notices.push({
        productId: item.product.id,
        code: "PRODUCT_UNAVAILABLE",
        message: `${item.product.name} is no longer available.`,
      });
      continue;
    }

    if (!item.product.isAvailable) {
      notices.push({
        productId: item.product.id,
        code: "PRODUCT_UNAVAILABLE",
        message: `${item.product.name} is currently unavailable.`,
      });
      continue;
    }

    if (availableStock <= 0) {
      notices.push({
        productId: item.product.id,
        code: "OUT_OF_STOCK",
        message: `${item.product.name} is out of stock.`,
      });
      continue;
    }

    if (item.quantity > availableStock) {
      notices.push({
        productId: item.product.id,
        code: "INSUFFICIENT_STOCK",
        message: `${item.product.name} has only ${availableStock} item(s) available.`,
      });
    }
  }

  return {
    id: cart.id,
    items,
    subtotal: {
      amount: toMoney(subtotal).amount,
      currency: "NGN",
    },
    notices,
  };
}

export async function getBuyerCart(buyerId) {
  const cart = await findOrCreateCartByBuyerId(buyerId);

  return toCartDto(cart);
}

export async function updateBuyerCartItem({ buyerId, productId, quantity }) {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    include: {
      category: true,
      vendor: true,
      images: {
        orderBy: {
          position: "asc",
        },
      },
    },
  });

  if (!product) {
    throw new AppError("Product not found", 404, "NOT_FOUND");
  }

  if (product.status !== "ACTIVE" || !product.isAvailable) {
    throw new AppError(
      "This product is currently unavailable",
      409,
      "PRODUCT_UNAVAILABLE",
    );
  }

  const availableStock = getAvailableStock(product);

  if (availableStock <= 0) {
    throw new AppError("This product is out of stock", 409, "OUT_OF_STOCK");
  }

  if (quantity > availableStock) {
    throw new AppError(
      `Only ${availableStock} item(s) are available`,
      409,
      "INSUFFICIENT_STOCK",
    );
  }

  await upsertCartItem({
    buyerId,
    productId,
    quantity,
  });

  return getBuyerCart(buyerId);
}

export async function removeBuyerCartItem({ buyerId, productId }) {
  const result = await deleteCartItem(buyerId, productId);

  if (result.count === 0) {
    throw new AppError("Cart item not found", 404, "NOT_FOUND");
  }
}
