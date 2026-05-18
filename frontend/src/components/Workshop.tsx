import { workshops } from '@/data/products';

export default function Workshop() {
  // 2-3개 워크숍만 선택
  const featuredWorkshops = workshops.slice(0, 3);

  return (
    <section id="workshop" className="py-32 md:py-48 bg-background">
      <div className="container">
        {/* Section Header */}
        <div className="mb-24 md:mb-32">
          <h2 className="text-3xl md:text-4xl font-serif font-normal text-foreground mb-4">
            Leather Workshop
          </h2>
          <p className="text-base text-foreground/60">
            직접 자르고, 꿰매고, 마감하며 가죽의 시간을 경험합니다
          </p>
        </div>

        {/* Workshop Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-24">
          {featuredWorkshops.map((workshop) => (
            <div key={workshop.id} className="product-card group">
              {/* Image */}
              <div className="relative overflow-hidden bg-secondary h-80 md:h-96 mb-10">
                <img
                  src={workshop.image}
                  alt={workshop.name}
                  className="w-full h-full object-cover image-hover"
                />
              </div>

              {/* Content */}
              <div>
                <h3 className="text-lg md:text-xl font-serif font-normal text-foreground mb-4">
                  {workshop.name}
                </h3>
                <p className="text-sm text-foreground/60 mb-8 leading-relaxed">
                  {workshop.description}
                </p>
                <div className="space-y-2 mb-8 text-sm text-foreground/60">
                  <p>{workshop.duration}</p>
                  <p>₩{workshop.price.toLocaleString()}</p>
                </div>
                <button className="btn-outline w-full text-sm">
                  예약 문의
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
