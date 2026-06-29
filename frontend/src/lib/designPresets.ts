export type SiteDesignPresetId =
  | 'default'
  | 'chuseok'
  | 'christmas'
  | 'seollal'
  | 'valentine';

type DesignVariables = Record<string, string>;

export interface DesignPreset {
  id: SiteDesignPresetId;
  name: string;
  season: string;
  description: string;
  variables: DesignVariables;
}

const defaultVariables: DesignVariables = {
  '--primary': '#22352F',
  '--primary-foreground': '#F7F2EA',
  '--sidebar-primary': '#182722',
  '--sidebar-primary-foreground': '#F5F1ED',
  '--chart-1': '#7C4F38',
  '--chart-2': '#22352F',
  '--chart-3': '#C9A35F',
  '--chart-4': '#516E79',
  '--chart-5': '#171311',
  '--background': '#F8F6F1',
  '--foreground': '#171311',
  '--card': '#FFFFFF',
  '--card-foreground': '#171311',
  '--popover': '#FFFFFF',
  '--popover-foreground': '#171311',
  '--secondary': '#E8DED0',
  '--secondary-foreground': '#171311',
  '--muted': '#D9D0C3',
  '--muted-foreground': '#5A5048',
  '--accent': '#A06A3E',
  '--accent-foreground': '#FFFFFF',
  '--destructive': '#8B4545',
  '--destructive-foreground': '#FFFFFF',
  '--border': '#E8DDD0',
  '--input': '#FFFFFF',
  '--ring': '#22352F',
  '--sidebar': '#F8F6F3',
  '--sidebar-foreground': '#2A2420',
  '--sidebar-accent': '#22352F',
  '--sidebar-accent-foreground': '#F5F1ED',
  '--sidebar-border': '#E8DDD0',
  '--sidebar-ring': '#22352F',
};

function createPreset(
  preset: Omit<DesignPreset, 'variables'> & {
    variables: Partial<DesignVariables>;
  }
): DesignPreset {
  const variables: DesignVariables = { ...defaultVariables };

  Object.entries(preset.variables).forEach(([name, value]) => {
    if (value) {
      variables[name] = value;
    }
  });

  return {
    ...preset,
    variables,
  };
}

export const designPresets: DesignPreset[] = [
  createPreset({
    id: 'default',
    name: '기본',
    season: '상시',
    description: '현재 Romantic Hamilton 기본 톤입니다.',
    variables: {},
  }),
  createPreset({
    id: 'chuseok',
    name: '추석',
    season: '가을 / 명절',
    description: '감, 밤, 한지 느낌의 차분한 가을 팔레트입니다.',
    variables: {
      '--primary': '#3A3228',
      '--primary-foreground': '#FFF8EA',
      '--sidebar-primary': '#3A3228',
      '--chart-1': '#9A5B2E',
      '--chart-2': '#51643B',
      '--chart-3': '#C49A45',
      '--chart-4': '#7B6A49',
      '--chart-5': '#2B241D',
      '--background': '#FAF3E4',
      '--foreground': '#211A14',
      '--secondary': '#E9D8B8',
      '--muted': '#D9C7A5',
      '--muted-foreground': '#665848',
      '--accent': '#9A5B2E',
      '--border': '#E1CBA6',
      '--ring': '#51643B',
      '--sidebar': '#FAF3E4',
      '--sidebar-accent': '#51643B',
    },
  }),
  createPreset({
    id: 'christmas',
    name: '크리스마스',
    season: '겨울 / 선물',
    description: '딥 그린과 와인 레드로 선물 시즌 분위기를 냅니다.',
    variables: {
      '--primary': '#1F3A32',
      '--primary-foreground': '#FFF7EF',
      '--sidebar-primary': '#1F3A32',
      '--chart-1': '#8B3435',
      '--chart-2': '#1F3A32',
      '--chart-3': '#C5A153',
      '--chart-4': '#6F7F69',
      '--chart-5': '#221817',
      '--background': '#F8F4EC',
      '--foreground': '#1E1715',
      '--secondary': '#E7DDCF',
      '--muted': '#D7CFC4',
      '--muted-foreground': '#665C54',
      '--accent': '#8B3435',
      '--border': '#E2D5C8',
      '--ring': '#1F3A32',
      '--sidebar': '#F8F4EC',
      '--sidebar-accent': '#8B3435',
    },
  }),
  createPreset({
    id: 'seollal',
    name: '설',
    season: '겨울 / 명절',
    description: '먹색과 청회색, 옅은 종이색으로 정돈한 명절 톤입니다.',
    variables: {
      '--primary': '#263844',
      '--primary-foreground': '#F8F4EA',
      '--sidebar-primary': '#263844',
      '--chart-1': '#8A5A44',
      '--chart-2': '#263844',
      '--chart-3': '#B28A4B',
      '--chart-4': '#6E8790',
      '--chart-5': '#191716',
      '--background': '#F7F4EA',
      '--foreground': '#181817',
      '--secondary': '#DDE4E2',
      '--muted': '#CDD6D5',
      '--muted-foreground': '#536166',
      '--accent': '#6E8790',
      '--border': '#D7D1C4',
      '--ring': '#263844',
      '--sidebar': '#F7F4EA',
      '--sidebar-accent': '#263844',
    },
  }),
  createPreset({
    id: 'valentine',
    name: '발렌타인',
    season: '2월 / 선물',
    description: '로즈 브라운과 부드러운 핑크 베이지 선물 팔레트입니다.',
    variables: {
      '--primary': '#4A2C2F',
      '--primary-foreground': '#FFF4F1',
      '--sidebar-primary': '#4A2C2F',
      '--chart-1': '#B45D64',
      '--chart-2': '#4A2C2F',
      '--chart-3': '#C8927A',
      '--chart-4': '#8A6560',
      '--chart-5': '#241516',
      '--background': '#FCF2EE',
      '--foreground': '#211414',
      '--secondary': '#EFD7D2',
      '--muted': '#DFC8C2',
      '--muted-foreground': '#6D5654',
      '--accent': '#B45D64',
      '--border': '#E8D0CA',
      '--ring': '#4A2C2F',
      '--sidebar': '#FCF2EE',
      '--sidebar-accent': '#B45D64',
    },
  }),
];

export function getDesignPreset(
  presetId: string | null | undefined
): DesignPreset {
  return (
    designPresets.find((preset) => preset.id === presetId) ?? designPresets[0]
  );
}

export function applyDesignPreset(presetId: string | null | undefined) {
  const preset = getDesignPreset(presetId);
  const root = document.documentElement;

  root.dataset.designPreset = preset.id;
  Object.entries(preset.variables).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
}
