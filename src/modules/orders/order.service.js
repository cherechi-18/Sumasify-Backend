import {findOrdersByBuyerId,countOrdersByBuyerId,findOrderByIdAndBuyerId} from "./order.model.js";
import prisma from "../../config/prisma.js";
import AppError from "../../middleware/utils/AppError.js";

function formatMoney(amount) {return amount.toFixed(2);}

function formatOrderItem(item) {
return {
id: item.id,
productid: item.productId,
productname: item.productNameSnapshot,
unitpriceamount: formatMoney(item.unitPriceAmount),
quantity: item.quantity,
linetotalamount: formatMoney(item.lineTotalAmount),
imageurl: item.imageUrlSnapshot,
vendorname: item.vendorNameSnapshot,
createdat: item.createdAt,
};
}

function formatVendorGroup(group) {
return {
id: group.id,
groupnumber: group.groupNumber,
vendor: {
id: group.vendor.id,
businessname: group.vendor.businessName,
},
subtotalamount: formatMoney(group.subtotalAmount),
deliveryamount: formatMoney(group.deliveryAmount),
commissionamount: formatMoney(group.commissionAmount),
payoutamount: formatMoney(group.payoutAmount),
fulfilmentstatus: group.fulfilmentStatus.toLowerCase(),
deliverymethod: group.deliveryMethod.toLowerCase(),
vendornotes: group.vendorNotes,
settlementstatus: group.settlementStatus.toLowerCase(),
items: group.orderItems.map(formatOrderItem),
};
}

function formatOrder(order) {
return {
id: order.id,
ordernumber: order.orderNumber,
status: order.status.toLowerCase(),
paymentstatus: order.paymentStatus.toLowerCase(),
currency: order.currency,
subtotalamount: formatMoney(order.subtotalAmount),
deliveryamount: formatMoney(order.deliveryAmount),
totalamount: formatMoney(order.totalAmount),
deliveryaddresssnapshot: order.deliveryAddressSnapshot,
placedat: order.placedAt,
cancelledat: order.cancelledAt,
createdat: order.createdAt,
updatedat: order.updatedAt,
vendorgroups: order.vendorOrderGroups.map(formatVendorGroup),
};
}

export async function getBuyerOrders({
buyerId,
status,
page,
pageSize,
}) {
const skip = (page - 1) * pageSize;
const prismaStatus = status?.toUpperCase();

const [orders, total] = await Promise.all([
findOrdersByBuyerId({
buyerId,
status: prismaStatus,
skip,
take: pageSize,
}),
countOrdersByBuyerId({
buyerId,
status: prismaStatus,
}),
]);

return {
data: orders.map(formatOrder),
meta: {
page,
pagesize: pageSize,
total,
totalpages: Math.ceil(total / pageSize),
},
};
}

export async function getOrderById({
orderId,
userId,
userRole,
}) {
let order;

if (userRole === "admin") {
order = await prisma.order.findUnique({
where: {
id: orderId,
},
include: {
vendorOrderGroups: {
orderBy: {
groupNumber: "asc",
},
include: {
vendor: {
select: {
id: true,
businessName: true,
},
},
orderItems: {
orderBy: {
createdAt: "asc",
},
},
},
},
},
});
} else {
order = await findOrderByIdAndBuyerId({
orderId,
buyerId: userId,
});
}

if (!order) {
throw new AppError(
"Order not found",
404,
"ORDER_NOT_FOUND"
);
}

return formatOrder(order);
}
