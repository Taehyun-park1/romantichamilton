-- Seed default Romantic Hamilton products into public.site_products.
-- Run this once in Supabase SQL Editor or DBeaver after creating site_products.

insert into public.site_products (
  id,
  name,
  description,
  price,
  colors,
  badge,
  image,
  category,
  is_active,
  sort_order
)
values
  (
    'prod-001',
    'Romantic Card Wallet',
    '얇은 실루엣과 촘촘한 스티치가 돋보이는 데일리 카드 지갑입니다.',
    89000,
    array['#7C4F38', '#2F3A33', '#C9A35F'],
    'BEST',
    '/rh-images/rh-02.png',
    'wallets',
    true,
    0
  ),
  (
    'prod-002',
    'Hamilton Bifold Wallet',
    '지폐와 카드를 안정적으로 담는 클래식 반지갑입니다.',
    129000,
    array['#4A342C', '#76533D', '#C8B090'],
    'NEW',
    '/rh-images/rh-03.png',
    'wallets',
    true,
    1
  ),
  (
    'prod-003',
    'Signature Key Holder',
    '손에 잡히는 질감과 금속 장식의 균형을 살린 키 홀더입니다.',
    45000,
    array['#935F40', '#36473B'],
    null,
    '/rh-images/rh-04.png',
    'gifts',
    true,
    2
  ),
  (
    'prod-004',
    'Leather Daily Bag',
    '외출에 필요한 물건을 간결하게 담는 맞춤형 가죽 가방입니다.',
    249000,
    array['#5A3B2C', '#2F3A33'],
    'CUSTOM',
    '/rh-images/rh-05.png',
    'bags',
    true,
    3
  ),
  (
    'prod-005',
    'Desk Leather Tray',
    '책상 위 작은 물건을 정돈하는 단정한 가죽 트레이입니다.',
    75000,
    array['#8B5E3C', '#D3A95F', '#263C42'],
    null,
    '/rh-images/rh-06.png',
    'desk',
    true,
    4
  ),
  (
    'prod-006',
    'Personal Gift Set',
    '각인과 색상 선택으로 완성하는 선물용 가죽 세트입니다.',
    149000,
    array['#5E3A2E', '#B06F4A', '#2F4C46'],
    'CUSTOM',
    '/rh-images/rh-07.png',
    'gifts',
    true,
    5
  )
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  colors = excluded.colors,
  badge = excluded.badge,
  image = excluded.image,
  category = excluded.category,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();
