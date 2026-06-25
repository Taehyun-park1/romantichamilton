import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { products as fallbackProducts } from '@/data/products';
import {
  isSupabaseConfigured,
  supabase,
  type SiteProduct,
} from '@/lib/supabase';

function toSiteProduct(product: (typeof fallbackProducts)[number], index: number) {
  return {
    ...product,
    badge: product.badge ?? null,
    is_active: true,
    sort_order: index,
  } satisfies SiteProduct;
}

export default function ProductGrid() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [products, setProducts] = useState<SiteProduct[]>(
    fallbackProducts.map(toSiteProduct)
  );
  const visibleProducts = isExpanded ? products : products.slice(0, 3);
  const hiddenProductCount = Math.max(products.length - 3, 0);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    let mounted = true;
    const supabaseClient = supabase;

    const loadProducts = async () => {
      const { data, error } = await supabaseClient
        .from('site_products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!mounted || error || !data || data.length === 0) return;

      setProducts(data as SiteProduct[]);
    };

    void loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section
      id="products"
      className="scroll-mt-20 bg-background py-24 md:scroll-mt-24 md:py-36"
    >
      <div className="container">
        <div className="mb-14 flex flex-col gap-6 md:mb-20 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
              Collection
            </p>
            <h2 className="mb-4 text-3xl font-semibold text-foreground md:text-5xl">
              손으로 완성한 가죽 제품
            </h2>
            <p className="max-w-2xl text-base text-foreground/65">
              실제 작업 사진을 중심으로 제품의 질감과 형태가 바로 보이도록
              구성했습니다.
            </p>
          </div>
          <a
            href="#custom"
            className="self-start text-sm text-foreground/60 transition-colors hover:text-foreground md:self-auto"
          >
            맞춤 제작 상담
          </a>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product, index) => (
            <article key={product.id} className="group">
              <div className="relative mb-6 aspect-[4/5] overflow-hidden bg-secondary">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover image-hover"
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
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mb-3 text-xl font-semibold text-foreground">
                    {product.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground/60">
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
