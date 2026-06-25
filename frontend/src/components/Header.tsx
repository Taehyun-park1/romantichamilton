import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const sectionItems = [
  { label: '제품', href: '#products' },
  { label: '브랜드', href: '#story' },
  { label: '맞춤 제작', href: '#custom' },
  { label: '클래스', href: '#workshop' },
  { label: '리뷰', href: '#reviews' },
  { label: '문의', href: '#contact' },
];

export default function Header() {
  const [location, navigate] = useLocation();
  const { isAuthenticated, isAdmin, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  const handleSectionClick = (href: string) => {
    const sectionId = href.replace('#', '');

    if (location === '/') {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      closeMenu();
      return;
    }

    window.location.href = `/${href}`;
  };

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    if (location === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }

    closeMenu();
  };

  const handleSignOut = async () => {
    await signOut();
    closeMenu();
    navigate('/');
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="container relative">
        <div className="flex h-16 items-center justify-between md:h-20">
          <a
            href="#top"
            onClick={handleLogoClick}
            className="text-base font-semibold text-foreground md:text-lg"
          >
            Romantic Hamilton
          </a>

          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-7 md:flex">
              {sectionItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleSectionClick(item.href)}
                  className="text-xs font-normal text-foreground/60 transition-colors duration-200 hover:text-foreground md:text-sm"
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={isMenuOpen}
              className="grid h-8 w-8 place-items-center text-foreground/60 transition-colors hover:text-foreground"
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="border-t border-border bg-background md:absolute md:right-0 md:top-full md:w-60 md:border md:border-foreground/10 md:shadow-sm">
            <nav className="space-y-1 py-4 md:p-3">
              <div className="md:hidden">
                {sectionItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleSectionClick(item.href)}
                    className="block w-full px-0 py-2 text-left text-sm font-normal text-foreground/60 transition-colors hover:text-foreground md:px-3"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="border-t border-foreground/10 pt-3 md:border-t-0 md:pt-0">
                <Link
                  href="/reserve"
                  onClick={closeMenu}
                  className="block px-0 py-2 text-sm text-foreground/60 transition-colors hover:text-foreground md:px-3"
                >
                  예약
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={closeMenu}
                    className="block px-0 py-2 text-sm text-foreground/60 transition-colors hover:text-foreground md:px-3"
                  >
                    관리자
                  </Link>
                )}

                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="block w-full px-0 py-2 text-left text-sm text-foreground/60 transition-colors hover:text-foreground md:px-3"
                  >
                    로그아웃
                  </button>
                ) : (
                  <Link
                    href="/auth"
                    onClick={closeMenu}
                    className="block px-0 py-2 text-sm text-foreground/60 transition-colors hover:text-foreground md:px-3"
                  >
                    로그인
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
