export default function CustomOrder() {
  const steps = [
    { number: '01', title: '상담', description: '원하시는 제품과 디자인에 대해 상담합니다.' },
    { number: '02', title: '디자인 선택', description: '기존 디자인 중 선택하거나 새로운 디자인을 제안합니다.' },
    { number: '03', title: '가죽과 색상 선택', description: '천연 가죽의 종류와 색상을 선택합니다.' },
    { number: '04', title: '제작', description: '선택하신 사항에 따라 손으로 정성스럽게 제작합니다.' },
    { number: '05', title: '전달', description: '완성된 제품을 받으시고 오래 함께하세요.' },
  ];

  return (
    <section id="custom" className="py-32 md:py-48 bg-background">
      <div className="container">
        {/* Section Header */}
        <div className="mb-24 md:mb-32">
          <h2 className="text-3xl md:text-4xl font-serif font-normal text-foreground mb-4">
            Custom Order
          </h2>
          <p className="text-base text-foreground/60">
            당신의 이야기를 담은 유일한 가죽 제품을 만들어보세요
          </p>
        </div>

        {/* Process Steps */}
        <div className="space-y-16 md:space-y-20 mb-32">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-8 md:gap-12">
              <div className="flex-shrink-0">
                <div className="text-4xl md:text-5xl font-serif font-normal text-foreground/20">
                  {step.number}
                </div>
              </div>
              <div className="flex-1 pt-2">
                <h3 className="text-lg md:text-xl font-serif font-normal text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-base text-foreground/60 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <button className="btn-primary">
            맞춤 제작 문의하기
          </button>
        </div>
      </div>
    </section>
  );
}
