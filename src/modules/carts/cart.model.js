import prisma from "../../config/prisma.js";

export const findCartByBuyerId = async (buyerId) => {
  return prisma.cart.findUnique({
    where: {
      buyerId,
    },
    include: {
      items: {
        orderBy: {
          addedAt: "asc",
        },
        include: {
          product: {
            include: {
              category: true,
              vendor: true,
              images: {
                orderBy: {
                  position: "asc",
                },
              },
            },
          },
        },
      },
    },
  });
};

export const findOrCreateCartByBuyerId = async (buyerId) => {
  return prisma.cart.upsert({
    where: {
      buyerId,
    },
    update: {},
    create: {
      buyerId,
    },
    include: {
      items: {
        orderBy: {
          addedAt: "asc",
        },
        include: {
          product: {
            include: {
              category: true,
              vendor: true,
              images: {
                orderBy: {
                  position: "asc",
                },
              },
            },
          },
        },
      },
    },
  });
};

export const findCartItem = async (buyerId, productId) => {
  return prisma.cartItem.findFirst({
    where: {
      cart: {
        buyerId,
      },
      productId,
    },
    include: {
      product: {
        include: {
          category: true,
          vendor: true,
          images: {
            orderBy: {
              position: "asc",
            },
          },
        },
      },
    },
  });
};

export const upsertCartItem = async ({ buyerId, productId, quantity }) => {
  const cart = await prisma.cart.upsert({
    where: {
      buyerId,
    },
    update: {},
    create: {
      buyerId,
    },
  });

  return prisma.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId,
      },
    },
    update: {
      quantity,
    },
    create: {
      cartId: cart.id,
      productId,
      quantity,
    },
    include: {
      product: {
        include: {
          category: true,
          vendor: true,
          images: {
            orderBy: {
              position: "asc",
            },
          },
        },
      },
    },
  });
};

export const deleteCartItem = async (buyerId, productId) => {
  return prisma.cartItem.deleteMany({
    where: {
      cart: {
        buyerId,
      },
      productId,
    },
  });
};
