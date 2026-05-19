import { workshops } from '@/data/products';

export default function Workshop() {
  return (
    <section
      id="workshop"
      className="scroll-mt-20 md:scroll-mt-24 py-24 md:py-36 bg-background"
    >
      <div className="container">
        <div className="mb-14 md:mb-20">
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
            Workshop
          </p>
          <h2 className="text-3xl md:text-5xl font-serif font-normal text-foreground mb-4">
            직접 만들고 오래 사용하는 시간
          </h2>
          <p className="max-w-2xl text-base text-foreground/65">
            가죽의 질감과 제작 과정을 가까이에서 경험할 수 있는 클래스입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          {workshops.map((workshop) => (
            <article key={workshop.id} className="group">
              <div className="relative overflow-hidden bg-secondary aspect-[4/5] mb-6">
                <img
                  src={workshop.image}
                  alt={workshop.name}
                  className="w-full h-full object-cover image-hover"
                />
              </div>
              <h3 className="text-xl font-serif font-normal text-foreground mb-3">
                {workshop.name}
              </h3>
              <p className="text-sm text-foreground/60 mb-5 leading-relaxed">
                {workshop.description}
              </p>
              <div className="flex items-center justify-between text-sm text-foreground/60 border-t border-foreground/10 pt-4">
                <span>{workshop.duration}</span>
                <span>
                  {workshop.price === 0
                    ? '상담 문의'
                    : `${workshop.price.toLocaleString()}원`}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
