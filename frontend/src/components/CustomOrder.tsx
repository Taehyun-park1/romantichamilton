export default function CustomOrder() {
  const steps = [
    ['01', '상담', '원하는 제품, 사용 목적, 선물 여부를 먼저 확인합니다.'],
    ['02', '설계', '크기, 수납 방식, 색상, 금속 부자재를 함께 정합니다.'],
    ['03', '제작', '재단부터 마감까지 손작업으로 진행하고 중간 확인을 거칩니다.'],
    ['04', '전달', '관리 방법을 함께 안내하고 오래 쓰기 위한 수선 기준을 공유합니다.'],
  ];

  return (
    <section
      id="custom"
      className="scroll-mt-20 md:scroll-mt-24 py-24 md:py-36 bg-[#22352f] text-white"
    >
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-12 lg:gap-20 items-start">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[#d4b16f]">
              Custom Order
            </p>
            <h2 className="text-3xl md:text-5xl font-serif font-normal mb-6">
              취향과 사용 습관에 맞춘 하나의 제품
            </h2>
            <p className="max-w-2xl text-base md:text-lg text-white/70 leading-relaxed">
              Romantic Hamilton의 맞춤 제작은 단순히 이름을 새기는 과정이
              아닙니다. 매일 어떻게 들고, 어디에 두고, 무엇을 담을지까지
              고려해 구조를 정합니다.
            </p>
          </div>

          <div className="space-y-7">
            {steps.map(([number, title, description]) => (
              <div
                key={number}
                className="grid grid-cols-[4rem_1fr] gap-4 border-t border-white/15 pt-6"
              >
                <span className="font-serif text-3xl text-white/35">
                  {number}
                </span>
                <div>
                  <h3 className="mb-2 text-lg font-serif font-normal">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/65">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
