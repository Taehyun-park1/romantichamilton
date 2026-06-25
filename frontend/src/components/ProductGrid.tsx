import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { products } from '@/data/products';

export default function ProductGrid() {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleProducts = isExpanded ? products : products.slice(0, 3);
  const hiddenProductCount = Math.max(products.length - 3, 0);

  return (
    <section
      id="products"
      className="scroll-mt-20 md:scroll-mt-24 py-24 md:py-36 bg-background"
    >
      <div className="container">
        <div className="mb-14 md:mb-20 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
              Collection
            </p>
            <h2 className="text-3xl md:text-5xl font-serif font-normal text-foreground mb-4">
              손으로 완성한 가죽 제품
            </h2>
            <p className="max-w-2xl text-base text-foreground/65">
              실제 작업 사진을 중심으로 제품의 질감과 형태가 바로 보이도록
              구성했습니다.
            </p>
          </div>
          <a
            href="#custom"
            className="self-start md:self-auto text-sm text-foreground/60 hover:text-foreground transition-colors"
          >
            맞춤 제작 상담
          </a>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product, index) => (
            <article key={product.id} className="group">
              <div className="relative overflow-hidden bg-secondary aspect-[4/5] mb-6">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover image-hover"
                />
                {product.badge && (
                  <span className="absolute left-4 top-4 bg-background/90 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-foreground">
                    {product.badge}
                  </span>
                )}
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs text-foreground/45">
                    0{index + 1}
                  </p>
                  <h3 className="text-xl font-serif font-normal text-foreground mb-3">
                    {product.name}
                  </h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">
                    {product.description}
                  </p>
                </div>
                <p className="shrink-0 text-sm text-foreground">
                  {product.price.toLocaleString()}원
                </p>
              </div>
            </article>
          ))}
        </div>

        {hiddenProductCount > 0 && (
          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={() => setIsExpanded((expanded) => !expanded)}
              className="inline-flex items-center gap-2 border border-foreground/15 px-5 py-3 text-sm text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground"
              aria-expanded={isExpanded}
            >
              {isExpanded ? '제품 접기' : `제품 ${hiddenProductCount}개 더보기`}
              <ChevronDown
                className={`size-4 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
