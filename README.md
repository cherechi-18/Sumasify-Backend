# Categories API

```text
Fashion
Electronics/Gadgets
Beauty
Accessories
Books/Textbooks
Services
Other
```

---

## List public categories

```http
GET /api/v1/categories
```

Returns active categories for public catalogue use.

Example:

```http
GET /api/v1/categories
```

---

# Admin Category API

These endpoints require:

```text
ADMIN
```

authorization.

## Create category

```http
POST /api/v1/admin/categories
```

Example:

```json
{
  "name": "Fashion"
}
```

The backend derives the category slug and prevents duplicate categories.

---

## Update category

```http
PATCH /api/v1/admin/categories/:categoryId
```

Example:

```http
PATCH /api/v1/admin/categories/7c8...
```

Request:

```json
{
  "name": "Fashion & Clothing"
}
```

The backend validates the category and handles slug updates appropriately.

---

## Change category status

```http
PATCH /api/v1/admin/categories/:categoryId/status
```

Example:

```json
{
  "isActive": false
}
```

This allows an administrator to activate/deactivate a category without deleting it.

---

# Product Catalogue API

The catalogue supports:

- Search
- Category filtering
- Vendor filtering
- Minimum price
- Maximum price
- Stock filtering
- Sorting
- Pagination
- Product detail retrieval

---

# 10. List Products

```http
GET /api/v1/products
```

### Supported query parameters

| Parameter  | Description                         |
| ---------- | ----------------------------------- |
| `q`        | Search product name/description     |
| `category` | Category UUID or slug               |
| `vendor`   | Vendor UUID                         |
| `minPrice` | Minimum price                       |
| `maxPrice` | Maximum price                       |
| `inStock`  | Filter by current availability      |
| `sort`     | `newest`, `price_asc`, `price_desc` |
| `page`     | Page number                         |
| `pageSize` | Number of records per page          |

`pageSize` is capped at:

```text
50
```

---

## Example — basic catalogue request

```http
GET /api/v1/products
```

## Example — search

```http
GET /api/v1/products?q=iphone
```

## Example — category

```http
GET /api/v1/products?category=fashion
```

## Example — price range

```http
GET /api/v1/products?minPrice=5000&maxPrice=50000
```

## Example — only products currently in stock

```http
GET /api/v1/products?inStock=true
```

## Example — cheapest first

```http
GET /api/v1/products?sort=price_asc
```

## Example — newest products

```http
GET /api/v1/products?sort=newest
```

## Example — pagination

```http
GET /api/v1/products?page=1&pageSize=20
```

---

# Product List Response

The product DTO follows the contract's catalogue structure.

Example:

```json
{
  "data": [
    {
      "id": "product-id",
      "name": "Sample Product",
      "description": "Product description",
      "price": {
        "amount": "25000.00",
        "currency": "NGN"
      },
      "category": {
        "id": "category-id",
        "name": "Fashion",
        "slug": "fashion"
      },
      "availability": "IN_STOCK",
      "stockQuantity": 12,
      "images": [],
      "vendor": {
        "id": "vendor-id",
        "name": "Vendor Name"
      }
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Money is represented as decimal strings rather than JavaScript floating-point numbers.

For example:

```json
{
  "amount": "25000.00",
  "currency": "NGN"
}
```

---

# Product Availability

The backend calculates the available stock rather than simply exposing raw inventory.

Conceptually:

```text
available stock =
stockOnHand - stockReserved
```

This means a product can have inventory in the database while still being unavailable for purchase because part of that inventory is reserved.

---

# Public Product Visibility

The public catalogue does not simply return every product stored in the database.

A product must satisfy the backend's publication/visibility requirements.

The implemented catalogue checks the relevant product, category and vendor state.

In particular, public catalogue visibility requires the relevant entities to be active/available according to the contract rules.

This prevents inactive catalogue records from accidentally appearing to buyers.

---

# Get Product Details

```http
GET /api/v1/products/:productId
```

Example:

```http
GET /api/v1/products/7c8e9...
```

Response:

```json
{
  "data": {
    "id": "product-id",
    "name": "Sample Product",
    "description": "Product description",
    "price": {
      "amount": "25000.00",
      "currency": "NGN"
    },
    "category": {
      "id": "category-id",
      "name": "Fashion",
      "slug": "fashion"
    },
    "availability": "IN_STOCK",
    "stockQuantity": 12,
    "images": [],
    "vendor": {
      "id": "vendor-id",
      "name": "Vendor Name"
    }
  }
}
```

---

# Pagination

Catalogue endpoints use:

```text
page
pageSize
```

Example:

```http
GET /api/v1/products?page=2&pageSize=10
```

The response includes pagination metadata.

```json
{
  "meta": {
    "page": 2,
    "pageSize": 10,
    "total": 47,
    "totalPages": 5
  }
}
```

The maximum page size is:

```text
50
```

---

# Cart API

The cart is buyer-specific and server-backed.

Requires:

```text
BUYER
```

authorization.

## Get buyer cart

```http
GET /api/v1/cart
```

Returns the current cart, item details, subtotal, and any stock/availability notices.

Example response:

```json
{
  "data": {
    "id": "cart-id",
    "items": [
      {
        "product": {
          "id": "product-id",
          "name": "Vintage Denim"
        },
        "quantity": 2,
        "unitPrice": {
          "amount": "20000.00",
          "currency": "NGN"
        },
        "availability": "IN_STOCK"
      }
    ],
    "subtotal": {
      "amount": "40000.00",
      "currency": "NGN"
    },
    "notices": []
  }
}
```

> Cart totals are display-only. Final pricing is recalculated at checkout.

---

## Add or update cart item

```http
PUT /api/v1/cart/items/:productid
```

Request body:

```json
{
  "quantity": 2
}
```

Returns the updated cart after the item quantity is set.

---

## Remove cart item

```http
DELETE /api/v1/cart/items/:productid
```

Removes the product from the buyer's cart.

Successful response:

```http
204 No Content
```

---
