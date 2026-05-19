import { useEffect, useRef, useState } from 'react';

const heroImages = [
  '/rh-images/rh-01.png',
  '/rh-images/rh-02.png',
  '/rh-images/rh-03.png',
];

const SWIPE_THRESHOLD = 50;

interface HeroProps {
  onExplore?: () => void;
  onCustom?: () => void;
}

export default function Hero({ onExplore, onCustom }: HeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const showPreviousImage = () => {
    setActiveIndex((current) =>
      current === 0 ? heroImages.length - 1 : current - 1
    );
  };

  const showNextImage = () => {
    setActiveIndex((current) => (current + 1) % heroImages.length);
  };

  useEffect(() => {
    const timer = window.setInterval(showNextImage, 4500);
    return () => window.clearInterval(timer);
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;

    if (target.closest('button, a')) {
      dragStart.current = null;
      return;
    }

    dragStart.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (!dragStart.current) return;

    const distanceX = event.clientX - dragStart.current.x;
    const distanceY = event.clientY - dragStart.current.y;
    dragStart.current = null;

    if (
      Math.abs(distanceX) < SWIPE_THRESHOLD ||
      Math.abs(distanceX) < Math.abs(distanceY)
    ) {
      return;
    }

    if (distanceX > 0) {
      showPreviousImage();
      return;
    }

    showNextImage();
  };

  return (
    <section
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        dragStart.current = null;
      }}
      className="relative w-full min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-5rem)] flex items-end overflow-hidden select-none touch-pan-y cursor-grab active:cursor-grabbing"
    >
      <div className="absolute inset-0 z-0 bg-[#171311]">
        {heroImages.map((image, index) => (
          <div
            key={image}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              activeIndex === index ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image}
              alt=""
              draggable={false}
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-105 object-cover blur-xl opacity-45"
            />
            <img
              src={image}
              alt={`Romantic Hamilton hero ${index + 1}`}
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain object-center px-3 py-8 md:px-12 md:py-12"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-[#15110d]/88 via-[#15110d]/35 to-[#15110d]/10" />
      </div>

      <div className="relative z-20 container pb-16 md:pb-24">
        <div className="max-w-3xl">
          <p className="mb-5 text-xs md:text-sm uppercase tracking-[0.18em] text-white/70">
            Handmade Leather Studio
          </p>
          <h1 className="text-5xl md:text-7xl font-serif font-normal text-white mb-7 leading-[1.05]">
            Romantic Hamilton
          </h1>
          <p className="max-w-xl text-base md:text-xl font-normal text-white/85 mb-10 leading-relaxed">
            오래 곁에 남는 물건을 만듭니다. 손으로 재단하고, 바느질하고,
            사용할수록 깊어지는 가죽의 표정을 담습니다.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              type="button"
              onClick={onExplore}
              className="btn-primary bg-white text-foreground hover:bg-white/90"
            >
              제품 보기
            </button>
            <button
              type="button"
              onClick={onCustom}
              className="btn-outline border-white text-white hover:bg-white/10"
            >
              맞춤 제작 문의
            </button>
          </div>

          <div className="mt-8 flex items-center gap-2">
            {heroImages.map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`메인 이미지 ${index + 1}번 보기`}
                className={`h-1.5 rounded-full transition-all ${
                  activeIndex === index ? 'w-8 bg-white' : 'w-4 bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
