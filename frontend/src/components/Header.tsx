import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const menuItems = [
  { label: '제품', href: '#products' },
  { label: '브랜드', href: '#story' },
  { label: '맞춤 제작', href: '#custom' },
  { label: '클래스', href: '#workshop' },
  { label: '사진', href: '#journal' },
  { label: '문의', href: '#contact' },
];

export default function Header() {
  const [location, navigate] = useLocation();
  const { isAuthenticated, isAdmin, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuClick = (href: string) => {
    const sectionId = href.replace('#', '');
    const element = document.getElementById(sectionId);

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.href = `/${href}`;
    }

    setIsMenuOpen(false);
  };

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    if (location === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }

    setIsMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
    navigate('/');
  };

  const authLinks = isAuthenticated ? (
    <>
      <Link
        href="/reserve"
        className="text-xs text-foreground/60 transition-colors hover:text-foreground md:text-sm"
      >
        예약
      </Link>
      {isAdmin && (
        <Link
          href="/admin"
          className="text-xs text-foreground/60 transition-colors hover:text-foreground md:text-sm"
        >
          관리자
        </Link>
      )}
      <button
        type="button"
        onClick={handleSignOut}
        className="text-xs text-foreground/60 transition-colors hover:text-foreground md:text-sm"
      >
        로그아웃
      </button>
    </>
  ) : (
    <Link
      href="/auth"
      className="text-xs text-foreground/60 transition-colors hover:text-foreground md:text-sm"
    >
      로그인
    </Link>
  );

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="container">
        <div className="flex h-16 items-center justify-between md:h-20">
          <a
            href="#top"
            onClick={handleLogoClick}
            className="text-base font-semibold text-foreground md:text-lg"
          >
            Romantic Hamilton
          </a>

          <div className="hidden items-center gap-8 md:flex">
            <nav className="flex items-center gap-7">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleMenuClick(item.href)}
                  className="text-xs font-normal text-foreground/60 transition-colors duration-200 hover:text-foreground md:text-sm"
                >
                  {item.label}
                </button>
              ))}
              {authLinks}
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
            className="p-1 text-foreground md:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="메뉴 열기"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {isMenuOpen && (
          <nav className="border-t border-border bg-background md:hidden">
            <div className="space-y-3 py-4">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleMenuClick(item.href)}
                  className="block w-full py-2 text-left text-sm font-normal text-foreground/60 transition-colors hover:text-foreground"
                >
                  {item.label}
                </button>
              ))}
              <div className="space-y-3 border-t border-foreground/10 pt-3">
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/reserve"
                      className="block text-sm text-foreground/60"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      예약
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="block text-sm text-foreground/60"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        관리자
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="block text-sm text-foreground/60"
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth"
                    className="block text-sm text-foreground/60"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    로그인
                  </Link>
                )}
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
