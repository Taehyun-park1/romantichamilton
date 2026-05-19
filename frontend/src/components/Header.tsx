import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const menuItems = [
  { label: '제품', href: '#products' },
  { label: '브랜드', href: '#story' },
  { label: '맞춤 제작', href: '#custom' },
  { label: '클래스', href: '#workshop' },
  { label: '사진', href: '#journal' },
  { label: '문의', href: '#contact' },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuClick = (href: string) => {
    const sectionId = href.replace('#', '');
    const element = document.getElementById(sectionId);

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    setIsMenuOpen(false);
  };

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-background/90 backdrop-blur-sm border-b border-border z-50">
      <div className="container">
        <div className="flex items-center justify-between h-16 md:h-20">
          <a
            href="#top"
            onClick={handleLogoClick}
            className="text-base md:text-lg font-serif font-normal text-foreground"
          >
            Romantic Hamilton
          </a>

          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-8">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleMenuClick(item.href)}
                  className="text-xs md:text-sm font-normal text-foreground/60 hover:text-foreground transition-colors duration-200"
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <button
              type="button"
              aria-label="추가 메뉴 열기"
              title="추가 메뉴"
              className="grid h-8 w-8 place-items-center text-foreground/60 transition-colors hover:text-foreground"
            >
              <Menu size={17} />
            </button>
          </div>

          <button
            type="button"
            className="md:hidden p-1 text-foreground"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="메뉴 열기"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {isMenuOpen && (
          <nav className="md:hidden border-t border-border bg-background">
            <div className="py-4 space-y-3">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleMenuClick(item.href)}
                  className="block w-full text-left text-sm font-normal text-foreground/60 hover:text-foreground transition-colors py-2"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
