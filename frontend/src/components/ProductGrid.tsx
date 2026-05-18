import { products } from '@/data/products';

export default function ProductGrid() {
  // 주요 제품 4개만 선택
  const featuredProducts = products.slice(0, 4);

  return (
    <section id="products" className="py-32 md:py-48 bg-background">
      <div className="container">
        {/* Section Header */}
        <div className="mb-24 md:mb-32">
          <h2 className="text-3xl md:text-4xl font-serif font-normal text-foreground mb-4">
            Featured Products
          </h2>
          <p className="text-base text-foreground/60">
            정성스럽게 만든 가죽 제품들
          </p>
        </div>

        {/* Product Grid - 2 columns on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
          {featuredProducts.map((product) => (
            <div key={product.id} className="product-card group">
              {/* Image */}
              <div className="relative overflow-hidden bg-secondary h-96 md:h-[500px] mb-10">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover image-hover"
                />
              </div>

              {/* Content */}
              <div>
                <h3 className="text-xl md:text-2xl font-serif font-normal text-foreground mb-3">
                  {product.name}
                </h3>
                <p className="text-sm text-foreground/60 mb-6 leading-relaxed">
                  {product.description}
                </p>
                <p className="text-lg font-normal text-foreground">
                  ₩{product.price.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="mt-20 text-center">
          <a href="#" className="text-sm font-normal text-foreground/60 hover:text-foreground transition-colors">
            모든 제품 보기 →
          </a>
        </div>
      </div>
    </section>
  );
}
