// Default copy for the standard legal/info pages so they render before the CMS is seeded.
// Replace/extend by creating the matching CMS page (key === slug) in the admin.
export const CMS_FALLBACK: Record<string, { title: string; html: string }> = {
  "about": { title: "About Us", html: "<p>Alinag Lumina is a premium shopping destination for fashion, electronics and more. We obsess over design, speed and trust.</p>" },
  "contact": { title: "Contact Us", html: "<p>Email <a href='mailto:support@alinaglumina.com'>support@alinaglumina.com</a> or call +91-00000-00000, Mon–Sat 10am–7pm IST.</p>" },
  "privacy-policy": { title: "Privacy Policy", html: "<p>We collect only what we need to fulfil your orders and improve your experience. We never sell your data. Full policy to be published here.</p>" },
  "terms": { title: "Terms & Conditions", html: "<p>By using Alinag Lumina you agree to our terms of sale and use. Full terms to be published here.</p>" },
  "shipping-policy": { title: "Shipping Policy", html: "<p>Orders are dispatched within 24–48 hours. Standard delivery in 3–7 days; express and same-day available in select pincodes.</p>" },
  "return-policy": { title: "Return Policy", html: "<p>Most items are returnable within 7 days of delivery in original condition. Some categories are exempt.</p>" },
  "refund-policy": { title: "Refund Policy", html: "<p>Approved refunds are credited to the original payment method within 5–7 business days.</p>" },
  "cancellation-policy": { title: "Cancellation Policy", html: "<p>Orders can be cancelled before dispatch from your account. Prepaid cancellations are refunded per the Refund Policy.</p>" },
  "faq": { title: "Frequently Asked Questions", html: "<p><b>How do I track my order?</b> Visit Track Order and enter your order number.</p><p><b>What payment methods are supported?</b> UPI, cards, net-banking, wallets and COD via Razorpay.</p>" },
};
