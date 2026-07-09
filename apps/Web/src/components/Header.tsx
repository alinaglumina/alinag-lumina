import Link from "next/link";
import SearchBar from "./SearchBar";

export default function Header() {
  return (
    <header className="header">
      <div className="wrap">
        <Link href="/" className="brand"><span className="coin" />Alinag <span>Lumina</span></Link>
        <nav className="nav">
          <Link href="/products?category=fashion">Fashion</Link>
          <Link href="/products?category=electronics">Electronics</Link>
          <Link href="/products?newArrivals=true">New</Link>
          <Link href="/products?discount=40">Deals</Link>
        </nav>
        <div className="spacer" />
        <SearchBar />
        <Link href="/account" className="btn">Account</Link>
        <Link href="/cart" className="btn primary">Cart</Link>
      </div>
    </header>
  );
}
