import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { workshops as fallbackWorkshops } from '@/data/products';
import {
  isSupabaseConfigured,
  supabase,
  type WorkshopClass,
} from '@/lib/supabase';

function toWorkshopClass(
  workshop: (typeof fallbackWorkshops)[number],
  index: number
) {
  return {
    ...workshop,
    is_active: true,
    sort_order: index,
  } satisfies WorkshopClass;
}

export default function Workshop() {
  const [workshops, setWorkshops] = useState<WorkshopClass[]>(
    fallbackWorkshops.map(toWorkshopClass)
  );

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    let mounted = true;
    const supabaseClient = supabase;

    const loadWorkshops = async () => {
      const { data, error } = await supabaseClient
        .from('workshop_classes')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!mounted || error || !data || data.length === 0) return;

      setWorkshops(data as WorkshopClass[]);
    };

    void loadWorkshops();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section
      id="workshop"
      className="scroll-mt-20 bg-background py-24 md:scroll-mt-24 md:py-36"
    >
      <div className="container">
        <div className="mb-14 flex flex-col gap-6 md:mb-20 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
              Workshop
            </p>
            <h2 className="mb-4 text-3xl font-semibold text-foreground md:text-5xl">
              직접 만들고 오래 사용하는 시간
            </h2>
            <p className="max-w-2xl text-base text-foreground/65">
              가죽의 질감과 제작 과정을 가까이에서 경험할 수 있는 클래스입니다.
            </p>
          </div>
          <Link
            href="/reserve"
            className="btn-outline inline-flex w-fit items-center justify-center self-start md:self-auto"
          >
            클래스 예약하기
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-10">
          {workshops.map((workshop) => (
            <article key={workshop.id} className="group">
              <div className="relative mb-6 aspect-[4/5] overflow-hidden bg-secondary">
                <img
                  src={workshop.image}
                  alt={workshop.name}
                  className="h-full w-full object-cover image-hover"
                />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-foreground">
                {workshop.name}
              </h3>
              <p className="mb-5 text-sm leading-relaxed text-foreground/60">
                {workshop.description}
              </p>
              <div className="flex items-center justify-between border-t border-foreground/10 pt-4 text-sm text-foreground/60">
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
