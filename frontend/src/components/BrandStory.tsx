export default function BrandStory() {
  return (
    <section id="story" className="py-32 md:py-48 bg-background">
      <div className="container">
        {/* Main Story */}
        <div className="mb-32">
          <h2 className="text-3xl md:text-4xl font-serif font-normal text-foreground mb-12">
            About Romantic Hamilton
          </h2>

          <div className="max-w-3xl space-y-8 text-base md:text-lg leading-relaxed text-foreground/70">
            <p>
              빠르게 소비되는 물건보다 오래 쓰이는 물건을 만듭니다.
            </p>
            
            <p>
              가죽의 결, 손의 흔적, 사용하는 사람의 시간을 함께 남깁니다.
            </p>

            <p>
              천연 베지터블 태닝 가죽을 선택합니다. 이 가죽은 시간이 지나면서 자연스럽게 색이 변하고, 사용자의 생활 방식이 묻어납니다. 이를 에이징이라고 부르며, 이것이 우리 제품의 가장 큰 매력입니다.
            </p>

            <p>
              모든 제품은 손으로 바느질합니다. 기계 봉제보다 시간이 오래 걸리지만, 내구성이 뛰어나고 필요하면 수리도 가능합니다.
            </p>
          </div>
        </div>

        {/* Image */}
        <div className="mb-32">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663634998865/RWrBtmJLJrWD3LLgaKujjJ/product-showcase-46FkYGwn78x2U76t4Ecee8.webp"
            alt="Leather craftsmanship"
            className="w-full h-[400px] md:h-[550px] object-cover"
          />
        </div>

        {/* Key Values */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          <div>
            <h3 className="text-sm font-normal text-foreground/60 mb-3 uppercase tracking-wide">
              재료
            </h3>
            <p className="text-base font-normal text-foreground">
              베지터블 태닝 가죽
            </p>
          </div>
          <div>
            <h3 className="text-sm font-normal text-foreground/60 mb-3 uppercase tracking-wide">
              제작
            </h3>
            <p className="text-base font-normal text-foreground">
              손바느질
            </p>
          </div>
          <div>
            <h3 className="text-sm font-normal text-foreground/60 mb-3 uppercase tracking-wide">
              변화
            </h3>
            <p className="text-base font-normal text-foreground">
              에이징
            </p>
          </div>
          <div>
            <h3 className="text-sm font-normal text-foreground/60 mb-3 uppercase tracking-wide">
              철학
            </h3>
            <p className="text-base font-normal text-foreground">
              오래 쓰는 물건
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
