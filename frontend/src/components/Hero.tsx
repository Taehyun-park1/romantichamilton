interface HeroProps {
  onExplore?: () => void;
  onCustom?: () => void;
}

export default function Hero({ onExplore, onCustom }: HeroProps) {
  return (
    <section className="relative w-full h-screen flex items-center justify-center overflow-hidden pt-16 md:pt-20">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663634998865/RWrBtmJLJrWD3LLgaKujjJ/product-showcase-46FkYGwn78x2U76t4Ecee8.webp"
          alt="Leather workshop"
          className="w-full h-full object-cover"
        />
        {/* Subtle overlay */}
        <div className="absolute inset-0 bg-black/25"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container max-w-2xl text-center px-4">
        <h1 className="text-4xl md:text-6xl font-serif font-normal text-white mb-6 leading-tight">
          Handmade Leather Goods
        </h1>
        
        <p className="text-lg md:text-xl font-normal text-white/85 mb-12 leading-relaxed">
          손으로 만든 가죽 제품, 오래 곁에 남는 물건
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onExplore}
            className="btn-primary bg-white text-foreground hover:bg-white/90"
          >
            제품 보기
          </button>
          <button
            onClick={onCustom}
            className="btn-outline border-white text-white hover:bg-white/10"
          >
            맞춤 제작 문의
          </button>
        </div>
      </div>
    </section>
  );
}
