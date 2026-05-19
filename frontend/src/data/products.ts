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

export const rhImages = Array.from(
  { length: 12 },
  (_, index) => `/rh-images/rh-${String(index + 1).padStart(2, '0')}.png`
);

export const products: Product[] = [
  {
    id: 'prod-001',
    name: 'Romantic Card Wallet',
    description: '얇은 실루엣과 촘촘한 스티치가 돋보이는 데일리 카드 지갑입니다.',
    price: 89000,
    colors: ['#7C4F38', '#2F3A33', '#C9A35F'],
    badge: 'BEST',
    image: rhImages[1],
    category: 'wallets',
  },
  {
    id: 'prod-002',
    name: 'Hamilton Bifold Wallet',
    description: '지폐와 카드를 안정적으로 담는 클래식 반지갑입니다.',
    price: 129000,
    colors: ['#4A342C', '#76533D', '#C8B090'],
    badge: 'NEW',
    image: rhImages[2],
    category: 'wallets',
  },
  {
    id: 'prod-003',
    name: 'Signature Key Holder',
    description: '손에 잡히는 질감과 금속 장식의 균형을 살린 키 홀더입니다.',
    price: 45000,
    colors: ['#935F40', '#36473B'],
    image: rhImages[3],
    category: 'gifts',
  },
  {
    id: 'prod-004',
    name: 'Leather Daily Bag',
    description: '외출에 필요한 물건을 간결하게 담는 맞춤형 가죽 가방입니다.',
    price: 249000,
    colors: ['#5A3B2C', '#2F3A33'],
    badge: 'CUSTOM',
    image: rhImages[4],
    category: 'bags',
  },
  {
    id: 'prod-005',
    name: 'Desk Leather Tray',
    description: '책상 위 작은 물건을 정돈하는 단정한 가죽 트레이입니다.',
    price: 75000,
    colors: ['#8B5E3C', '#D3A95F', '#263C42'],
    image: rhImages[5],
    category: 'desk',
  },
  {
    id: 'prod-006',
    name: 'Personal Gift Set',
    description: '각인과 색상 선택으로 완성하는 선물용 가죽 세트입니다.',
    price: 149000,
    colors: ['#5E3A2E', '#B06F4A', '#2F4C46'],
    badge: 'CUSTOM',
    image: rhImages[6],
    category: 'gifts',
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
    name: 'Card Wallet Class',
    description: '가죽 재단, 엣지 마감, 손바느질을 차례로 익히는 입문 클래스입니다.',
    duration: '2시간',
    level: 'beginner',
    price: 79000,
    image: rhImages[7],
  },
  {
    id: 'ws-002',
    name: 'Couple Leather Class',
    description: '서로의 취향에 맞춘 작은 소품을 함께 완성하는 커플 클래스입니다.',
    duration: '3시간',
    level: 'beginner',
    price: 149000,
    image: rhImages[8],
  },
  {
    id: 'ws-003',
    name: 'Custom Order Session',
    description: '제품 형태와 가죽 색상, 각인까지 상담하며 맞춤 제작을 시작합니다.',
    duration: '1시간',
    level: 'intermediate',
    price: 0,
    image: rhImages[9],
  },
];
