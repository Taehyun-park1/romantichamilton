import { Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 mb-12">
          <div>
            <h3 className="text-lg font-serif font-normal text-background mb-4">
              Romantic Hamilton
            </h3>
            <p className="text-sm text-background/70 leading-relaxed">
              손으로 만든 가죽 제품, 오래 곁에 남는 물건.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-normal text-background/60 uppercase tracking-[0.14em] mb-4">
              Contact
            </h4>
            <div className="space-y-3">
              <a
                href="tel:+821012345678"
                className="flex items-center gap-2 text-sm text-background/70 hover:text-background transition-colors"
              >
                <Phone size={16} />
                +82 10-1234-5678
              </a>
              <a
                href="mailto:hello@romantichamilton.com"
                className="flex items-center gap-2 text-sm text-background/70 hover:text-background transition-colors"
              >
                <Mail size={16} />
                hello@romantichamilton.com
              </a>
              <div className="flex items-start gap-2 text-sm text-background/70">
                <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                <span>Seoul, Korea</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-normal text-background/60 uppercase tracking-[0.14em] mb-4">
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
          <p className="text-xs text-background/50 text-center">
            © 2026 Romantic Hamilton. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
