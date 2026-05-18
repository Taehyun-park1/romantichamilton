export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  colors: string[];
  badge?: 'NEW' | 'BEST' | 'CUSTOM';
  image: string;
  category: 'wallets' | 'bags' | 'desk' | 'gifts';
}

export const products: Product[] = [
  {
    id: 'prod-001',
    name: 'Minimalist Card Wallet',
    description: '카드 4장과 동전 수납이 가능한 미니멀한 지갑. 천연 베지터블 태닝 가죽 사용.',
    price: 89000,
    colors: ['#8B7355', '#5C4A42', '#A67C6B'],
    badge: 'BEST',
    image: '/manus-storage/product-wallet-1_cf3a6d44.jpg',
    category: 'wallets',
  },
  {
    id: 'prod-002',
    name: 'Bifold Leather Wallet',
    description: '지폐, 카드, 동전을 모두 수납할 수 있는 클래식한 이중 지갑. 손바느질로 제작.',
    price: 129000,
    colors: ['#5C4A42', '#8B7355', '#D4AF7F'],
    badge: 'NEW',
    image: '/manus-storage/product-wallet-2_0573a5bb.jpg',
    category: 'wallets',
  },
  {
    id: 'prod-003',
    name: 'Leather Key Ring',
    description: '열쇠 3-4개를 수납할 수 있는 소형 키링. 가죽 끈과 황동 고리로 제작.',
    price: 45000,
    colors: ['#8B7355', '#A67C6B'],
    image: '/manus-storage/product-wallet-3_a4bd4006.jpg',
    category: 'gifts',
  },
  {
    id: 'prod-004',
    name: 'Crossbody Leather Bag',
    description: '일상 속 필수품을 담을 수 있는 크로스바디 백. 조절 가능한 가죽 스트랩.',
    price: 249000,
    colors: ['#5C4A42', '#8B7355'],
    badge: 'BEST',
    image: '/manus-storage/product-bag-1_4019bab7.jpg',
    category: 'bags',
  },
  {
    id: 'prod-005',
    name: 'Leather Notebook Cover',
    description: 'A5 사이즈 노트북을 보호하는 가죽 커버. 내부 포켓과 펜 홀더 포함.',
    price: 75000,
    colors: ['#8B7355', '#5C4A42', '#A67C6B', '#D4AF7F'],
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
    category: 'desk',
  },
  {
    id: 'prod-006',
    name: 'Apple Watch Leather Strap',
    description: '애플워치 40mm/44mm용 가죽 밴드. 스테인리스 스틸 버클 사용.',
    price: 65000,
    colors: ['#8B7355', '#5C4A42'],
    badge: 'NEW',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
    category: 'gifts',
  },
  {
    id: 'prod-007',
    name: 'Leather Desk Pad',
    description: '책상 위 마우스와 키보드를 보호하는 가죽 데스크 패드. 방수 처리됨.',
    price: 149000,
    colors: ['#5C4A42', '#8B7355'],
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
    category: 'desk',
  },
  {
    id: 'prod-008',
    name: 'Personalized Leather Journal',
    description: '이름 각인이 가능한 가죽 저널. 맞춤 제작으로 특별한 선물로 완벽.',
    price: 95000,
    colors: ['#8B7355', '#5C4A42', '#A67C6B'],
    badge: 'CUSTOM',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
    category: 'gifts',
  },
];

export interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  slug: string;
}

export const categories: Category[] = [
  {
    id: 'cat-001',
    name: 'Wallets',
    description: '일상을 함께하는 지갑. 시간이 지날수록 깊어지는 가죽의 결을 느껴보세요.',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=400&fit=crop',
    slug: 'wallets',
  },
  {
    id: 'cat-002',
    name: 'Bags',
    description: '손으로 만든 가죽 가방. 매일의 여정을 함께할 신뢰할 수 있는 파트너.',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=400&fit=crop',
    slug: 'bags',
  },
  {
    id: 'cat-003',
    name: 'Desk Accessories',
    description: '작업 공간을 품격 있게 만드는 가죽 소품들. 기능성과 미학의 완벽한 조화.',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=400&fit=crop',
    slug: 'desk',
  },
  {
    id: 'cat-004',
    name: 'Custom Gifts',
    description: '특별한 사람을 위한 맞춤 선물. 이름 각인과 색상 선택으로 유일한 선물을 만드세요.',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=400&fit=crop',
    slug: 'gifts',
  },
];

export interface Workshop {
  id: string;
  name: string;
  description: string;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  image: string;
}

export const workshops: Workshop[] = [
  {
    id: 'ws-001',
    name: 'Card Wallet Making',
    description: '가죽 한 장으로 만드는 카드 지갑. 기초 기술을 배우고 나만의 지갑을 완성하세요.',
    duration: '2시간',
    level: 'beginner',
    price: 79000,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
  },
  {
    id: 'ws-002',
    name: 'Leather Bag Workshop',
    description: '크로스바디 백을 직접 만드는 심화 클래스. 가죽 선택부터 마무리까지 배웁니다.',
    duration: '4시간',
    level: 'intermediate',
    price: 149000,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
  },
  {
    id: 'ws-003',
    name: 'Couple Leather Class',
    description: '두 사람이 함께 만드는 특별한 경험. 서로 선물할 수 있는 아이템을 제작합니다.',
    duration: '3시간',
    level: 'beginner',
    price: 149000,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
  },
  {
    id: 'ws-004',
    name: 'Gift Customization Class',
    description: '특별한 선물을 위한 맞춤 클래스. 이름 각인과 색상 선택으로 유일한 선물을 만듭니다.',
    duration: '2.5시간',
    level: 'beginner',
    price: 99000,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
  },
];

export interface Journal {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  image: string;
  content: string;
}

export const journals: Journal[] = [
  {
    id: 'journal-001',
    title: '베지터블 가죽이 시간이 지나며 변하는 방식',
    excerpt: '천연 가죽은 사용할수록 색이 짙어지고 질감이 부드러워집니다. 이것이 에이징의 매력입니다.',
    date: '2026년 5월 10일',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=400&fit=crop',
    content: `천연 베지터블 태닝 가죽은 시간이 지나면서 자연스러운 변화를 겪습니다. 
    
처음에는 밝은 갈색이던 가죽이 햇빛에 노출되면서 점차 진한 색으로 변해갑니다. 이를 에이징이라고 부르는데, 이는 가죽의 품질이 떨어지는 것이 아니라 더욱 깊어지는 과정입니다.

또한 사용 흔적이 남으면서 가죽 표면에 독특한 패턴이 생깁니다. 이 패턴은 사용자의 생활 방식을 담은 일종의 서명과 같습니다.

우리는 이런 변화를 "가죽의 숨결"이라고 부릅니다. 빠르게 소비되는 제품이 아니라, 시간과 함께 성장하는 물건을 만드는 것이 우리의 철학입니다.`,
  },
  {
    id: 'journal-002',
    title: '좋은 지갑을 고르는 기준',
    excerpt: '지갑은 단순한 물건이 아닙니다. 일상을 함께하는 신뢰할 수 있는 파트너입니다.',
    date: '2026년 5월 3일',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=400&fit=crop',
    content: `좋은 지갑을 선택하는 것은 생각보다 중요한 결정입니다.

첫째, 재질입니다. 천연 가죽은 내구성이 우수하고 시간이 지나면서 더욱 아름다워집니다.

둘째, 구조입니다. 필요한 카드와 지폐를 효율적으로 담을 수 있으면서도 과하지 않은 두께를 유지해야 합니다.

셋째, 손바느질입니다. 기계 봉제보다 손바느질은 내구성이 뛰어나고 수리가 용이합니다.

마지막으로 가장 중요한 것은 감정입니다. 그 지갑을 만졌을 때, 들었을 때 느껴지는 감정이 중요합니다. 좋은 지갑은 단순히 기능적일 뿐만 아니라 감정적인 연결을 만들어냅니다.`,
  },
  {
    id: 'journal-003',
    title: '선물용 가죽제품 추천',
    excerpt: '특별한 사람에게 줄 선물을 고민하시나요? 가죽제품이 최고의 선택입니다.',
    date: '2026년 4월 26일',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=400&fit=crop',
    content: `선물은 마음을 담은 표현입니다. 그렇기에 선물로 줄 제품은 신중하게 선택해야 합니다.

가죽제품은 선물로 완벽한 이유가 여러 개입니다.

첫째, 오래갑니다. 빠르게 소비되지 않아 오랫동안 기억에 남습니다.

둘째, 개인화가 가능합니다. 이름 각인이나 색상 선택으로 유일한 선물을 만들 수 있습니다.

셋째, 감정을 담을 수 있습니다. 손으로 만든 가죽제품은 그 자체로 정성이 담긴 선물입니다.

우리는 모든 선물에 특별함을 더하기 위해 맞춤 제작 서비스를 제공합니다. 선물받는 사람의 이름을 각인하거나, 선호하는 색상을 선택할 수 있습니다.`,
  },
];
