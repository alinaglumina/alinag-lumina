import Link from "next/link";

const cols = {
  Company: [["About Us", "/about"], ["Careers", "/careers"], ["Contact Us", "/contact"], ["Blog", "/blog"]],
  Policies: [["Privacy Policy", "/privacy-policy"], ["Terms & Conditions", "/terms"], ["Shipping Policy", "/shipping-policy"], ["Return Policy", "/return-policy"], ["Refund Policy", "/refund-policy"], ["Cancellation Policy", "/cancellation-policy"]],
  Help: [["FAQ", "/faq"], ["Track Order", "/track"], ["Gift Cards", "/gift-cards"], ["Support", "/contact"]],
};

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap cols">
        {Object.entries(cols).map(([h, links]) => (
          <div key={h}>
            <h5>{h}</h5>
            {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          </div>
        ))}
      </div>
      <div className="wrap" style={{ marginTop: 24, opacity: .7 }}>© {new Date().getFullYear()} Alinag Lumina. GST-compliant · Secure payments via Razorpay.</div>
    </footer>
  );
}
