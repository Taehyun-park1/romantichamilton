import { Mail, MapPin, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container py-16 md:py-20">
        <div className="mb-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-16">
          <div>
            <h3 className="mb-4 text-lg font-normal text-background">
              Romantic Hamilton
            </h3>
            <p className="text-sm leading-relaxed text-background/70">
              손으로 만든 가죽 제품, 오래 곁에 남는 물건.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-normal uppercase tracking-[0.14em] text-background/60">
              Contact
            </h4>
            <div className="space-y-3">
              <a
                href="tel:+821012345678"
                className="flex items-center gap-2 text-sm text-background/70 transition-colors hover:text-background"
              >
                <Phone size={16} />
                010-8077-4776
              </a>
              <a
                href="mailto:hello@romantichamilton.com"
                className="flex items-center gap-2 text-sm text-background/70 transition-colors hover:text-background"
              >
                <Mail size={16} />
                hello@romantichamilton.com
              </a>
              <div className="flex items-start gap-2 text-sm text-background/70">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                <span>Seoul, Korea</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-normal uppercase tracking-[0.14em] text-background/60">
              Hours
            </h4>
            <div className="space-y-2 text-sm text-background/70">
              <p>Mon - Fri: 10:00 - 18:00</p>
              <p>Sat: 11:00 - 17:00</p>
              <p>Sun: Closed</p>
            </div>
          </div>
        </div>

        <div className="border-t border-background/10 pt-8">
          <p className="text-center text-xs text-background/50">
            © 2026 Romantic Hamilton. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
