import { rhImages } from '@/data/products';

export default function Journal() {
  return (
    <section
      id="journal"
      className="scroll-mt-20 md:scroll-mt-24 py-24 md:py-36 bg-background"
    >
      <div className="container">
        <div className="mb-12 md:mb-16">
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
            Photo Journal
          </p>
          <h2 className="text-3xl md:text-5xl font-serif font-normal text-foreground mb-4">
            작업 사진으로 보는 분위기
          </h2>
          <p className="max-w-2xl text-base text-foreground/65">
            준비해 둔 12장의 이미지를 사이트 전반에 배치하고, 남은 컷은
            갤러리로 한 번에 볼 수 있게 정리했습니다.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {rhImages.map((image, index) => (
            <img
              key={image}
              src={image}
              alt={`Romantic Hamilton gallery ${index + 1}`}
              className={`w-full object-cover bg-secondary ${
                index % 5 === 0 ? 'aspect-[4/5] md:row-span-2 md:h-full' : 'aspect-square'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
