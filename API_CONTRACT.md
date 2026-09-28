# SUMASIFY Backend — API Contract (v1)

**Base URL:** `/api/v1`

This is v1 of the SUMASIFY backend API contract, aligned with:

* SUMASIFY MVP Technical Requirements Document v1.1 — approved baseline
* Current Prisma schema
* Manual bank-transfer payment architecture
* Multi-vendor parent-order/vendor-order-group model
* Vendor-managed delivery + optional pickup
* Email/password + Google Sign-In authentication
* Server-side authorization and ownership checks
* Zod request validation
* REST JSON API conventions

The backend is the source of truth for authentication, catalogue data, cart state, pricing, stock, orders, payments, vendor approval and administrative actions.

---

# 0. Contract Principles

| Principle             | Decision                                                               |
| --------------------- | ---------------------------------------------------------------------- |
| API versioning        | All MVP endpoints use `/api/v1`                                        |
| API style             | REST + JSON                                                            |
| Authentication        | Short-lived access JWT + rotated refresh session                       |
| Refresh token storage | HttpOnly, Secure, SameSite cookie in production                        |
| Authorization         | Enforced by backend; frontend route guards are not security boundaries |
| Validation            | Zod + database constraints                                             |
| Database              | PostgreSQL via Prisma                                                  |
| Money                 | Decimal strings in JSON, e.g. `"20000.00"`                             |
| Currency              | NGN for MVP                                                            |
| Pagination            | Maximum `pagesize` of 50                                               |
| Idempotency           | Required for checkout/payment state-changing operations                |
| Images                | Cloudinary; PostgreSQL stores URL/storage metadata only                |
| Payment               | Manual bank transfer for V1                                            |
| Delivery              | Vendor-managed delivery + optional pickup                              |
| Vendor settlement     | Manual after successful delivery/pickup                                |
| Notifications         | In-app notification records only                                       |
| Chat                  | Out of scope for V1                                                    |

The approved TRD specifies PostgreSQL as transactional truth, Prisma for data access, Zod for validation, Cloudinary for images, and a modular monolith rather than microservices.

---

# 1. Global API Conventions

## 1.1 API Naming & Case Convention

All API-facing identifiers and machine-readable values use lowercase for consistency with the frontend.

This applies to:

* JSON request and response field names.
* Query parameter names.
* Path parameter names.
* Endpoint path segments.
* Machine-readable enum/status values.
* Machine-readable error codes.

Examples:

```text
fullName                     → fullname
accountStatus                → accountstatus
accessToken                  → accesstoken
expiresIn                    → expiresin
pageSize                     → pagesize
requestId                    → requestid
productId                    → productid
agreedToTermsAndConditions   → agreedtotermsandconditions
agreedToPrivacyPolicy        → agreedtoprivacypolicy
BUYER                        → buyer
ACTIVE                       → active
VALIDATION_ERROR             → validation_error
```

HTTP methods remain uppercase:

```text
GET
POST
PATCH
DELETE
```

This convention applies to API identifiers and machine-readable values only.

User-generated values such as names, descriptions, passwords and free-text notes must not be forcibly lowercased.

---

## 1.2 Base Path

All API endpoints are versioned under:

```text
/api/v1
```

Example:

```http
GET /api/v1/products
```

---

## 1.2 Request Format

Standard requests use:

```http
Content-Type: application/json
```

Exceptions:

* Product image upload uses `multipart/form-data`.
* Authentication refresh uses the refresh-session cookie.

Authenticated requests use:

```http
Authorization: Bearer <access-token>
```

The frontend must not store long-lived refresh secrets in `localStorage`.

---

## 1.3 Success Envelope

Successful JSON responses use:

```json
{
  "data": {}
}
```

If metadata is required:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pagesize": 20,
    "total": 100,
    "totalpages": 5
  }
}
```

The approved TRD defines `{ data, meta }` as the canonical success envelope.

---

## 1.4 Error Envelope

All API errors should follow:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "fields": [
      {
        "field": "email",
        "message": "Invalid email"
      }
    ],
    "requestid": "req_123"
  }
}
```

`fields` is optional when the error is not field-specific.

Example:

```json
{
  "error": {
    "code": "forbidden",
    "message": "You do not have permission to access this resource.",
    "requestid": "req_123"
  }
}
```

---

## 1.5 Pagination

List endpoints use:

```text
?page=1&pagesize=20
```

Maximum:

```text
pagesize=50
```

Response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pagesize": 20,
    "total": 0,
    "totalpages": 0
  }
}
```

---

## 1.6 Monetary Values

Money is returned as a decimal string:

```json
{
  "amount": "20000.00",
  "currency": "NGN"
}
```

Never return monetary values as JavaScript floating-point numbers.

The TRD explicitly requires decimal strings in JSON to avoid floating-point ambiguity.

---

## 1.7 Idempotency

State-changing checkout/payment operations must accept:

```http
Idempotency-Key: <unique-client-generated-key>
```

The same key must return the original result instead of creating a duplicate transaction.

The payment schema contains a unique idempotency key, supporting this requirement.

---

# 2. Roles & Authorization

## 2.1 Roles

SUMASIFY has three API-level roles:

* `buyer`
* `vendor`
* `admin`

Vendor approval is represented separately from basic user registration.

An account registered through `/auth/register` starts as:

```text
role = buyer
```

Vendor access is granted only after an approved vendor application.

Admin accounts are provisioned through secure seed/invitation flows.

The frontend must never submit a role such as:

```json
{
  "role": "vendor"
}
```

to obtain vendor access.

---

## 2.2 Authorization Rules

| Resource            | Buyer               | Vendor          | Admin                          |
| ------------------- | ------------------- | --------------- | ------------------------------ |
| Public catalogue    | Read                | Read            | Read                           |
| Own cart            | Read/Write          | No              | No                             |
| Own orders          | Read                | No              | Admin access                   |
| Vendor application  | Own                 | Own             | Manage                         |
| Vendor profile      | No                  | Own             | Manage where authorised        |
| Vendor products     | Read public         | Own             | Manage                         |
| Vendor inventory    | No                  | Own             | Manage                         |
| Vendor order groups | No                  | Own             | Manage                         |
| Payments            | Submit own evidence | No verification | Verify                         |
| Categories          | Read                | Read            | Manage                         |
| Users               | Own profile         | Own profile     | Manage                         |
| Audit logs          | No                  | No              | Created for privileged actions |

The API must resolve the requested resource and compare its ownership to the authenticated principal.

Client-supplied user/vendor IDs are never treated as proof of permission.

---

# 3. Authentication

| Method | Endpoint                | Access         | Description                                       |
| ------ | ----------------------- | -------------- | ------------------------------------------------- |
| POST   | `/auth/register`        | Public         | Create buyer account                              |
| POST   | `/auth/login`           | Public         | Email/password login                              |
| POST   | `/auth/google`          | Public         | Google Sign-In                                    |
| POST   | `/auth/refresh`         | Refresh cookie | Rotate refresh session and issue new access token |
| POST   | `/auth/logout`          | Authenticated  | Revoke current refresh session                    |
| GET    | `/auth/me`              | Authenticated  | Return current authenticated user                 |
| POST   | `/auth/forgot-password` | Public         | Request password reset                            |
| POST   | `/auth/reset-password`  | Public         | Reset password with valid token                   |

---

## 3.1 POST `/auth/register`

Creates a new BUYER account.

### Request

```json
{
  "fullname": "Ada Obi",
  "email": "ada@example.com",
  "password": "StrongPassword123",
  "phone": "+2348012345678",
  "agreedtotermsandconditions": true,
  "agreedtoprivacypolicy": true
}
```

`phone` is optional.

`agreedtotermsandconditions` is required and must be `true`.

`agreedtoprivacypolicy` is required and must be `true`.

The backend must record the user's consent and the corresponding consent timestamp.

The client does not submit a role.

### Success

**201 Created**

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "fullname": "Ada Obi",
      "email": "ada@example.com",
      "role": "buyer",
      "accountstatus": "active"
    },
    "accesstoken": "...",
    "expiresin": 900
  }
}
```

### Errors

* `400` validation error
* `409` duplicate email
* `429` rate limited

---

## 3.2 POST `/auth/login`

### Request

```json
{
  "email": "ada@example.com",
  "password": "StrongPassword123"
}
```

### Success

**200 OK**

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "fullname": "Ada Obi",
      "email": "ada@example.com",
      "role": "buyer",
      "accountstatus": "active"
    },
    "accesstoken": "...",
    "expiresin": 900
  }
}
```

### Errors

* `401` invalid credentials
* `403` suspended/deactivated account
* `429` rate limited

---

## 3.3 POST `/auth/google`

Authenticates a user using a Google identity credential/ID token.

Google identity must be validated server-side.

### Request

```json
{
  "credential": "google-id-token"
}
```

### Success

Same authentication envelope as email/password login.

### Errors

* `400` invalid request
* `401` invalid/unverified Google identity
* `429` rate limited

Google authentication does not bypass vendor approval.

---

## 3.4 POST `/auth/refresh`

Uses the refresh-session cookie.

### Success

**200 OK**

```json
{
  "data": {
    "accesstoken": "...",
    "expiresin": 900
  }
}
```

The previous refresh session is revoked/rotated.

---

## 3.5 POST `/auth/logout`

Revokes the current refresh session.

### Success

**204 No Content**

---

## 3.6 GET `/auth/me`

Returns the current authenticated user.

### Buyer Response

```json
{
  "data": {
    "id": "uuid",
    "fullname": "Ada Obi",
    "email": "ada@example.com",
    "role": "buyer",
    "accountstatus": "active",
    "vendor": null
  }
}
```

### Approved Vendor Response

```json
{
  "data": {
    "id": "uuid",
    "fullname": "Ada Obi",
    "email": "ada@example.com",
    "role": "vendor",
    "accountstatus": "active",
    "vendor": {
      "id": "uuid",
      "businessname": "Ada's Store",
      "status": "active"
    }
  }
}
```

---

## 3.7 POST `/auth/forgot-password`

### Request

```json
{
  "email": "ada@example.com"
}
```

### Success

**202 Accepted**

The endpoint should return the same public response regardless of whether the email exists to avoid account enumeration.

Password-reset email is currently a supporting/deferred feature because the approved V1 notification architecture does not require an external email provider.

---

## 3.8 POST `/auth/reset-password`

### Request

```json
{
  "token": "reset-token",
  "newpassword": "NewStrongPassword123"
}
```

### Success

**204 No Content**

### Errors

* `400` invalid token
* `400` expired token
* `400` invalid password

---

# 4. Categories

| Method | Endpoint                               | Access | Description                  |
| ------ | -------------------------------------- | ------ | ---------------------------- |
| GET    | `/categories`                          | Public | List active categories       |
| POST   | `/admin/categories`                    | Admin  | Create category              |
| PATCH  | `/admin/categories/:categoryid`        | Admin  | Update category              |
| PATCH  | `/admin/categories/:categoryid/status` | Admin  | Activate/deactivate category |

Categories are database-managed rather than hardcoded into the frontend.

The approved launch category direction is:

* Fashion
* Electronics/Gadgets
* Beauty
* Accessories
* Books/Textbooks
* Services
* Other

Food is currently excluded from the approved V1 scope because perishables/food were excluded in the founder-approved baseline.

Therefore, the seed should be treated as requiring alignment with the latest approved category decision before final production use.

---

## 4.1 GET `/categories`

### Query

```text
?active=true
```

### Success

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Fashion",
      "slug": "fashion",
      "sortorder": 0
    },
    {
      "id": "uuid",
      "name": "Electronics/Gadgets",
      "slug": "electronics-gadgets",
      "sortorder": 1
    }
  ]
}
```

Only active categories are returned by default.

---

# 5. Public Catalogue

| Method | Endpoint               | Access | Description                          |
| ------ | ---------------------- | ------ | ------------------------------------ |
| GET    | `/products`            | Public | Browse/search/filter active products |
| GET    | `/products/:productid` | Public | View active product detail           |

---

## 5.1 GET `/products`

### Query Parameters

```text
q
category
vendor
minPrice
maxPrice
inStock
sort
page
pagesize
```

Allowed `sort` values:

```text
newest
price_asc
price_desc
```

### Example

```http
GET /api/v1/products?q=denim&category=fashion&inStock=true&sort=price_asc&page=1&pagesize=20
```

### Success

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Vintage Denim",
      "description": "...",
      "price": {
        "amount": "20000.00",
        "currency": "NGN"
      },
      "category": {
        "id": "uuid",
        "name": "Fashion",
        "slug": "fashion"
      },
      "availability": "IN_STOCK",
      "stockQuantity": 4,
      "images": [
        {
          "url": "https://...",
          "alt": "Vintage Denim",
          "position": 1
        }
      ],
      "vendor": {
        "id": "uuid",
        "businessname": "Kemi's Store",
        "slug": "kemis-store"
      }
    }
  ],
  "meta": {
    "page": 1,
    "pagesize": 20,
    "total": 1,
    "totalpages": 1
  }
}
```

This follows the canonical product DTO defined in the approved TRD.

---

## 5.2 GET `/products/:productid`

Returns one active public product.

### Success

**200 OK**

Returns the canonical product DTO.

### Errors

* `404` product not found
* `404` product inactive/not publicly available

---

# 6. Cart

| Method | Endpoint                 | Access | Description                 |
| ------ | ------------------------ | ------ | --------------------------- |
| GET    | `/cart`                  | Buyer  | Get current cart            |
| PUT    | `/cart/items/:productid` | Buyer  | Add/update product quantity |
| DELETE | `/cart/items/:productid` | Buyer  | Remove product              |

The cart is server-backed and belongs to one buyer.

The cart does not reserve stock.

---

## 6.1 GET `/cart`

### Success

```json
{
  "data": {
    "id": "uuid",
    "items": [
      {
        "product": {
          "id": "uuid",
          "name": "Vintage Denim"
        },
        "quantity": 2,
        "unitprice": {
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

Cart totals are display-only.

The backend recalculates price, stock, delivery and commission during checkout.

---

## 6.2 PUT `/cart/items/:productid`

### Request

```json
{
  "quantity": 2
}
```

### Success

**200 OK**

Returns the updated cart.

### Errors

* `400` invalid quantity
* `404` product not found
* `409` inactive/out-of-stock product

---

## 6.3 DELETE `/cart/items/:productid`

### Success

**204 No Content**

---

# 7. Checkout

| Method | Endpoint            | Access | Description                                                        |
| ------ | ------------------- | ------ | ------------------------------------------------------------------ |
| POST   | `/checkout/preview` | Buyer  | Calculate server-authoritative checkout                            |
| POST   | `/checkout/orders`  | Buyer  | Create parent order, vendor groups, payment and stock reservations |

---

## 8. POST `/checkout/preview`

The preview endpoint calculates the checkout using current database values.

### Request

```json
{
  "addressid": "uuid",
  "deliverypreferences": {
    "vendor-uuid": {
      "method": "DELIVERY"
    }
  }
}
```

### Response

```json
{
  "data": {
    "currency": "NGN",
    "subtotalamount": "40000.00",
    "deliveryamount": "3000.00",
    "totalamount": "43000.00",
    "vendorgroups": [
      {
        "vendor": {
          "id": "uuid",
          "businessname": "Kemi's Store"
        },
        "items": [
          {
            "productid": "uuid",
            "name": "Vintage Denim",
            "quantity": 2,
            "unitpriceamount": "20000.00",
            "linetotalamount": "40000.00"
          }
        ],
        "subtotalamount": "40000.00",
        "deliveryamount": "3000.00",
        "deliverymethod": "DELIVERY"
      }
    ],
    "warnings": []
  }
}
```

The server must never trust client-supplied totals.

### Errors

* `400` invalid address/delivery preference
* `409` stock changed
* `409` product unavailable

---

# 9. POST `/checkout/orders`

Creates the actual transaction.

### Required Header

```http
Idempotency-Key: unique-key
```

### Request

```json
{
  "addressid": "uuid",
  "deliverypreferences": {
    "vendor-uuid": {
      "method": "DELIVERY"
    }
  },
  "paymentmethod": "BANK_TRANSFER"
}
```

### Transaction Boundary

The operation must execute as one database transaction:

```text
Recheck stock
    ↓
Create parent Order
    ↓
Create VendorOrderGroups
    ↓
Create OrderItems
    ↓
Create Payment
    ↓
Create StockReservations
    ↓
Commit
```

This is required to reduce overselling and preserve transaction consistency.

### Success

**201 Created**

```json
{
  "data": {
    "order": {
      "id": "uuid",
      "ordernumber": "SUM-20260915-0001",
      "status": "AWAITING_PAYMENT",
      "paymentstatus": "AWAITING_SUBMISSION",
      "subtotalamount": "40000.00",
      "deliveryamount": "3000.00",
      "totalamount": "43000.00",
      "vendorgroups": []
    },
    "payment": {
      "id": "uuid",
      "method": "BANK_TRANSFER",
      "status": "AWAITING_SUBMISSION",
      "amount": "43000.00"
    },
    "paymentinstructions": {
      "bankname": "...",
      "accountname": "...",
      "accountnumber": "...",
      "reference": "SUM-20260915-0001"
    }
  }
}
```

### Errors

* `400` invalid payment method
* `400` invalid delivery configuration
* `409` stock conflict
* `409` idempotency conflict
* `409` unavailable product

Vendor bank accounts are not exposed as part of the MVP payment flow.

Payments go to a platform-controlled account.

---

# 10. Buyer Orders

| Method | Endpoint           | Access      | Description     |
| ------ | ------------------ | ----------- | --------------- |
| GET    | `/orders`          | Buyer       | List own orders |
| GET    | `/orders/:orderid` | Buyer/Admin | View order      |

---

## 10.1 GET `/orders`

### Query

```text
?page=1&pagesize=20&status=PAID
```

Returns paginated buyer-owned parent orders.

A buyer must never see another buyer's orders.

---

## 10.2 GET `/orders/:orderid`

Returns:

* parent order
* vendor order groups
* order items
* payment status
* delivery snapshot
* relevant fulfilment state

### Example

```json
{
  "data": {
    "id": "uuid",
    "ordernumber": "SUM-20260915-0001",
    "status": "IN_FULFILMENT",
    "paymentstatus": "VERIFIED",
    "subtotalamount": "40000.00",
    "deliveryamount": "3000.00",
    "totalamount": "43000.00",
    "vendorgroups": [
      {
        "id": "uuid",
        "vendor": {
          "id": "uuid",
          "businessname": "Kemi's Store"
        },
        "fulfilmentstatus": "OUT_FOR_DELIVERY",
        "deliverymethod": "DELIVERY",
        "items": []
      }
    ]
  }
}
```

### Errors

* `403` authenticated but does not own the order
* `404` order not found

---

# 11. Payment Submission

| Method | Endpoint                                  | Access | Description                                  |
| ------ | ----------------------------------------- | ------ | -------------------------------------------- |
| POST   | `/orders/:orderid/payments/bank-transfer` | Buyer  | Submit transfer reference and optional proof |

---

## 11.1 POST `/orders/:orderid/payments/bank-transfer`

### Header

```http
Idempotency-Key: unique-key
```

The endpoint accepts the bank transfer reference and optional payment proof.

### Request

```json
{
  "bankreference": "TRF-123456789"
}
```

If payment proof is implemented through the API, the image is handled using the approved private storage flow.

### Success

```json
{
  "data": {
    "payment": {
      "id": "uuid",
      "status": "SUBMITTED",
      "amount": "43000.00",
      "bankreference": "TRF-123456789",
      "submittedat": "2026-09-15T10:00:00Z"
    },
    "order": {
      "id": "uuid",
      "ordernumber": "SUM-20260915-0001",
      "status": "PAYMENT_REVIEW",
      "paymentstatus": "SUBMITTED"
    }
  }
}
```

### Errors

* `400` invalid request
* `404` order not found
* `409` invalid order/payment state
* `409` duplicate bank reference
* `429` rate limited

Payment proof is private and must not be publicly exposed.

---

# 12. Vendor Applications

| Method | Endpoint                  | Access | Description               |
| ------ | ------------------------- | ------ | ------------------------- |
| POST   | `/vendor-applications`    | Buyer  | Submit vendor application |
| GET    | `/vendor-applications/me` | Buyer  | View own application      |

A buyer becomes a vendor only after approval.

---

## 12.1 POST `/vendor-applications`

### Request

```json
{
  "businessname": "Kemi's Store",
  "contactphone": "+2348012345678",
  "description": "Fashion and accessories store",
  "categorynotes": "Fashion"
}
```

### Success

**201 Created**

```json
{
  "data": {
    "id": "uuid",
    "businessname": "Kemi's Store",
    "contactphone": "+2348012345678",
    "description": "Fashion and accessories store",
    "categorynotes": "Fashion",
    "status": "pending",
    "createdat": "2026-09-15T10:00:00Z"
  }
}
```

### Errors

* `400` validation error
* `409` pending application already exists

The approved V1 vendor verification scope requires business name, contact phone and description; identity-document upload is not required.

---

## 12.2 GET `/vendor-applications/me`

Returns the authenticated buyer's latest application.

### Success

```json
{
  "data": {
    "id": "uuid",
    "status": "pending",
    "businessname": "Kemi's Store",
    "contactphone": "+2348012345678",
    "description": "...",
    "rejectionreason": null
  }
}
```

---

# 13. Vendor Profile

| Method | Endpoint          | Access          | Description               |
| ------ | ----------------- | --------------- | ------------------------- |
| GET    | `/vendor/profile` | Approved Vendor | Get own vendor profile    |
| PATCH  | `/vendor/profile` | Approved Vendor | Update own vendor profile |

---

## 13.1 GET `/vendor/profile`

Returns the authenticated vendor's profile.

---

## 13.2 PATCH `/vendor/profile`

### Request

```json
{
  "businessname": "Kemi's Store",
  "contactphone": "+2348012345678",
  "pickupaddress": "Nsukka",
  "deliverynotes": "Delivery available around campus"
}
```

Only permitted vendor-owned fields may be changed.

Vendor ID, approval state and user ownership are not client-controlled.

---

# 14. Vendor Products

| Method | Endpoint                      | Access                | Description        |
| ------ | ----------------------------- | --------------------- | ------------------ |
| GET    | `/vendor/products`            | Approved Vendor       | List own products  |
| POST   | `/vendor/products`            | Approved Vendor       | Create own product |
| PATCH  | `/vendor/products/:productid` | Approved Vendor owner | Update own product |

Only approved, active vendors may create or activate products.

---

## 14.1 GET `/vendor/products`

### Query

```text
?page=1&pagesize=20&status=active
```

Returns only the authenticated vendor's products.

---

## 14.2 POST `/vendor/products`

### Request

```json
{
  "name": "Vintage Denim",
  "description": "Classic denim jacket",
  "priceamount": "20000.00",
  "categoryid": "uuid",
  "stockonhand": 10,
  "imageids": [
    "upload-uuid"
  ]
}
```

The backend determines:

* vendor ID
* product status
* availability
* published timestamp
* stock validity

The client cannot assign another vendor's ID.

### Success

**201 Created**

Returns the created product.

### Errors

* `400` validation error
* `403` vendor not approved/active
* `404` category/upload not found
* `409` image/product constraint conflict

---

## 14.3 PATCH `/vendor/products/:productid`

### Request

```json
{
  "name": "Vintage Denim Jacket",
  "description": "Updated description",
  "priceamount": "22000.00",
  "categoryid": "uuid"
}
```

### Errors

* `403` product belongs to another vendor
* `404` product not found
* `400` invalid update

---

# 15. Vendor Inventory

| Method | Endpoint                                | Access                | Description             |
| ------ | --------------------------------------- | --------------------- | ----------------------- |
| PATCH  | `/vendor/products/:productid/inventory` | Approved Vendor owner | Update safe stock value |

---

## 15.1 PATCH `/vendor/products/:productid/inventory`

### Request

```json
{
  "stockonhand": 25
}
```

The backend must ensure:

```text
stockOnHand >= 0
stockReserved >= 0
stockReserved <= stockOnHand
```

Inventory changes must not silently invalidate active reservations.

### Success

```json
{
  "data": {
    "productid": "uuid",
    "stockonhand": 25,
    "stockreserved": 3,
    "availablestock": 22
  }
}
```

### Errors

* `403` not product owner
* `404` product not found
* `409` requested stock is below reserved stock

---

# 16. Product Images

| Method | Endpoint                  | Access          | Description          |
| ------ | ------------------------- | --------------- | -------------------- |
| POST   | `/uploads/product-images` | Approved Vendor | Upload product image |

The TRD defines a two-step image flow:

1. Authorised upload.
2. Product create/update referencing verified upload IDs.

---

## 16.1 POST `/uploads/product-images`

### Content Type

```http
multipart/form-data
```

### Supported Formats

* JPEG
* PNG
* WebP

### Limits

* Maximum 5 MB per image
* Maximum 5 images per product

### Success

```json
{
  "data": {
    "uploadid": "uuid",
    "url": "https://...",
    "storagekey": "...",
    "contenttype": "image/jpeg",
    "width": 1200,
    "height": 1200,
    "bytes": 240000
  }
}
```

The binary image itself is not stored in PostgreSQL.

---

# 17. Vendor Orders

| Method | Endpoint                         | Access                | Description                        |
| ------ | -------------------------------- | --------------------- | ---------------------------------- |
| GET    | `/vendor/orders`                 | Approved Vendor       | List own vendor order groups       |
| GET    | `/vendor/orders/:groupid`        | Approved Vendor owner | View own vendor order group        |
| PATCH  | `/vendor/orders/:groupid/status` | Approved Vendor owner | Update permitted fulfilment status |

---

## 17.1 GET `/vendor/orders`

### Query

```text
?page=1&pagesize=20&status=NEW
```

The vendor receives only groups belonging to that vendor.

---

## 17.2 GET `/vendor/orders/:groupid`

Returns:

* vendor order group
* buyer delivery snapshot necessary for fulfilment
* items
* quantities
* fulfilment status
* delivery method
* vendor notes

Vendor cannot access another vendor's group.

---

## 17.3 PATCH `/vendor/orders/:groupid/status`

### Request

```json
{
  "status": "READY",
  "vendornotes": "Order packed and ready for pickup."
}
```

Allowed transitions follow the approved MVP lifecycle:

```text
PENDING_PAYMENT
      ↓
NEW
      ↓
CONFIRMED
      ↓
READY
      ↓
OUT_FOR_DELIVERY
      ↓
DELIVERED
      ↓
COMPLETED
```

The backend rejects invalid transitions.

A vendor cannot:

* mark payment as verified
* modify payment records
* settle themselves
* access another vendor's order group

Fulfilment starts only after SUMASIFY verifies payment.

---

# 18. Admin Dashboard

| Method | Endpoint           | Access | Description           |
| ------ | ------------------ | ------ | --------------------- |
| GET    | `/admin/dashboard` | Admin  | Operational dashboard |

### Success

```json
{
  "data": {
    "vendorapplications": {
      "pending": 12
    },
    "products": {
      "active": 120,
      "pendingmoderation": 4
    },
    "orders": {
      "pendingpaymentreview": 5,
      "infulfilment": 12,
      "completed": 80
    },
    "payments": {
      "submitted": 5
    }
  }
}
```

This is operational reporting, not advanced analytics.

---

# 19. Admin Vendor Applications

| Method | Endpoint                         | Access | Description                |
| ------ | -------------------------------- | ------ | -------------------------- |
| GET    | `/admin/vendor-applications`     | Admin  | List applications          |
| PATCH  | `/admin/vendor-applications/:id` | Admin  | Approve/reject application |

---

## 19.1 GET `/admin/vendor-applications`

### Query

```text
?status=pending&page=1&pagesize=20
```

Returns paginated applications.

---

## 19.2 PATCH `/admin/vendor-applications/:id`

### Approve

```json
{
  "decision": "approved"
}
```

### Reject

```json
{
  "decision": "rejected",
  "rejectionreason": "Insufficient business information."
}
```

### Approval

Approval creates/activates the corresponding vendor record.

### Required Audit

Every approval/rejection creates an `AdminAuditLog`.

### Errors

* `400` invalid decision
* `404` application not found
* `409` invalid application state

---

# 20. Admin Categories

| Method | Endpoint                               | Access | Description                  |
| ------ | -------------------------------------- | ------ | ---------------------------- |
| POST   | `/admin/categories`                    | Admin  | Create category              |
| PATCH  | `/admin/categories/:categoryid`        | Admin  | Update category              |
| PATCH  | `/admin/categories/:categoryid/status` | Admin  | Activate/deactivate category |

Category deletion should not be used casually because products reference categories.

Prefer:

```text
isactive = false
```

for categories that should no longer be available to vendors.

---

# 21. Admin Products

| Method | Endpoint                     | Access | Description             |
| ------ | ---------------------------- | ------ | ----------------------- |
| GET    | `/admin/products`            | Admin  | List/filter products    |
| GET    | `/admin/products/:productid` | Admin  | View product            |
| PATCH  | `/admin/products/:productid` | Admin  | Moderate/update product |

Admin actions that affect marketplace visibility or moderation must create audit records in `AdminAuditLog`.

---

# 22. Admin Users

| Method | Endpoint               | Access | Description                    |
| ------ | ---------------------- | ------ | ------------------------------ |
| GET    | `/admin/users`         | Admin  | List/filter users              |
| GET    | `/admin/users/:userid` | Admin  | View user                      |
| PATCH  | `/admin/users/:userid` | Admin  | Update permitted account state |

Admin cannot arbitrarily change a user's role through a normal user-update endpoint.

Account status values:

```text
active
suspended
deactivated
```

An admin must not deactivate themselves or violate the platform's minimum-admin safety rule.

---

# 23. Admin Orders

| Method | Endpoint        | Access | Description            |
| ------ | --------------- | ------ | ---------------------- |
| GET    | `/admin/orders` | Admin  | List/filter all orders |

### Query

```text
?page=1&pagesize=20&status=PAYMENT_REVIEW&paymentstatus=SUBMITTED
```

Admin can view:

* parent orders
* vendor order groups
* order items
* payment status
* fulfilment status

---

# 24. Admin Payment Verification

| Method | Endpoint                     | Access | Description           |
| ------ | ---------------------------- | ------ | --------------------- |
| PATCH  | `/admin/payments/:paymentid` | Admin  | Verify/reject payment |

---

## 24.1 Request

### Approve

```json
{
  "decision": "VERIFIED"
}
```

### Reject

```json
{
  "decision": "rejected",
  "rejectionreason": "Transfer could not be reconciled."
}
```

---

## Verification Effects

When verified:

```text
Payment → VERIFIED
Order → PAID
Relevant VendorOrderGroups → NEW
```

The exact aggregate order transition must be calculated by the order service.

Vendor settlement is not triggered by payment verification.

---

## Rejection Effects

When rejected:

```text
Payment → rejected
Order → PAYMENT_REJECTED
Reserved stock → released
```

---

## Required Audit

Payment verification/rejection must create an `AdminAuditLog`.

The approved TRD explicitly requires payment verification to be performed by authorised SUMASIFY operations/admin users and to be auditable.

---

# 25. Vendor Settlement

## 25.1 Settlement Architecture

SUMASIFY V1 uses a manual vendor settlement model.

Settlement state is stored directly on the `VendorOrderGroup` model.

A dedicated `Settlement` database model is not required for V1.

The `VendorOrderGroup` is therefore the source of truth for the settlement state of each vendor's portion of a parent order.

Relevant fields:

```text
settlementStatus
settledAt
settledAmount
```

The settlement lifecycle is:

```text
PENDING
    ↓
ELIGIBLE_AFTER_DELIVERY
    ↓
SETTLED
```

Settlement is separate from payment verification.

* Payment verification confirms that the buyer has paid SUMASIFY.
* Vendor settlement records that SUMASIFY has manually paid the vendor.

Vendor settlement must not be triggered automatically when a buyer payment is verified.

---

## 25.2 Settlement Eligibility

A `VendorOrderGroup` begins with:

```text
settlementStatus = PENDING
```

After the vendor order has been successfully delivered or picked up by the buyer, the vendor order becomes eligible for settlement:

```text
settlementStatus = ELIGIBLE_AFTER_DELIVERY
```

The backend must enforce settlement eligibility server-side.

A vendor order must not be marked `SETTLED` unless its order/delivery state satisfies the V1 settlement eligibility rules.

For V1, settlement eligibility is based on successful fulfilment of the vendor order group:

```text
VendorOrderGroup.status = DELIVERED
```

OR:

```text
VendorOrderGroup.status = COMPLETED
```

The exact transition to `ELIGIBLE_AFTER_DELIVERY` should be performed by the backend when the relevant fulfilment condition is reached.

Clients must not be allowed to directly modify `settlementStatus`.

---

## 25.3 Admin Settlement Endpoint

```http
PATCH /admin/vendor-orders/:groupid/settlement
```

Marks an eligible vendor order group as settled after manual payment to the vendor.

### Authorization

* `ADMIN`
* `SUPER_ADMIN`

The endpoint requires authentication and server-side admin authorization.

### Request

```json
{
  "status": "SETTLED"
}
```

The client does not supply the authoritative settlement amount.

The backend must calculate or retrieve the amount payable to the vendor from the existing order and financial data.

This prevents an administrator or client from arbitrarily changing the settlement amount through the API.

### Headers

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Request Parameters

| Parameter | Type   | Required | Description                                |
| --------- | ------ | -------- | ------------------------------------------ |
| `groupid` | string | Yes      | ID of the `VendorOrderGroup` being settled |

### Request Body

| Field    | Type        | Required | Description                                                      |
| -------- | ----------- | -------- | ---------------------------------------------------------------- |
| `status` | `"SETTLED"` | Yes      | Confirms that the admin is recording the vendor order as settled |

---

## 25.4 Settlement Processing Rules

When processing the settlement request, the backend must:

1. Authenticate the requesting user.
2. Verify that the user has admin authorization.
3. Retrieve the specified `VendorOrderGroup`.
4. Verify that the vendor order group exists.
5. Verify that the order is eligible for settlement.
6. Verify that the vendor order group has not already been settled.
7. Determine the authoritative vendor settlement amount from the existing order/financial records.
8. Update the `VendorOrderGroup` settlement fields.
9. Record the settlement timestamp.
10. Create an `AdminAuditLog` entry for the settlement action.
11. Return the updated vendor order group.

The settlement operation should be performed transactionally so that the settlement update and required audit record do not become inconsistent.

---

## 25.5 Settlement State Updates

When settlement is successfully recorded:

```text
settlementStatus = SETTLED
settledAmount = <authoritative vendor amount>
settledAt = <current timestamp>
```

Example database state:

```text
VendorOrderGroup
    settlementStatus: SETTLED
    settledAmount: 18500.00
    settledAt: 2026-09-16T18:30:00.000Z
```

`settledAmount` must be stored using the database's decimal type and returned by the API as a decimal string.

Example:

```json
{
  "settledAmount": "18500.00"
}
```

---

## 25.6 Successful Response

**HTTP 200 OK**

```json
{
  "data": {
    "id": "cmgxyz123",
    "settlementStatus": "SETTLED",
    "settledAmount": "18500.00",
    "settledAt": "2026-09-16T18:30:00.000Z"
  }
}
```

---

## 25.7 Error Cases

### Vendor Order Group Not Found

**HTTP 404**

```json
{
  "error": {
    "code": "VENDOR_ORDER_NOT_FOUND",
    "message": "Vendor order group not found.",
    "requestId": "..."
  }
}
```

### Vendor Order Not Eligible

**HTTP 409**

```json
{
  "error": {
    "code": "VENDOR_ORDER_NOT_ELIGIBLE_FOR_SETTLEMENT",
    "message": "Vendor order group is not eligible for settlement.",
    "requestId": "..."
  }
}
```

This applies when the vendor order has not reached the required delivery/fulfilment state.

### Already Settled

**HTTP 409**

```json
{
  "error": {
    "code": "VENDOR_ORDER_ALREADY_SETTLED",
    "message": "Vendor order group has already been settled.",
    "requestId": "..."
  }
}
```

### Unauthorized

**HTTP 401**

Returned when the request does not contain a valid access token.

### Forbidden

**HTTP 403**

Returned when the authenticated user does not have the required admin authorization.

---

## 25.8 Settlement and Payment Verification Separation

Buyer payment verification and vendor settlement are separate operations.

### Payment Verification

```text
Buyer submits payment
        ↓
Payment = SUBMITTED
        ↓
Admin verifies payment
        ↓
Payment = VERIFIED
        ↓
Order = PAID
        ↓
VendorOrderGroup = NEW
```

### Vendor Settlement

```text
Vendor fulfils order
        ↓
VendorOrderGroup = DELIVERED / COMPLETED
        ↓
Settlement = ELIGIBLE_AFTER_DELIVERY
        ↓
Admin manually pays vendor
        ↓
Settlement = SETTLED
```

Payment verification must not automatically mark a vendor order as settled.

Settlement must not modify the buyer's payment verification state.

---

## 25.9 Settlement Amount

The settlement amount is authoritative backend data.

The client must not be permitted to determine or override:

* vendor settlement amount
* vendor commission
* platform commission
* order subtotal
* order total

Where the vendor's payable amount is derived from the order's financial records, the backend must calculate or retrieve that amount during settlement processing.

For example:

```text
Vendor Order Total
        ↓
Less applicable SUMASIFY commission
        ↓
Vendor Settlement Amount
```

The exact commission calculation must follow the financial rules approved for the SUMASIFY MVP.

If the current financial model does not yet contain sufficient information to calculate the vendor settlement amount reliably, settlement implementation must not invent a calculation.

The financial rule must first be defined and reflected in the relevant order/commission fields.

---

## 25.10 Audit Requirements

Every successful manual vendor settlement must create an `AdminAuditLog`.

The audit record should identify:

* Admin user who performed the settlement
* Vendor order group ID
* Settlement action
* Previous settlement status
* New settlement status
* Settlement amount, where supported by the audit model
* Timestamp
* Request/correlation ID where available

Example:

```json
{
  "action": "VENDOR_ORDER_SETTLED",
  "entityType": "VendorOrderGroup",
  "entityId": "cmgxyz123"
}
```

Settlement actions must not be silently performed without an audit record.

---

## 25.11 Idempotency and Duplicate Settlement Protection

The settlement endpoint must prevent duplicate settlement.

If a `VendorOrderGroup` is already:

```text
settlementStatus = SETTLED
```

a subsequent settlement request must not create another settlement or overwrite the existing settlement timestamp/amount.

The API should return:

```text
409 VENDOR_ORDER_ALREADY_SETTLED
```

For additional protection against concurrent administrative requests, the service should perform the eligibility check and settlement update within a database transaction.

---

## 25.12 V1 Scope

The V1 settlement model intentionally remains simple.

### Included

* Manual vendor settlement
* Settlement state on `VendorOrderGroup`
* Settlement amount
* Settlement timestamp
* Admin authorization
* Server-side eligibility checks
* Audit logging
* Transactional update
* Duplicate settlement protection

### Not Included in V1

* Dedicated `Settlement` model
* Automated vendor payouts
* Automated bank transfers
* Settlement batches
* Settlement retry workflows
* Multiple settlement attempts
* Payout provider integration
* Automated reconciliation
* Vendor withdrawal requests
* Complex settlement history

A dedicated settlement model may be introduced in a future version if SUMASIFY requires richer payout history, multiple settlement attempts, payout references, failed payouts, reconciliation, or automated vendor payments.

---

## 25.13 Settlement Endpoint Catalogue

| Method | Endpoint                                   | Authorization       | Purpose                                                     |
| ------ | ------------------------------------------ | ------------------- | ----------------------------------------------------------- |
| PATCH  | `/admin/vendor-orders/:groupid/settlement` | ADMIN / SUPER_ADMIN | Record manual settlement for an eligible vendor order group |

No separate settlement entity or settlement CRUD API is required for V1.

---

# 26. Notifications

The current schema supports in-app notifications.

| Method | Endpoint                  | Access              | Description               |
| ------ | ------------------------- | ------------------- | ------------------------- |
| GET    | `/notifications`          | Authenticated       | List own notifications    |
| PATCH  | `/notifications/:id/read` | Authenticated owner | Mark notification as read |

External email/SMS notification delivery is not part of the V1 core path.

The approved TRD specifies in-app notification records only for V1.

---

# 27. Health Check

| Method | Endpoint  | Access | Description      |
| ------ | --------- | ------ | ---------------- |
| GET    | `/health` | Public | API health check |

### Success

```json
{
  "data": {
    "status": "ok"
  }
}
```

The deployed API is expected to expose a health endpoint.

---

# 27. Vendor Payout Calculation

For V1, `VendorOrderGroup.payoutAmount` is the authoritative amount payable to the vendor.

The backend calculates and stores the payout amount when the vendor order group is created during checkout.

The V1 calculation is:

```text
payoutAmount = subtotalAmount - commissionAmount
```

Where:

* `subtotalAmount` is the sum of the applicable order item amounts for the vendor.
* `commissionAmount` is the SUMASIFY commission calculated according to the approved `commissionrule`.
* `payoutAmount` is the resulting amount owed to the vendor.

`deliveryAmount` is tracked separately and does not form part of the vendor payout unless the approved SUMASIFY financial rules explicitly specify otherwise.

### Example

```text
subtotalAmount = 20000.00
commissionAmount = 2000.00
deliveryAmount = 500.00
payoutAmount = 18000.00
```

The parent order total may therefore include delivery charges while the vendor payout remains based on the vendor's product subtotal less the applicable SUMASIFY commission.

---

## Financial Authority

All authoritative financial calculations must be performed server-side.

The client must not be permitted to supply or override:

```text
subtotalAmount
commissionAmount
payoutAmount
```

The backend must obtain the applicable product prices and commission rules and calculate these values during checkout.

The calculated values must be persisted on `VendorOrderGroup` as a financial snapshot of the transaction.

---

## Settlement

Vendor settlement uses the previously stored `payoutAmount`.

The settlement service must not recalculate the vendor payout from current product prices or current catalogue data.

When an eligible vendor order group is manually settled:

```text
settledAmount = payoutAmount
```

The resulting settlement state is:

```text
settlementStatus = SETTLED
settledAmount = payoutAmount
settledAt = current timestamp
```

This ensures that changes to product prices, commission configuration, or catalogue data after checkout do not alter the amount owed for an existing order.

---

# 28. Status Transition Rules

## 28.1 Vendor Application

```text
pending
   ↓
approved
```

Alternative states:

```text
rejected
withdrawn
```

Approval creates/activates a vendor profile.

---

## 28.2 Payment

```text
AWAITING_SUBMISSION
        ↓
SUBMITTED
        ↓
VERIFIED
```

Alternative:

```text
rejected
```

Expiry/cancellation may occur before verification where applicable.

Only authorised admin/operations users may verify or reject payment.

---

## 28.3 Parent Order

```text
AWAITING_PAYMENT
        ↓
PAYMENT_REVIEW
        ↓
PAID
        ↓
IN_FULFILMENT
        ↓
COMPLETED
```

Alternative terminal/error states:

```text
PAYMENT_REJECTED
CANCELLED
EXPIRED
```

The parent order state is derived from payment and relevant vendor-group states rather than blindly accepting client-supplied status.

---

## 28.4 Vendor Order Group

```text
PENDING_PAYMENT
        ↓
NEW
        ↓
CONFIRMED
        ↓
READY
        ↓
OUT_FOR_DELIVERY
        ↓
DELIVERED
        ↓
COMPLETED
```

Invalid transitions must return a controlled error.

---

# 29. Checkout & Stock Concurrency

Checkout is one of the highest-risk parts of the API.

The backend must:

1. Load the buyer's cart.
2. Validate product availability.
3. Recalculate prices.
4. Calculate delivery per vendor group.
5. Calculate commission server-side.
6. Recheck stock.
7. Reserve stock.
8. Create the parent order.
9. Create vendor order groups.
10. Create order items with snapshots.
11. Create the pending payment.
12. Commit the transaction.

The client must never supply the following as authoritative values:

```text
vendorid
commissionAmount
payoutAmount
unit price
subtotal
total
stock availability
```

The approved TRD explicitly requires server recalculation and transactional checkout/stock reservation.

---

# 30. Multi-Vendor Order Model

One buyer cart can contain products from multiple vendors.

Example:

```text
Buyer Cart
│
├── Vendor A
│   ├── Product 1
│   └── Product 2
│
└── Vendor B
    └── Product 3
```

Checkout produces:

```text
Parent Order
│
├── VendorOrderGroup A
│   ├── OrderItem 1
│   └── OrderItem 2
│
└── VendorOrderGroup B
    └── OrderItem 3
```

The buyer sees one overall order.

Each vendor sees only its own vendor order group.

The TRD explicitly establishes this one-parent-order/vendor-group architecture.

---

# 31. Delivery Rules

MVP delivery is:

```text
Vendor-managed delivery
+
Optional pickup
```

Delivery is calculated per vendor group where applicable.

Example:

```text
Parent Order
│
├── Vendor A
│   └── Delivery: ₦2,000
│
└── Vendor B
    └── Pickup: ₦0
```

SUMASIFY does not operate its own logistics network in V1.

Platform-managed logistics is reserved for post-MVP evaluation.

---

# 32. Image Rules

Allowed formats:

* JPEG
* PNG
* WebP

Maximum:

```text
5 MB per image
5 images per product
```

The API must validate:

* MIME type
* file signature/magic bytes
* file size
* ownership
* maximum image count
* image position

Images are stored externally.

PostgreSQL stores:

```text
storagekey
url
altText
position
width
height
bytes
```

---

# 33. Rate Limiting

Rate limiting is required for sensitive endpoints.

At minimum:

```text
POST /auth/register
POST /auth/login
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/google
POST /orders/:orderid/payments/bank-transfer
```

Recommended initial implementation:

```text
express-rate-limit
```

with an in-memory store.

Redis is not required for the MVP solely for rate limiting.

If SUMASIFY later runs multiple API instances or requires distributed counters, a shared Redis-backed store can be introduced without changing the API contract.

---

# 34. Security Requirements

The API must enforce:

* HTTPS in production
* Password hashing using bcrypt with a cost factor of 12 salt rounds
* Short-lived access tokens
* Rotated refresh sessions
* HttpOnly/Secure/SameSite refresh cookie
* Server-side role checks
* Resource ownership checks
* Zod validation
* Parameterised database queries through Prisma
* Database constraints
* Transactional checkout
* Secure CORS allowlist
* Helmet/security headers
* Rate limiting
* Safe public errors
* Redacted logs
* Private payment evidence
* Audit logging for privileged actions

---

## 34.1 Password Hashing — Bcrypt

SUMASIFY will use bcrypt for secure password hashing.

Plain-text passwords must never be stored, logged, or returned in API responses.

The backend will use a **cost factor of 12 salt rounds** for password hashing.

This provides a consistent security baseline across the application while keeping password hashing practical for normal authentication operations.

Example:

```javascript
const saltRounds = 12;

const hashedPassword = await bcrypt.hash(password, saltRounds);
```

Password verification must use:

```javascript
bcrypt.compare()
```

against the stored hash.

The salt must not be manually stored or managed separately, as bcrypt embeds the required salt and cost information within the generated hash.

The API must never trust frontend route guards as an authorization mechanism.

---

# 35. HTTP Status Convention

| Status | Meaning / SUMASIFY usage                   |
| ------ | ------------------------------------------ |
| 200    | Successful read/update                     |
| 201    | Resource created                           |
| 202    | Accepted, e.g. password-reset request      |
| 204    | Successful operation with no response body |
| 400    | Invalid request / business validation      |
| 401    | Missing/invalid authentication             |
| 403    | Authenticated but not authorised           |
| 404    | Resource not found                         |
| 409    | State/uniqueness/idempotency conflict      |
| 422    | Optional semantic validation if adopted    |
| 429    | Rate limit exceeded                        |
| 500    | Unexpected server error                    |

---

# 36. Important Error Codes

Recommended stable error codes:

```text
validation_error
unauthorized
forbidden
not_found
conflict
duplicate_resource
invalid_credential
account_suspended
account_deactivated
vendor_not_approved
product_unavailable
insufficient_stock
invalid_status_transition
payment_not_allowed
payment_already_submitted
payment_already_verified
invalid_payment_method
idempotency_conflict
rate_limited
upload_invalid
upload_too_large
category_inactive
```

The exact list can grow, but frontend code should depend on stable values rather than parsing human-readable messages.

---

# 37. API Endpoint Catalogue

## Authentication

```text
POST /auth/register
POST /auth/login
POST /auth/google
POST /auth/refresh
POST /auth/logout
GET /auth/me
POST /auth/forgot-password
POST /auth/reset-password
```

## Catalogue

```text
GET /categories
GET /products
GET /products/:productid
```

## Cart

```text
GET /cart
PUT /cart/items/:productid
DELETE /cart/items/:productid
```

## Checkout & Orders

```text
POST /checkout/preview
POST /checkout/orders
GET /orders
GET /orders/:orderid
POST /orders/:orderid/payments/bank-transfer
```

## Vendor Application

```text
POST /vendor-applications
GET /vendor-applications/me
```

## Vendor

```text
GET /vendor/profile
PATCH /vendor/profile
GET /vendor/products
POST /vendor/products
PATCH /vendor/products/:productid
PATCH /vendor/products/:productid/inventory
POST /uploads/product-images
GET /vendor/orders
GET /vendor/orders/:groupid
PATCH /vendor/orders/:groupid/status
```

## Admin

```text
GET /admin/dashboard
GET /admin/vendor-applications
PATCH /admin/vendor-applications/:id
POST /admin/categories
PATCH /admin/categories/:categoryid
PATCH /admin/categories/:categoryid/status
GET /admin/products
GET /admin/products/:productid
PATCH /admin/products/:productid
GET /admin/users
GET /admin/users/:userid
PATCH /admin/users/:userid
GET /admin/orders
PATCH /admin/payments/:paymentid
PATCH /admin/vendor-orders/:groupid/settlement
```

## Notifications

```text
GET /notifications
PATCH /notifications/:id/read
```

## Infrastructure

```text
GET /health
```

---

# 38. Explicitly Out of Scope for V1

The following endpoints should not be added to the MVP contract unless the Founder/Technical Lead approves a scope change:

```text
POST /chat
GET /chat/*
POST /reviews
GET /reviews/*
POST /recommendations
POST /delivery/routing
GET /delivery/map
POST /payments/paystack
POST /payments/webhooks
```

Also excluded:

* Automated vendor payouts
* Platform-managed logistics
* Automated refund processing
* Advanced fraud scoring
* Native mobile applications
* Loyalty/reward systems
* Promoted listings
* International payments
* Multi-country marketplace functionality

The approved TRD explicitly defers these capabilities.

---

# 39. Contract Ownership & Change Policy

The backend owns the canonical API implementation.

The Technical Lead owns API/database direction and chairs contract review.

The published API contract should be represented in:

```text
openapi.yaml
```

and this document should remain synchronized with it.

Breaking changes require:

1. Contract update.
2. Frontend impact review.
3. Backend implementation.
4. Frontend adapter update.
5. Tests updated.
6. Version/change note added.

Do not coordinate breaking API changes only through chat.

The approved TRD specifically requires the backend to publish OpenAPI and contract changes to be reviewed before frontend integration.

---

# 40. MVP Contract Acceptance Checklist

The API contract is considered implementation-ready when:

* [ ] Authentication endpoints are defined.
* [ ] Google authentication is defined.
* [ ] Refresh-session lifecycle is defined.
* [ ] Role/ownership authorization is defined.
* [ ] Categories are API-managed.
* [ ] Public product catalogue is defined.
* [ ] Server-backed cart is defined.
* [ ] Checkout preview is defined.
* [ ] Multi-vendor order creation is defined.
* [ ] Stock reservation transaction is defined.
* [ ] Manual bank-transfer submission is defined.
* [ ] Admin payment verification is defined.
* [ ] Vendor application/approval is defined.
* [ ] Vendor product CRUD is defined.
* [ ] Vendor inventory update is defined.
* [ ] Product image upload is defined.
* [ ] Vendor fulfilment lifecycle is defined.
* [ ] Admin product/user/order operations are defined.
* [ ] Error envelope is defined.
* [ ] Pagination is defined.
* [ ] Idempotency requirements are defined.
* [ ] Rate-limited endpoints are defined.
* [ ] Health endpoint is defined.
* [ ] Out-of-scope functionality is explicitly excluded.
* [ ] OpenAPI can be generated from this contract.
* [ ] Postman/Bruno tests cover success and documented failure paths.

---

# 41. Source of Truth Hierarchy

When implementing an endpoint, resolve conflicts in this order:

```text
1. Founder-approved TRD decision
            ↓
2. API Contract
            ↓
3. Prisma Schema / database constraints
            ↓
4. Service/business rules
            ↓
5. Frontend implementation
```

The frontend mock/API shapes are prototypes, not authoritative backend contracts.

The backend must adapt the frontend to the approved API rather than reproducing mock-only behaviour.

---

# 42. Current Implementation Boundary

The SUMASIFY backend remains a modular monolith:

```text
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── vendors/
│   ├── catalog/
│   ├── carts/
│   ├── orders/
│   ├── payments/
│   └── admin/
│
├── middleware/
├── config/
├── lib/
└── app.js
```

The API contract maps directly to these modules.

No microservice split is required for MVP.
