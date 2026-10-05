export const PALETTE_HEX = [
  '#000000',
  '#FFFFFF',
  '#813338',
  '#75CEC8',
  '#8E3C97',
  '#56AC4D',
  '#2E2C9B',
  '#EDF171',
  '#8E5029',
  '#553800',
  '#C46C71',
  '#4A4A4A',
  '#7B7B7B',
  '#A9FF9F',
  '#706DEB',
  '#B2B2B2',
];

export const PALETTE_NAMES = [
  'black', 'white', 'red', 'cyan', 'purple', 'green', 'blue', 'yellow',
  'orange', 'brown', 'lt-red', 'dk-grey', 'grey', 'lt-green', 'lt-blue', 'lt-grey',
];

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export const PALETTE_RGB = PALETTE_HEX.map(hexToRgb);

export const C = {
  BLACK: 0,
  WHITE: 1,
  RED: 2,
  CYAN: 3,
  PURPLE: 4,
  GREEN: 5,
  BLUE: 6,
  YELLOW: 7,
  ORANGE: 8,
  BROWN: 9,
  LTRED: 10,
  DKGREY: 11,
  GREY: 12,
  LTGREEN: 13,
  LTBLUE: 14,
  LTGREY: 15,
};

export const UI = {
  BORDER: C.LTBLUE,
  BG: C.BLUE,
  FRAME_FG: C.LTBLUE,
  TITLE_FG: C.YELLOW,
  BODY_FG: C.LTBLUE,
  BODY_DIM: C.GREY,
  ACCENT: C.CYAN,
  WARN: C.LTRED,
};
