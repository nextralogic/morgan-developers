import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t bg-card">
    <div className="container section-padding">
      <div className="grid gap-10 md:grid-cols-3">
        <div>
          <h3 className="font-heading text-lg font-bold tracking-tight">
            Morgan Developers<span className="text-primary">.</span>
          </h3>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Premium real estate solutions in Nepal. Find your dream property with confidence and trusted guidance.
          </p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Quick Links
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link to="/" className="text-foreground/70 transition-colors hover:text-primary">Home</Link>
            </li>
            <li>
              <Link to="/properties" className="text-foreground/70 transition-colors hover:text-primary">Properties</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Contact
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li>Kathmandu, Nepal</li>
            <li>info@morgandevelopers.com</li>
            <li>+977-1-XXXXXXX</li>
          </ul>
        </div>
      </div>
    </div>
    <div className="border-t">
      <div className="container py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Morgan Developers. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
