import { Link } from 'react-router-dom';
import { MapPin, Instagram, Twitter, Facebook } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background text-foreground border-t border-border">
      <div className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img
                src="/airo-assets/images/logo/horizontal"
                alt="Wander."
                className="block h-auto max-h-10 w-auto max-w-[160px] object-contain self-center"
              />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Plan together. Go further.
            </p>
            <div className="flex gap-4 mt-5">
              <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-foreground transition-colors">
                <Instagram size={18} />
              </a>
              <a href="#" aria-label="Twitter" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter size={18} />
              </a>
              <a href="#" aria-label="Facebook" className="text-muted-foreground hover:text-foreground transition-colors">
                <Facebook size={18} />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Product</h4>
            <nav className="flex flex-col gap-2.5" aria-label="Footer product links">
              {['Features', 'How It Works', 'Pricing', 'Changelog'].map((item) => (
                <a key={item} href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {item}
                </a>
              ))}
            </nav>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Company</h4>
            <nav className="flex flex-col gap-2.5" aria-label="Footer company links">
              {['About Us', 'Blog', 'Careers', 'Press'].map((item) => (
                <a key={item} href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {item}
                </a>
              ))}
            </nav>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Support</h4>
            <nav className="flex flex-col gap-2.5" aria-label="Footer support links">
              {['Help Center', 'Contact Us', 'Privacy Policy', 'Terms of Service'].map((item) => (
                <a key={item} href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {item}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-muted-foreground">
            © {currentYear} Wander. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin size={11} /> Made for adventurers everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}
