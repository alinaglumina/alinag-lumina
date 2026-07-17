// Curated OpenAPI 3 spec for the core API surface. Served at /docs (Swagger UI) and /openapi.json.
// Admin routes (/admin/*) follow the same REST conventions and require a staff/admin/superadmin bearer.
export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Alinag Lumina API",
    version: "1.0.0",
    description: "E-commerce platform API — auth, catalog, cart, checkout, payments (Razorpay), reviews, and fulfilment.",
  },
  servers: [{ url: "/", description: "same-origin" }, { url: "http://localhost:4000", description: "local" }],
  tags: [
    { name: "Auth" }, { name: "Products" }, { name: "Cart" }, { name: "Wishlist" },
    { name: "Checkout" }, { name: "Payments" }, { name: "Coupons" }, { name: "Reviews" },
    { name: "Account" }, { name: "Notifications" }, { name: "Tracking" }, { name: "Content" }, { name: "Admin" }, { name: "System" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      guestSession: { type: "apiKey", in: "header", name: "x-session-id", description: "Guest cart/wishlist id" },
    },
    schemas: {
      Error: { type: "object", properties: { error: { type: "string" }, message: { type: "string" } } },
      AuthResponse: { type: "object", properties: { user: { $ref: "#/components/schemas/User" }, accessToken: { type: "string" }, refreshToken: { type: "string" } } },
      User: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, email: { type: "string" }, role: { type: "string", enum: ["customer", "vendor", "staff", "admin", "superadmin"] } } },
      Product: { type: "object", properties: { _id: { type: "string" }, name: { type: "string" }, slug: { type: "string" }, price: { type: "number" }, mrp: { type: "number" }, sku: { type: "string" }, stock: { type: "integer" }, images: { type: "array", items: { type: "string" } }, ratings: { type: "object", properties: { average: { type: "number" }, count: { type: "integer" } } } } },
      ProductList: { type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/Product" } }, total: { type: "integer" }, page: { type: "integer" }, pages: { type: "integer" } } },
      Cart: { type: "object", properties: { items: { type: "array", items: { type: "object" } }, subtotal: { type: "number" } } },
      CheckoutRequest: { type: "object", required: ["items", "paymentMethod"], properties: { items: { type: "array", items: { type: "object", required: ["productId", "qty"], properties: { productId: { type: "string" }, qty: { type: "integer" }, variant: { type: "string" } } } }, addressId: { type: "string" }, shippingAddress: { type: "object" }, couponCode: { type: "string" }, paymentMethod: { type: "string", enum: ["upi", "card", "netbanking", "wallet", "cod"] }, deliveryType: { type: "string", enum: ["standard", "express", "same_day"] } } },
      Order: { type: "object", properties: { orderId: { type: "string" }, orderNo: { type: "string" }, amounts: { type: "object", properties: { subtotal: { type: "number" }, discount: { type: "number" }, shipping: { type: "number" }, tax: { type: "number" }, total: { type: "number" } } } } },
    },
  },
  paths: {
    "/health": { get: { tags: ["System"], summary: "Liveness", responses: { "200": { description: "up" } } } },
    "/ready": { get: { tags: ["System"], summary: "Readiness (DB + job broker)", responses: { "200": { description: "ready" }, "503": { description: "degraded" } } } },

    "/auth/register": { post: { tags: ["Auth"], summary: "Register", requestBody: body({ name: "string", email: "string", password: "string" }, ["name", "email", "password"]), responses: ok("AuthResponse", 201) } },
    "/auth/login": { post: { tags: ["Auth"], summary: "Login", requestBody: body({ email: "string", password: "string" }, ["email", "password"]), responses: { ...ok("AuthResponse"), "401": err("Invalid credentials") } } },
    "/auth/refresh": { post: { tags: ["Auth"], summary: "Rotate refresh token", requestBody: body({ refreshToken: "string" }), responses: ok("AuthResponse") } },
    "/auth/logout": { post: { tags: ["Auth"], summary: "Logout (revoke session)", security: [{ bearerAuth: [] }], responses: { "200": { description: "ok" } } } },
    "/auth/verify-email": { post: { tags: ["Auth"], summary: "Verify email", requestBody: body({ uid: "string", token: "string" }), responses: { "200": { description: "verified" } } } },
    "/auth/forgot-password": { post: { tags: ["Auth"], summary: "Request password reset", requestBody: body({ email: "string" }), responses: { "200": { description: "ok" } } } },
    "/auth/reset-password": { post: { tags: ["Auth"], summary: "Reset password", requestBody: body({ uid: "string", token: "string", password: "string" }), responses: { "200": { description: "ok" } } } },
    "/auth/otp/request": { post: { tags: ["Auth"], summary: "Request login OTP", requestBody: body({ email: "string" }), responses: { "200": { description: "sent" } } } },
    "/auth/otp/verify": { post: { tags: ["Auth"], summary: "Verify OTP → session", requestBody: body({ email: "string", code: "string" }), responses: ok("AuthResponse") } },
    "/auth/google": { get: { tags: ["Auth"], summary: "Start Google OAuth (redirect)", responses: { "302": { description: "redirect to Google" } } } },
    "/auth/sessions": { get: { tags: ["Auth"], summary: "List active device sessions", security: [{ bearerAuth: [] }], responses: { "200": { description: "sessions" } } } },

    "/products": { get: { tags: ["Products"], summary: "List/search products", parameters: qp(["q", "category", "brand", "minPrice", "maxPrice", "rating", "color", "size", "inStock", "discount", "newArrivals", "sort", "page", "limit"]), responses: ok("ProductList") } },
    "/products/autocomplete": { get: { tags: ["Products"], summary: "Search autocomplete", parameters: qp(["q"]), responses: { "200": { description: "suggestions" } } } },
    "/products/{slug}": { get: { tags: ["Products"], summary: "Product detail", parameters: [pathParam("slug")], responses: { ...ok("Product"), "404": err("Not found") } } },
    "/products/{productId}/reviews": { get: { tags: ["Reviews"], summary: "Approved reviews + distribution", parameters: [pathParam("productId")], responses: { "200": { description: "reviews" } } } },

    "/cart": { get: { tags: ["Cart"], summary: "View cart", security: [{ bearerAuth: [] }, { guestSession: [] }], responses: ok("Cart") } },
    "/cart/items": { post: { tags: ["Cart"], summary: "Add item", security: [{ bearerAuth: [] }, { guestSession: [] }], requestBody: body({ productId: "string", qty: "integer", variant: "string" }, ["productId"]), responses: ok("Cart") }, patch: { tags: ["Cart"], summary: "Set item qty", security: [{ bearerAuth: [] }, { guestSession: [] }], requestBody: body({ productId: "string", qty: "integer" }), responses: ok("Cart") } },
    "/cart/merge": { post: { tags: ["Cart"], summary: "Merge guest cart on login", security: [{ bearerAuth: [] }], requestBody: body({ sessionId: "string" }), responses: ok("Cart") } },

    "/wishlist": { get: { tags: ["Wishlist"], summary: "View wishlist", security: [{ bearerAuth: [] }, { guestSession: [] }], responses: { "200": { description: "wishlist" } } } },
    "/wishlist/toggle": { post: { tags: ["Wishlist"], summary: "Toggle product", security: [{ bearerAuth: [] }, { guestSession: [] }], requestBody: body({ productId: "string" }), responses: { "200": { description: "toggled" } } } },
    "/wishlist/share": { post: { tags: ["Wishlist"], summary: "Create shareable link", security: [{ bearerAuth: [] }, { guestSession: [] }], responses: { "200": { description: "shareId" } } } },
    "/wishlist/shared/{shareId}": { get: { tags: ["Wishlist"], summary: "Public shared wishlist", parameters: [pathParam("shareId")], responses: { "200": { description: "products" } } } },

    "/coupons/validate": { post: { tags: ["Coupons"], summary: "Validate a coupon against a cart", security: [{ bearerAuth: [] }], requestBody: body({ code: "string", items: "array" }, ["code", "items"]), responses: { "200": { description: "discount preview" }, "400": err("Invalid/ineligible") } } },

    "/checkout": { post: { tags: ["Checkout"], summary: "Create a pending order (idempotent via Idempotency-Key)", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CheckoutRequest" } } } }, responses: ok("Order", 201) } },

    "/payments/create": { post: { tags: ["Payments"], summary: "Create Razorpay order for an order", security: [{ bearerAuth: [] }], requestBody: body({ orderId: "string" }, ["orderId"]), responses: { "200": { description: "keyId + razorpay orderId" } } } },
    "/payments/verify": { post: { tags: ["Payments"], summary: "Verify checkout signature → mark paid", security: [{ bearerAuth: [] }], requestBody: body({ orderId: "string", razorpay_order_id: "string", razorpay_payment_id: "string", razorpay_signature: "string" }), responses: { "200": { description: "paid" }, "400": err("Signature mismatch") } } },
    "/payments/webhook": { post: { tags: ["Payments"], summary: "Razorpay webhook (signature-verified)", responses: { "200": { description: "ok" }, "400": err("Invalid signature") } } },
    "/payments/{orderId}/refund": { post: { tags: ["Payments"], summary: "Refund a paid order (admin)", security: [{ bearerAuth: [] }], parameters: [pathParam("orderId")], responses: { "200": { description: "refunded" } } } },

    "/me": { get: { tags: ["Account"], summary: "Profile", security: [{ bearerAuth: [] }], responses: ok("User") }, put: { tags: ["Account"], summary: "Update profile", security: [{ bearerAuth: [] }], requestBody: body({ name: "string", phone: "string" }), responses: ok("User") } },
    "/me/orders": { get: { tags: ["Account"], summary: "My orders", security: [{ bearerAuth: [] }], responses: { "200": { description: "orders" } } } },
    "/me/addresses": { get: { tags: ["Account"], summary: "List addresses", security: [{ bearerAuth: [] }], responses: { "200": { description: "addresses" } } }, post: { tags: ["Account"], summary: "Add address", security: [{ bearerAuth: [] }], responses: { "201": { description: "created" } } } },
    "/me/notifications": { get: { tags: ["Notifications"], summary: "Inbox", security: [{ bearerAuth: [] }], responses: { "200": { description: "items + unread" } } } },

    "/orders/{id}/track": { get: { tags: ["Tracking"], summary: "Track shipment (owner)", security: [{ bearerAuth: [] }], parameters: [pathParam("id")], responses: { "200": { description: "shipment status + events" } } } },
    "/logistics/webhook": { post: { tags: ["Tracking"], summary: "Logistics provider webhook", requestBody: body({ awb: "string", status: "string" }), responses: { "200": { description: "ok" } } } },

    "/cms/{key}": { get: { tags: ["Content"], summary: "Published CMS page", parameters: [pathParam("key")], responses: { "200": { description: "page" } } } },
    "/banners": { get: { tags: ["Content"], summary: "Active banners", parameters: qp(["placement"]), responses: { "200": { description: "banners" } } } },
    "/blog": { get: { tags: ["Content"], summary: "Published posts", responses: { "200": { description: "posts" } } } },

    "/admin/dashboard": { get: { tags: ["Admin"], summary: "Dashboard KPIs (staff+)", security: [{ bearerAuth: [] }], responses: { "200": { description: "metrics" }, "403": err("Forbidden") } } },
    "/admin/products": { get: { tags: ["Admin"], summary: "List (catalog roles)", security: [{ bearerAuth: [] }], responses: { "200": { description: "items" } } }, post: { tags: ["Admin"], summary: "Create product", security: [{ bearerAuth: [] }], responses: { "201": { description: "created" } } } },
    "/admin/orders/{id}/ship": { post: { tags: ["Admin"], summary: "Assign shipment + notify", security: [{ bearerAuth: [] }], parameters: [pathParam("id")], responses: { "200": { description: "shipped" } } } },
    "/admin/reports/overview": { get: { tags: ["Admin"], summary: "Revenue/orders/AOV with growth", security: [{ bearerAuth: [] }], responses: { "200": { description: "kpis" } } } },
  },
} as const;

// ── tiny helpers to keep the spec DRY ──
function body(props: Record<string, string>, required: string[] = []) {
  const properties: any = {};
  for (const [k, t] of Object.entries(props)) properties[k] = { type: t };
  return { required: true, content: { "application/json": { schema: { type: "object", properties, ...(required.length && { required }) } } } };
}
function ok(schema: string, code = 200) { return { [code]: { description: "OK", content: { "application/json": { schema: { $ref: `#/components/schemas/${schema}` } } } } }; }
function err(desc: string) { return { description: desc, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }; }
function qp(names: string[]) { return names.map((name) => ({ name, in: "query", required: false, schema: { type: "string" } })); }
function pathParam(name: string) { return { name, in: "path", required: true, schema: { type: "string" } }; }
