export default function BrandStory() {
  const values = [
    ['Material', '시간이 지날수록 색이 깊어지는 천연 가죽'],
    ['Making', '손재단과 손바느질로 완성하는 제작 방식'],
    ['Repair', '오래 쓰기 위한 수선과 관리 상담'],
    ['Custom', '각인, 색상, 구조까지 맞추는 주문 제작'],
  ];

  return (
    <section
      id="story"
      className="scroll-mt-20 md:scroll-mt-24 py-24 md:py-36 bg-[#f4f0ea]"
    >
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-20 items-center">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
              About
            </p>
            <h2 className="text-3xl md:text-5xl font-serif font-normal text-foreground mb-8">
              Romantic Hamilton은 물건의 수명을 먼저 생각합니다.
            </h2>
            <div className="space-y-5 text-base md:text-lg leading-relaxed text-foreground/70">
              <p>
                빠르게 소비되는 물건보다 오래 손에 남는 물건을 만듭니다.
                사용자의 생활에 맞게 형태를 다듬고, 매일 닿는 부분의 촉감과
                내구성을 꼼꼼히 확인합니다.
              </p>
              <p>
                사진 속 제품들은 원단의 결, 스티치 간격, 금속 부자재의 색감이
                잘 드러나도록 배치했습니다. 브랜드의 분위기가 한눈에 보이도록
                사이트 전체를 실제 이미지 중심으로 정리했습니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-5">
            <img
              src="/rh-images/rh-10.png"
              alt="Leather goods detail"
              className="aspect-[3/4] w-full object-cover"
            />
            <img
              src="/rh-images/rh-11.png"
              alt="Leather product arrangement"
              className="aspect-[3/4] w-full object-cover mt-10"
            />
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 border-t border-foreground/10 pt-10">
          {values.map(([label, text]) => (
            <div key={label}>
              <h3 className="mb-3 text-xs font-normal text-foreground/50 uppercase tracking-[0.14em]">
                {label}
              </h3>
              <p className="text-base text-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
