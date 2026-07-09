import { Schema, model } from "mongoose";

const OrderItemSchema = new Schema(
  { product: { type: Schema.Types.ObjectId, ref: "Product" }, name: String, sku: String,
    variant: String, glyph: String, qty: Number, price: Number, gstPercent: Number },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    orderNo: { type: String, unique: true, index: true },
    idempotencyKey: { type: String, index: true, sparse: true },
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    items: [OrderItemSchema],

    amounts: { subtotal: Number, discount: Number, shipping: Number, tax: Number, total: Number },
    coupon: { code: String, discount: Number },

    shippingAddress: Object,
    billingAddress: Object,

    payment: {
      method: { type: String, enum: ["upi", "card", "netbanking", "wallet", "cod"] },
      gateway: { type: String, default: "Razorpay" },
      status: { type: String, enum: ["pending", "paid", "failed", "refunded", "cancelled"], default: "pending", index: true },
      providerOrderId: String, providerPaymentId: String, transactionId: String,
    },

    // Logistics / tracking
    shipment: {
      provider: String, awb: String, trackingUrl: String,
      status: { type: String, enum: ["not_shipped", "processing", "shipped", "out_for_delivery", "delivered", "rto"], default: "not_shipped" },
      events: [{ status: String, note: String, at: Date }],
    },

    status: { type: String, enum: ["created", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"], default: "created", index: true },
    invoiceUrl: String,
  },
  { timestamps: true }
);
export const Order = model("Order", OrderSchema);

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ "payment.status": 1, createdAt: -1 });
OrderSchema.index({ "shipment.awb": 1 });
OrderSchema.index({ "coupon.code": 1, "payment.status": 1 });
