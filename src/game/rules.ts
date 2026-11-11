export type RadioEventId = 'normal' | 'monsoon' | 'milkman_delayed' | 'diwali';

export type SpiceType = 'ginger' | 'cardamom' | 'tulsi_lemon';

export type TeaBaseType = 'milk_chai' | 'black_lemon_chai';

export type CupType = 'kulhad' | 'cutting_glass';

export type SnackType = 'parle_g' | 'samosa' | 'pakora' | 'mithai';

export type SugarLevel = 'low' | 'normal' | 'extra';

export type UpgradeId =
  | 'samosa'
  | 'pakora'
  | 'faster_stove'
  | 'larger_kettle'
  | 'lofi_radio'
  | 'brass_teapot'
  | 'marigold_lights'
  | 'diwali_mithai';

export interface UpgradeItem {
  id: UpgradeId;
  name: string;
  hindiSubtitle: string;
  cost: number;
  tipBonus: number;
  description: string;
  roleClue: string;
}

export const UPGRADE_CATALOG: UpgradeItem[] = [
  {
    id: 'samosa',
    name: 'Hot Samosa Basket',
    hindiSubtitle: 'Garam Punjabi Samosa',
    cost: 30,
    tipBonus: 5,
    description: 'Crispy golden pastry triangles stuffed with spiced potatoes and peas.',
    roleClue: 'Unlocks Samosa orders · +5 Coin Tip Bonus',
  },
  {
    id: 'faster_stove',
    name: 'High-Flame Gas Stove',
    hindiSubtitle: 'Tez Aanch Gas Chulha',
    cost: 45,
    tipBonus: 4,
    description: 'High-pressure brass burner jet that reduces chai boiling time by 45%.',
    roleClue: '45% Faster Boiling · +4 Coin Tip Bonus',
  },
  {
    id: 'pakora',
    name: 'Monsoon Pakora Platter',
    hindiSubtitle: 'Kurkure Pyaz Pakode',
    cost: 50,
    tipBonus: 8,
    description: 'Hot gram-flour onion and chili fritters, irresistible during monsoon downpours.',
    roleClue: 'Unlocks Pakora orders · +8 Coin Tip Bonus',
  },
  {
    id: 'lofi_radio',
    name: 'Vintage Lo-Fi Tube Radio',
    hindiSubtitle: 'Purana Sangeet Radio',
    cost: 55,
    tipBonus: 5,
    description: 'Warm vacuum-tube radio that plays soulful Indian lo-fi tracks and forecasts.',
    roleClue: 'Unlocks Lo-Fi Tracks · +5 Coin Tip Bonus',
  },
  {
    id: 'larger_kettle',
    name: 'Jumbo Brass Kettle (2x)',
    hindiSubtitle: 'Bada Peetal Kettle',
    cost: 65,
    tipBonus: 6,
    description: 'Double-capacity kettle that serves 2-cup VIP orders in one single pour.',
    roleClue: '2-Cup VIP Batch Brew · +6 Coin Tip Bonus',
  },
  {
    id: 'brass_teapot',
    name: 'Royal Brass Teapot',
    hindiSubtitle: 'Shahi Peetal Patila',
    cost: 80,
    tipBonus: 6,
    description: 'Heirloom hand-etched Moradabad brass vessel that brews faster and gleams on the stove.',
    roleClue: '3D Brass Samovar on Stove · +6 Coin Tip Bonus',
  },
  {
    id: 'marigold_lights',
    name: 'Marigold & Lantern Toran',
    hindiSubtitle: 'Genda Phool & Kandil',
    cost: 100,
    tipBonus: 10,
    description: 'Fresh orange and yellow marigold garlands with warm glowing evening lanterns.',
    roleClue: 'Decorates 3D Tapri Canopy · +10 Coin Tip Bonus',
  },
  {
    id: 'diwali_mithai',
    name: 'Festive Mithai Box',
    hindiSubtitle: 'Gulab Jamun & Jalebi',
    cost: 120,
    tipBonus: 15,
    description: 'Warm cardamom-syrup Gulab Jamuns and crispy saffron Jalebis for celebrations.',
    roleClue: 'Unlocks Festive Sweets · +15 Coin Tip Bonus',
  },
];

export type WholesaleResourceId = 'milk' | 'teaLeaves' | 'sugar' | 'gas';

export interface InventoryStock {
  milk: number;
  teaLeaves: number;
  sugar: number;
  gas: number;
}

export interface WholesaleItem {
  id: WholesaleResourceId;
  name: string;
  hindiName: string;
  unitsAdded: number;
  maxCap: number;
  cost: number;
  description: string;
}

export const WHOLESALE_CATALOG: WholesaleItem[] = [
  {
    id: 'milk',
    name: 'Full-Cream Dairy Milk',
    hindiName: 'Taaza Doodh Crate',
    unitsAdded: 5,
    maxCap: 15,
    cost: 8,
    description: 'Rich buffalo milk required for all Creamy Milk Chai orders.',
  },
  {
    id: 'teaLeaves',
    name: 'Assam CTC Tea Leaves',
    hindiName: 'Kadak Chai Patti',
    unitsAdded: 6,
    maxCap: 15,
    cost: 6,
    description: 'Aromatic upper-Assam tea granules for a deep amber decoction.',
  },
  {
    id: 'sugar',
    name: 'Crystal Cane Sugar',
    hindiName: 'Desi Cheeni Jar',
    unitsAdded: 6,
    maxCap: 15,
    cost: 5,
    description: 'Sweetens every cup to perfection on the sweet-spot meter.',
  },
  {
    id: 'gas',
    name: 'LPG Stove Cylinder',
    hindiName: 'Rasoi Gas Refill',
    unitsAdded: 6,
    maxCap: 15,
    cost: 7,
    description: 'Fuels the high-flame brass burner to boil masala chai.',
  },
];

export interface DayLedger {
  teasSoldToday: number;
  baseRevenueToday: number;
  tipsEarnedToday: number;
  penaltiesToday: number;
  customersTurnedAwayToday: number;
}

export interface RadioEventInfo {
  id: RadioEventId;
  title: string;
  stationName: string;
  announcement: string;
  effectSummary: string;
  tickerText: string;
}

export const RADIO_EVENTS: Record<RadioEventId, RadioEventInfo> = {
  normal: {
    id: 'normal',
    title: 'Classic 70s Melodies',
    stationName: 'All India Radio · Vividh Bharati',
    announcement: 'Sunny afternoon breeze! Classic 70s melodies float across the bustling bazaar.',
    effectSummary: 'Balanced demand · Milk Chai, Ginger & Cardamom',
    tickerText:
      '📻 Now playing: Classic 70s Melodies on Vividh Bharati · Sunny afternoon breeze across the stall · VIP regulars stopping by for fresh Masala Chai...',
  },
  monsoon: {
    id: 'monsoon',
    title: 'Monsoon Downpour',
    stationName: 'Akashvani Weather Desk',
    announcement: 'Sudden monsoon downpour with rolling thunder! 2x Surge for Strong Ginger Chai & Hot Pakoras!',
    effectSummary: '🌧 2x Demand for Ginger Chai & Pakoras · +5 Weather Bonus',
    tickerText:
      '📻 Weather Alert: Sudden Monsoon Downpour! Thunder & rain across the street · 2x Customer Demand for Strong Ginger Chai & Crispy Pakoras (+5 Weather Bonus!)...',
  },
  milkman_delayed: {
    id: 'milkman_delayed',
    title: 'Milkman Cycle Delayed',
    stationName: 'Mohalla Morning Bulletin',
    announcement: 'Local dairy delivery is running late at the railway crossing! Serving aromatic Black & Lemon Chai.',
    effectSummary: 'Black & Lemon Spiced Tea only (Saves Milk stock!)',
    tickerText:
      '📻 Mohalla Bulletin: Milkman cycle delayed at the railway crossing · Serving fragrant Tulsi & Lemon Black Tea today (Zero Milk consumed + +4 Bonus!)...',
  },
  diwali: {
    id: 'diwali',
    title: 'Warm Evening Glow',
    stationName: 'Festive Utsav Broadcast',
    announcement: 'Warm evening lanterns and marigold lights are glowing across the street! Neighbors are celebrating generously.',
    effectSummary: '2x Double Coins on all orders & festive sweets!',
    tickerText:
      '📻 Evening Broadcast: Warm festive lanterns & classic ghazals on the airwaves · 2x Double Coins on every cup served tonight!...',
  },
};

export interface CustomerAppearance {
  skinColor: string;
  outfitPrimary: string;
  outfitSecondary: string;
  headwear: 'none' | 'gandhi_cap' | 'turban' | 'saree_pallu' | 'shawl';
  glasses: boolean;
  mustache: boolean;
  bindi: boolean;
}

export interface CustomerOrder {
  id: string;
  customerIndex: number;
  name: string;
  role: string;
  isVip: boolean;
  cupsCount: 1 | 2;
  sugarLevel: SugarLevel;
  memoryDurationSeconds: number;
  greeting: string;
  thankYou: string;
  spice: SpiceType;
  teaBase: TeaBaseType;
  cup: CupType;
  snack: SnackType;
  baseCoins: number;
  appearance: CustomerAppearance;
}

export type PourQuality = 'pending' | 'perfect' | 'good' | 'spilled';

export interface StationProgress {
  spiceSelected: SpiceType;
  crushCount: number; // 0 to 3
  crushProgress: number; // 0 to 100 for Masala Mortar minigame
  masalaTimerRemaining: number; // 12s aroma window before water boils
  masalaFreshBonus: boolean;
  waterAdded: boolean;
  teaLeavesAdded: boolean;
  milkOrLemonAdded: boolean;
  spicesInPot: boolean;
  boilProgress: number; // 0 to 100
  isBoiled: boolean;
  pouredCup: CupType | null;
  pourQuality: PourQuality;
  hasSpillOnCounter: boolean;
  spillErrorType: 'spill' | 'too_sweet' | null;
  platedSnack: SnackType | null;
  isServed: boolean;
  vipMemoryRemaining: number; // 5s countdown for VIP customers
  vipOrderHidden: boolean;
  vipPeeked: boolean;
}

export interface TapriGameState {
  coins: number;
  totalCoinsEarned: number;
  day: number;
  dayTimerSeconds: number; // 180s (3-minute day)
  customersServedTotal: number;
  customersServedToday: number;
  customersPerDay: number;
  radioEvent: RadioEventId;
  unlockedUpgrades: UpgradeId[];
  inventory: InventoryStock;
  ledger: DayLedger;
  currentCustomer: CustomerOrder;
  station: StationProgress;
  lastEarnedCoins: number;
}

export const SPICE_LABELS: Record<SpiceType, { name: string; hindi: string }> = {
  ginger: { name: 'Fresh Ginger', hindi: 'Adrak' },
  cardamom: { name: 'Green Cardamom', hindi: 'Elaichi' },
  tulsi_lemon: { name: 'Tulsi & Lemon', hindi: 'Tulsi-Nimbu' },
};

export const CUP_LABELS: Record<CupType, { name: string; hindi: string }> = {
  kulhad: { name: 'Clay Kulhad', hindi: 'Mitti Kulhad' },
  cutting_glass: { name: 'Cutting Glass', hindi: 'Kanch Glass' },
};

export const SNACK_LABELS: Record<SnackType, { name: string; hindi: string }> = {
  parle_g: { name: 'Parle-G Biscuits', hindi: 'Gluco Biscuit' },
  samosa: { name: 'Hot Samosa', hindi: 'Aloo Samosa' },
  pakora: { name: 'Crispy Pakoras', hindi: 'Pyaz Pakoda' },
  mithai: { name: 'Festive Mithai', hindi: 'Gulab Jamun' },
};

export const SUGAR_LABELS: Record<SugarLevel, string> = {
  low: 'Low Sugar',
  normal: 'Normal Sugar',
  extra: 'Kadak Sweet',
};

interface CustomerTemplate {
  name: string;
  role: string;
  preferredSpice: SpiceType;
  preferredCup: CupType;
  appearance: CustomerAppearance;
  greetings: Record<RadioEventId, (spiceName: string, cupName: string, snackName: string) => string>;
  thankYous: string[];
}

const CUSTOMER_TEMPLATES: CustomerTemplate[] = [
  {
    name: 'Sharma Uncle',
    role: 'Retired Postmaster',
    preferredSpice: 'ginger',
    preferredCup: 'kulhad',
    appearance: {
      skinColor: '#d99b72',
      outfitPrimary: '#f4ecd8',
      outfitSecondary: '#8c4a27',
      headwear: 'gandhi_cap',
      glasses: true,
      mustache: true,
      bindi: false,
    },
    greetings: {
      normal: (s, c, sn) =>
        `Good morning beta! My knees are feeling the morning chill—could I get a strong ${s} Chai in a ${c} with ${sn}?`,
      monsoon: (s, c, sn) =>
        `Look at those monsoon clouds! Nothing beats your steaming ${s} Chai in a ${c} and crisp ${sn} on a rainy day!`,
      milkman_delayed: (s, c, sn) =>
        `Heard the milkman got stuck at the railway phatak! No rush at all—a warm Black ${s} Tea in a ${c} with ${sn} will be wonderful.`,
      diwali: (s, c, sn) =>
        `Shubh Deepawali! The whole lane smells so festive. Let us celebrate with a royal ${s} Chai in a ${c} and ${sn}!`,
    },
    thankYous: [
      'Aha! That first sip of ginger warmth went straight to the soul. God bless you!',
      'Just like the tea at the old railway station in 1978. Pure bliss!',
    ],
  },
  {
    name: 'Mrs. Deshmukh',
    role: 'VIP Classical Maestro',
    preferredSpice: 'cardamom',
    preferredCup: 'cutting_glass',
    appearance: {
      skinColor: '#dfab83',
      outfitPrimary: '#c84b31',
      outfitSecondary: '#eab308',
      headwear: 'saree_pallu',
      glasses: true,
      mustache: false,
      bindi: true,
    },
    greetings: {
      normal: (s, c, sn) =>
        `VIP Order: Two fragrant ${s} Chais in ${c} (low sugar), paired with ${sn}! Remember it for 2x Tips!`,
      monsoon: (s, c, sn) =>
        `VIP Monsoon Order: Two steaming ${s} Chais in ${c} with hot ${sn}! Memorize before this bubble fades!`,
      milkman_delayed: (s, c, sn) =>
        `VIP Order: Two light Lemon & ${s} Black Teas in ${c} with ${sn} for my music troupe!`,
      diwali: (s, c, sn) =>
        `VIP Diwali Order: Two festive ${s} Chais in ${c} with ${sn}! Serve from memory for double festive tips!`,
    },
    thankYous: [
      'Incredible memory and freshly crushed masala! Here is a double VIP tip!',
      'So comforting and accurate! My students will hear a sweeter melody today!',
    ],
  },
  {
    name: 'Sardar Harjinder Ji',
    role: 'Bookshop Owner',
    preferredSpice: 'ginger',
    preferredCup: 'kulhad',
    appearance: {
      skinColor: '#d4946a',
      outfitPrimary: '#2b580c',
      outfitSecondary: '#f59e0b',
      headwear: 'turban',
      glasses: false,
      mustache: true,
      bindi: false,
    },
    greetings: {
      normal: (s, c, sn) =>
        `Sat Sri Akal! Just opened the bookshop across the street. Ready for a kadak ${s} Chai in a ${c} and ${sn}!`,
      monsoon: (s, c, sn) =>
        `What glorious rain! Reading poetry by the window calls for extra ${s} Chai in a ${c} and hot ${sn}!`,
      milkman_delayed: (s, c, sn) =>
        `Don't worry about the milkman! Brew me a brisk spiced ${s} Black Tea in a ${c} with ${sn}.`,
      diwali: (s, c, sn) =>
        `Diwali greetings to the finest chaiwala in town! Bring on a celebratory ${s} Chai in a ${c} with ${sn}!`,
    },
    thankYous: [
      'Wah! Earthy clay kulhad and freshly pounded spices—10 out of 10!',
      'Warm tea and warm company! Keep the change for the gullak, beta.',
    ],
  },
  {
    name: 'Inspector Verma (VIP)',
    role: 'VIP Bazaar Inspector',
    preferredSpice: 'ginger',
    preferredCup: 'cutting_glass',
    appearance: {
      skinColor: '#c98860',
      outfitPrimary: '#0f766e',
      outfitSecondary: '#fbbf24',
      headwear: 'saree_pallu',
      glasses: false,
      mustache: false,
      bindi: true,
    },
    greetings: {
      normal: (s, c, sn) =>
        `VIP Order: Two strong ${s} Chais in ${c} (low sugar) with ${sn}! Memorize in 5 seconds for 2x Tips!`,
      monsoon: (s, c, sn) =>
        `VIP Downpour Order: Two kadak ${s} Chais in ${c} and crispy ${sn}! Don't forget the recipe!`,
      milkman_delayed: (s, c, sn) =>
        `VIP Order: Two herbal ${s} Black Teas in ${c} with ${sn} while the milkman is away!`,
      diwali: (s, c, sn) =>
        `VIP Diwali Order: Two special ${s} Chais in ${c} with ${sn}! Double tips for sharp memory!`,
    },
    thankYous: [
      'Spot-on memory! You remembered every single detail—enjoy double VIP tips!',
      'Finest tapri on the street! Here is an extra reward for your precision!',
    ],
  },
  {
    name: 'Professor Chatterjee',
    role: 'History Professor (Retd.)',
    preferredSpice: 'tulsi_lemon',
    preferredCup: 'cutting_glass',
    appearance: {
      skinColor: '#d19268',
      outfitPrimary: '#7c2d12',
      outfitSecondary: '#fde68a',
      headwear: 'shawl',
      glasses: true,
      mustache: true,
      bindi: false,
    },
    greetings: {
      normal: (s, c, sn) =>
        `Subho Sakal! Before I read the morning newspaper, I would love an aromatic ${s} Chai in a ${c} with ${sn}.`,
      monsoon: (s, c, sn) =>
        `Rainy mornings remind me of old Calcutta! Let us have a steaming ${s} Chai in a ${c} with ${sn}.`,
      milkman_delayed: (s, c, sn) =>
        `Aha, Darjeeling-style Black Tea with ${s} in a ${c} and ${sn} is my absolute favourite anyway!`,
      diwali: (s, c, sn) =>
        `Shubho Deepabali! The lamps look splendid. May I have a festive ${s} Chai in a ${c} with ${sn}?`,
    },
    thankYous: [
      'Exquisite balance of spice and warmth! Better than the Coffee House!',
      'A truly civilized cup of tea. See you tomorrow morning!',
    ],
  },
];

const RADIO_CYCLE: RadioEventId[] = ['normal', 'monsoon', 'milkman_delayed', 'diwali'];

export function getRadioEventForCustomerIndex(customerCount: number): RadioEventId {
  const slot = Math.floor(Math.max(0, customerCount) / 3) % RADIO_CYCLE.length;
  return RADIO_CYCLE[slot];
}

export function getAvailableSnacks(unlockedUpgrades: UpgradeId[]): SnackType[] {
  const snacks: SnackType[] = ['parle_g'];
  if (unlockedUpgrades.includes('samosa')) snacks.push('samosa');
  if (unlockedUpgrades.includes('pakora')) snacks.push('pakora');
  if (unlockedUpgrades.includes('diwali_mithai')) snacks.push('mithai');
  return snacks;
}

export function generateCustomerOrder(
  customerIndex: number,
  radioEvent: RadioEventId,
  unlockedUpgrades: UpgradeId[],
): CustomerOrder {
  const template = CUSTOMER_TEMPLATES[customerIndex % CUSTOMER_TEMPLATES.length];
  const availableSnacks = getAvailableSnacks(unlockedUpgrades);

  // Odd customer indices are VIP Memory Customers!
  const isVip = customerIndex % 2 === 1;
  const cupsCount: 1 | 2 = isVip ? 2 : 1;
  const sugarLevels: SugarLevel[] = ['low', 'normal', 'extra'];
  const sugarLevel: SugarLevel = isVip ? 'low' : sugarLevels[customerIndex % sugarLevels.length];

  let spice: SpiceType = template.preferredSpice;
  if (radioEvent === 'monsoon') {
    // Monsoon downpour: 2x surge for strong ginger tea!
    spice = 'ginger';
  } else if (radioEvent === 'milkman_delayed') {
    spice = customerIndex % 2 === 0 ? 'tulsi_lemon' : 'ginger';
  } else if (radioEvent === 'diwali') {
    spice = customerIndex % 2 === 0 ? 'cardamom' : 'ginger';
  }

  const teaBase: TeaBaseType =
    radioEvent === 'milkman_delayed' ? 'black_lemon_chai' : 'milk_chai';

  const cup: CupType =
    customerIndex % 2 === 0
      ? template.preferredCup
      : template.preferredCup === 'kulhad'
        ? 'cutting_glass'
        : 'kulhad';

  let snack: SnackType = availableSnacks[customerIndex % availableSnacks.length];
  if (radioEvent === 'monsoon' && unlockedUpgrades.includes('pakora')) {
    snack = 'pakora';
  } else if (radioEvent === 'diwali' && unlockedUpgrades.includes('diwali_mithai')) {
    snack = 'mithai';
  } else if (unlockedUpgrades.includes('samosa') && customerIndex % 2 === 1) {
    snack = 'samosa';
  }

  const spiceLabel = SPICE_LABELS[spice].name;
  const cupLabel = CUP_LABELS[cup].name;
  const snackLabel = SNACK_LABELS[snack].name;

  const greeting = template.greetings[radioEvent](spiceLabel, cupLabel, snackLabel);
  const thankYou = template.thankYous[customerIndex % template.thankYous.length];

  return {
    id: `cust_${customerIndex}`,
    customerIndex,
    name: template.name,
    role: template.role,
    isVip,
    cupsCount,
    sugarLevel,
    memoryDurationSeconds: 5,
    greeting,
    thankYou,
    spice,
    teaBase,
    cup,
    snack,
    baseCoins: 10,
    appearance: template.appearance,
  };
}

export function createInitialStation(order: CustomerOrder): StationProgress {
  return {
    spiceSelected: order.spice,
    crushCount: 0,
    crushProgress: 0,
    masalaTimerRemaining: 12,
    masalaFreshBonus: true,
    waterAdded: false,
    teaLeavesAdded: false,
    milkOrLemonAdded: false,
    spicesInPot: false,
    boilProgress: 0,
    isBoiled: false,
    pouredCup: null,
    pourQuality: 'pending',
    hasSpillOnCounter: false,
    spillErrorType: null,
    platedSnack: null,
    isServed: false,
    vipMemoryRemaining: order.isVip ? order.memoryDurationSeconds : 0,
    vipOrderHidden: false,
    vipPeeked: false,
  };
}

export function createDefaultInventory(): InventoryStock {
  return {
    milk: 8,
    teaLeaves: 10,
    sugar: 10,
    gas: 10,
  };
}

export function createEmptyLedger(): DayLedger {
  return {
    teasSoldToday: 0,
    baseRevenueToday: 0,
    tipsEarnedToday: 0,
    penaltiesToday: 0,
    customersTurnedAwayToday: 0,
  };
}

export function createInitialGameState(saved?: Partial<TapriGameState>): TapriGameState {
  const customersServedTotal = saved?.customersServedTotal ?? 0;
  const unlockedUpgrades = saved?.unlockedUpgrades ?? [];
  const radioEvent = saved?.radioEvent ?? getRadioEventForCustomerIndex(customersServedTotal);
  const currentCustomer = generateCustomerOrder(customersServedTotal, radioEvent, unlockedUpgrades);

  return {
    coins: saved?.coins ?? 20,
    totalCoinsEarned: saved?.totalCoinsEarned ?? 20,
    day: saved?.day ?? 1,
    dayTimerSeconds: saved?.dayTimerSeconds ?? 180,
    customersServedTotal,
    customersServedToday: saved?.customersServedToday ?? 0,
    customersPerDay: saved?.customersPerDay ?? 5,
    radioEvent,
    unlockedUpgrades,
    inventory: saved?.inventory ?? createDefaultInventory(),
    ledger: saved?.ledger ?? createEmptyLedger(),
    currentCustomer,
    station: createInitialStation(currentCustomer),
    lastEarnedCoins: 0,
  };
}

export function crushSpiceStep(state: TapriGameState, spice?: SpiceType): TapriGameState {
  if (state.station.crushCount >= 3) {
    return state;
  }
  const chosenSpice = spice ?? state.currentCustomer.spice;
  const nextCrush = Math.min(3, state.station.crushCount + 1);
  const nextProgress = nextCrush >= 3 ? 100 : Math.round((nextCrush / 3) * 100);
  return {
    ...state,
    station: {
      ...state.station,
      spiceSelected: chosenSpice,
      crushCount: nextCrush,
      crushProgress: nextProgress,
      masalaFreshBonus: state.station.masalaTimerRemaining > 0,
    },
  };
}

// Supports rapid pestle dragging in the Advanced Masala Preparation Minigame
export function crushSpiceByDrag(
  state: TapriGameState,
  deltaProgress: number,
  spice?: SpiceType,
): TapriGameState {
  if (state.station.crushCount >= 3) {
    return state;
  }
  const chosenSpice = spice ?? state.currentCustomer.spice;
  const nextProgress = Math.min(100, Math.max(0, state.station.crushProgress + deltaProgress));
  const nextCrush = nextProgress >= 100 ? 3 : Math.min(2, Math.floor(nextProgress / 34));
  return {
    ...state,
    station: {
      ...state.station,
      spiceSelected: chosenSpice,
      crushProgress: nextProgress,
      crushCount: nextCrush,
      masalaFreshBonus: state.station.masalaTimerRemaining > 0,
    },
  };
}

export function isPrepComplete(station: StationProgress): boolean {
  return station.crushCount >= 3;
}

export function areAllIngredientsInPot(station: StationProgress): boolean {
  return (
    station.waterAdded &&
    station.teaLeavesAdded &&
    station.milkOrLemonAdded &&
    station.spicesInPot
  );
}

export function hasRequiredIngredientsForOrder(state: TapriGameState): {
  canMake: boolean;
  missing: WholesaleResourceId[];
} {
  const missing: WholesaleResourceId[] = [];
  if (state.currentCustomer.teaBase === 'milk_chai' && state.inventory.milk <= 0) {
    missing.push('milk');
  }
  if (state.inventory.teaLeaves <= 0) {
    missing.push('teaLeaves');
  }
  if (state.inventory.sugar <= 0) {
    missing.push('sugar');
  }
  if (state.inventory.gas <= 0) {
    missing.push('gas');
  }
  return { canMake: missing.length === 0, missing };
}

export function addBrewIngredientStep(
  state: TapriGameState,
  ingredient: 'water' | 'tea_leaves' | 'milk_or_lemon' | 'crushed_spices' | 'auto_next' = 'auto_next',
): TapriGameState {
  let nextState = state;
  if (nextState.station.crushCount < 3) {
    nextState = {
      ...nextState,
      station: {
        ...nextState.station,
        spiceSelected: nextState.currentCustomer.spice,
        crushCount: 3,
        crushProgress: 100,
      },
    };
  }

  const st = { ...nextState.station };
  const inv = { ...nextState.inventory };

  if (ingredient === 'water' || (ingredient === 'auto_next' && !st.waterAdded)) {
    st.waterAdded = true;
    inv.gas = Math.max(0, inv.gas - 1);
  } else if (ingredient === 'tea_leaves' || (ingredient === 'auto_next' && !st.teaLeavesAdded)) {
    st.teaLeavesAdded = true;
    inv.teaLeaves = Math.max(0, inv.teaLeaves - 1);
    inv.sugar = Math.max(0, inv.sugar - 1);
  } else if (ingredient === 'milk_or_lemon' || (ingredient === 'auto_next' && !st.milkOrLemonAdded)) {
    st.milkOrLemonAdded = true;
    if (nextState.currentCustomer.teaBase === 'milk_chai') {
      inv.milk = Math.max(0, inv.milk - 1);
    }
  } else if (ingredient === 'crushed_spices' || (ingredient === 'auto_next' && !st.spicesInPot)) {
    st.spicesInPot = true;
  } else if (ingredient === 'auto_next' && areAllIngredientsInPot(st) && !st.isBoiled) {
    st.boilProgress = Math.min(100, st.boilProgress + 50);
    if (st.boilProgress >= 100) {
      st.isBoiled = true;
    }
  }

  return {
    ...nextState,
    inventory: inv,
    station: st,
  };
}

export function advanceBoiling(state: TapriGameState, dtSeconds: number): TapriGameState {
  if (!areAllIngredientsInPot(state.station) || state.station.isBoiled) {
    return state;
  }
  let speedMultiplier = 40;
  if (state.unlockedUpgrades.includes('brass_teapot')) speedMultiplier += 15;
  if (state.unlockedUpgrades.includes('faster_stove')) speedMultiplier += 28;
  const nextProgress = Math.min(100, state.station.boilProgress + dtSeconds * speedMultiplier);
  return {
    ...state,
    station: {
      ...state.station,
      boilProgress: nextProgress,
      isBoiled: nextProgress >= 100,
    },
  };
}

// Prompt 1: Sweet-Spot Pouring & Sugar Meter Challenge
// Green sweet spot: 34 <= meterPosition <= 66 -> 'perfect' (+6 Tip Bonus)
// Amber good zone: 20..34 or 66..80 -> 'good'
// Red danger zone: < 20 ('spill') or > 80 ('too_sweet') -> deducts 3 coins & triggers counter spill requiring Wipe Cloth
export function evaluatePourMeterChallenge(
  state: TapriGameState,
  meterPosition: number,
): {
  nextState: TapriGameState;
  outcome: 'perfect' | 'good' | 'spill' | 'too_sweet';
  penaltyCoins: number;
} {
  if (!state.station.isBoiled) {
    return { nextState: state, outcome: 'good', penaltyCoins: 0 };
  }

  const clampedPos = Math.max(0, Math.min(100, meterPosition));
  const st = { ...state.station };
  const ledger = { ...state.ledger };

  if (clampedPos >= 34 && clampedPos <= 66) {
    st.pouredCup = state.currentCustomer.cup;
    st.pourQuality = 'perfect';
    st.hasSpillOnCounter = false;
    st.spillErrorType = null;
    return {
      nextState: { ...state, station: st },
      outcome: 'perfect',
      penaltyCoins: 0,
    };
  }

  if (clampedPos >= 20 && clampedPos <= 80) {
    st.pouredCup = state.currentCustomer.cup;
    st.pourQuality = 'good';
    st.hasSpillOnCounter = false;
    st.spillErrorType = null;
    return {
      nextState: { ...state, station: st },
      outcome: 'good',
      penaltyCoins: 0,
    };
  }

  // Red zone: Spill (< 20) or Too Sweet (> 80)
  const errorType: 'spill' | 'too_sweet' = clampedPos > 80 ? 'too_sweet' : 'spill';
  const penalty = 3;
  const nextCoins = Math.max(0, state.coins - penalty);
  ledger.penaltiesToday += penalty;

  st.pouredCup = state.currentCustomer.cup;
  st.pourQuality = 'spilled';
  st.hasSpillOnCounter = true;
  st.spillErrorType = errorType;

  return {
    nextState: {
      ...state,
      coins: nextCoins,
      ledger,
      station: st,
    },
    outcome: errorType,
    penaltyCoins: penalty,
  };
}

// Wipe Cloth tool cleans up counter spill so customer can be served
export function cleanCounterSpill(state: TapriGameState): TapriGameState {
  if (!state.station.hasSpillOnCounter) {
    return state;
  }
  return {
    ...state,
    station: {
      ...state.station,
      hasSpillOnCounter: false,
      spillErrorType: null,
      pourQuality: state.station.pourQuality === 'spilled' ? 'good' : state.station.pourQuality,
    },
  };
}

export function plateOrderStep(
  state: TapriGameState,
  action: { cup?: CupType; snack?: SnackType } | 'auto_plate' = 'auto_plate',
): TapriGameState {
  const st = { ...state.station };
  if (!st.isBoiled) {
    return state;
  }

  // If there's a spill on the counter, auto_plate cleans it first
  if (st.hasSpillOnCounter && action === 'auto_plate') {
    return cleanCounterSpill(state);
  }

  if (action === 'auto_plate') {
    if (!st.pouredCup) {
      st.pouredCup = state.currentCustomer.cup;
      if (st.pourQuality === 'pending') st.pourQuality = 'good';
    } else if (!st.platedSnack) {
      st.platedSnack = state.currentCustomer.snack;
    }
  } else {
    if (action.cup) {
      st.pouredCup = action.cup;
      if (st.pourQuality === 'pending') st.pourQuality = 'good';
    }
    if (action.snack) {
      st.platedSnack = action.snack;
    }
  }

  return {
    ...state,
    station: st,
  };
}

export function isOrderReadyToServe(station: StationProgress): boolean {
  return (
    station.crushCount >= 3 &&
    station.isBoiled &&
    station.pouredCup !== null &&
    station.platedSnack !== null &&
    !station.hasSpillOnCounter
  );
}

export function hasAnyStationProgress(station: StationProgress): boolean {
  return (
    station.crushCount > 0 ||
    station.crushProgress > 0 ||
    station.waterAdded ||
    station.teaLeavesAdded ||
    station.milkOrLemonAdded ||
    station.spicesInPot ||
    station.boilProgress > 0 ||
    station.pouredCup !== null ||
    station.platedSnack !== null ||
    station.hasSpillOnCounter
  );
}

export function resetCurrentPreparation(state: TapriGameState): TapriGameState {
  return {
    ...state,
    station: createInitialStation(state.currentCustomer),
  };
}

// Advances VIP 5-second memory fade, Masala aroma countdown, and 3-minute Day clock
export function tickGameplayTimers(state: TapriGameState, dtSeconds: number): TapriGameState {
  const st = { ...state.station };
  let changed = false;

  if (state.currentCustomer.isVip && !st.vipOrderHidden && st.vipMemoryRemaining > 0) {
    st.vipMemoryRemaining = Math.max(0, st.vipMemoryRemaining - dtSeconds);
    if (st.vipMemoryRemaining <= 0) {
      st.vipOrderHidden = true;
    }
    changed = true;
  }

  if (st.crushCount < 3 && st.masalaTimerRemaining > 0) {
    st.masalaTimerRemaining = Math.max(0, st.masalaTimerRemaining - dtSeconds);
    if (st.masalaTimerRemaining <= 0) {
      st.masalaFreshBonus = false;
    }
    changed = true;
  }

  const nextDayTimer = Math.max(0, state.dayTimerSeconds - dtSeconds);
  if (nextDayTimer !== state.dayTimerSeconds) {
    changed = true;
  }

  if (!changed) return state;
  return {
    ...state,
    dayTimerSeconds: nextDayTimer,
    station: st,
  };
}

export function peekVipOrder(state: TapriGameState): TapriGameState {
  if (!state.currentCustomer.isVip || !state.station.vipOrderHidden) {
    return state;
  }
  return {
    ...state,
    station: {
      ...state.station,
      vipOrderHidden: false,
      vipMemoryRemaining: 6,
      vipPeeked: true,
    },
  };
}

export function buyWholesaleStock(
  state: TapriGameState,
  resourceId: WholesaleResourceId,
): { nextState: TapriGameState; success: boolean } {
  const item = WHOLESALE_CATALOG.find((w) => w.id === resourceId);
  if (!item || state.coins < item.cost) {
    return { nextState: state, success: false };
  }
  const currentAmt = state.inventory[resourceId];
  if (currentAmt >= item.maxCap) {
    return { nextState: state, success: false };
  }
  const nextInventory: InventoryStock = {
    ...state.inventory,
    [resourceId]: Math.min(item.maxCap, currentAmt + item.unitsAdded),
  };
  return {
    nextState: {
      ...state,
      coins: state.coins - item.cost,
      inventory: nextInventory,
    },
    success: true,
  };
}

export function turnAwayCustomer(state: TapriGameState): TapriGameState {
  const nextIdx = state.customersServedTotal + 1;
  const nextRadio = getRadioEventForCustomerIndex(nextIdx);
  const nextCust = generateCustomerOrder(nextIdx, nextRadio, state.unlockedUpgrades);
  return {
    ...state,
    customersServedTotal: nextIdx,
    radioEvent: nextRadio,
    currentCustomer: nextCust,
    station: createInitialStation(nextCust),
    ledger: {
      ...state.ledger,
      customersTurnedAwayToday: state.ledger.customersTurnedAwayToday + 1,
    },
  };
}

export function calculateOrderCoins(
  order: CustomerOrder,
  radioEvent: RadioEventId,
  unlockedUpgrades: UpgradeId[],
  station?: StationProgress,
): {
  base: number;
  eventBonus: number;
  upgradeBonus: number;
  skillBonus: number;
  total: number;
} {
  const base = order.baseCoins;
  let upgradeBonus = 0;

  if (order.snack === 'samosa' && unlockedUpgrades.includes('samosa')) {
    upgradeBonus += 5;
  }
  if (order.snack === 'pakora' && unlockedUpgrades.includes('pakora')) {
    upgradeBonus += 8;
  }
  if (order.snack === 'mithai' && unlockedUpgrades.includes('diwali_mithai')) {
    upgradeBonus += 15;
  }
  if (unlockedUpgrades.includes('brass_teapot')) {
    upgradeBonus += 6;
  }
  if (unlockedUpgrades.includes('faster_stove')) {
    upgradeBonus += 4;
  }
  if (unlockedUpgrades.includes('larger_kettle')) {
    upgradeBonus += 6;
  }
  if (unlockedUpgrades.includes('lofi_radio')) {
    upgradeBonus += 5;
  }
  if (unlockedUpgrades.includes('marigold_lights')) {
    upgradeBonus += 10;
  }

  let eventBonus = 0;
  if (radioEvent === 'monsoon') {
    eventBonus = 5;
  } else if (radioEvent === 'milkman_delayed') {
    eventBonus = 4;
  } else if (radioEvent === 'diwali') {
    eventBonus = base + upgradeBonus;
  }

  let skillBonus = 0;
  if (station) {
    // Perfect Sweet-Spot Pour Bonus
    if (station.pourQuality === 'perfect') {
      skillBonus += 6;
    }
    // VIP Memory Master 2x Tip Bonus (when VIP order was hidden & recalled from memory without peeking)
    if (order.isVip && station.vipOrderHidden && !station.vipPeeked) {
      skillBonus += 8;
    }
    // Late Masala Aroma drop if timer expired before crushing
    if (!station.masalaFreshBonus && station.masalaTimerRemaining <= 0) {
      skillBonus = Math.max(0, skillBonus - 2);
    }
  }

  const total = base + upgradeBonus + eventBonus + skillBonus;
  return { base, eventBonus, upgradeBonus, skillBonus, total };
}

export function completeServeCustomer(state: TapriGameState): {
  nextState: TapriGameState;
  earnedCoins: number;
  dayCompleted: boolean;
} {
  const reward = calculateOrderCoins(
    state.currentCustomer,
    state.radioEvent,
    state.unlockedUpgrades,
    state.station,
  );
  const nextServedTotal = state.customersServedTotal + 1;
  const nextServedToday = state.customersServedToday + 1;
  const dayCompleted =
    nextServedToday >= state.customersPerDay || state.dayTimerSeconds <= 0;

  const nextRadioEvent = getRadioEventForCustomerIndex(nextServedTotal);
  const nextCustomer = generateCustomerOrder(
    nextServedTotal,
    nextRadioEvent,
    state.unlockedUpgrades,
  );

  const tipsAdded = reward.eventBonus + reward.upgradeBonus + reward.skillBonus;
  const nextLedger: DayLedger = {
    ...state.ledger,
    teasSoldToday: state.ledger.teasSoldToday + state.currentCustomer.cupsCount,
    baseRevenueToday: state.ledger.baseRevenueToday + reward.base,
    tipsEarnedToday: state.ledger.tipsEarnedToday + tipsAdded,
  };

  const nextState: TapriGameState = {
    ...state,
    coins: state.coins + reward.total,
    totalCoinsEarned: state.totalCoinsEarned + reward.total,
    customersServedTotal: nextServedTotal,
    customersServedToday: nextServedToday,
    radioEvent: nextRadioEvent,
    ledger: nextLedger,
    currentCustomer: nextCustomer,
    station: createInitialStation(nextCustomer),
    lastEarnedCoins: reward.total,
  };

  return {
    nextState,
    earnedCoins: reward.total,
    dayCompleted,
  };
}

export function advanceToNextDay(state: TapriGameState): TapriGameState {
  const nextDay = state.day + 1;
  const nextCustomer = generateCustomerOrder(
    state.customersServedTotal,
    state.radioEvent,
    state.unlockedUpgrades,
  );
  return {
    ...state,
    day: nextDay,
    dayTimerSeconds: 180,
    customersServedToday: 0,
    ledger: createEmptyLedger(),
    currentCustomer: nextCustomer,
    station: createInitialStation(nextCustomer),
  };
}

export function cycleRadioEventManually(state: TapriGameState): TapriGameState {
  const currentIdx = RADIO_CYCLE.indexOf(state.radioEvent);
  const nextEvent = RADIO_CYCLE[(currentIdx + 1) % RADIO_CYCLE.length];
  const updatedCustomer = generateCustomerOrder(
    state.customersServedTotal,
    nextEvent,
    state.unlockedUpgrades,
  );
  return {
    ...state,
    radioEvent: nextEvent,
    currentCustomer: updatedCustomer,
    station: createInitialStation(updatedCustomer),
  };
}

export function purchaseUpgrade(
  state: TapriGameState,
  upgradeId: UpgradeId,
): { nextState: TapriGameState; success: boolean } {
  if (state.unlockedUpgrades.includes(upgradeId)) {
    return { nextState: state, success: false };
  }
  const item = UPGRADE_CATALOG.find((u) => u.id === upgradeId);
  if (!item || state.coins < item.cost) {
    return { nextState: state, success: false };
  }
  const nextUnlocked = [...state.unlockedUpgrades, upgradeId];
  return {
    nextState: {
      ...state,
      coins: state.coins - item.cost,
      unlockedUpgrades: nextUnlocked,
    },
    success: true,
  };
}

export interface GuidedStepInfo {
  stationNumber: 1 | 2 | 3 | 4;
  stationName: string;
  buttonLabel: string;
  instruction: string;
}

export function getCurrentGuidedHint(state: TapriGameState): GuidedStepInfo {
  const st = state.station;
  const order = state.currentCustomer;
  const spiceName = SPICE_LABELS[order.spice].name;
  const cupName = CUP_LABELS[order.cup].name;
  const snackName = SNACK_LABELS[order.snack].name;

  if (st.crushCount < 3) {
    const remaining = 3 - st.crushCount;
    return {
      stationNumber: 1,
      stationName: 'Station 1 · Mortar & Pestle',
      buttonLabel: `Crush ${spiceName} (${st.crushCount}/3)`,
      instruction: `Tap or drag the Pestle ${remaining} more ${remaining === 1 ? 'time' : 'times'} to crush fresh ${spiceName}.`,
    };
  }

  if (!st.waterAdded) {
    return {
      stationNumber: 2,
      stationName: 'Station 2 · Brass Stove',
      buttonLabel: 'Pour Water into Pot',
      instruction: 'Add fresh water into the brass pot on the stove.',
    };
  }

  if (!st.teaLeavesAdded) {
    return {
      stationNumber: 2,
      stationName: 'Station 2 · Brass Stove',
      buttonLabel: 'Add Tea Leaves & Sugar',
      instruction: 'Add Assam tea leaves & sugar into the warm water.',
    };
  }

  if (!st.milkOrLemonAdded) {
    const milkLabel =
      order.teaBase === 'black_lemon_chai' ? 'Squeeze Fresh Lemon' : 'Pour Creamy Milk';
    return {
      stationNumber: 2,
      stationName: 'Station 2 · Brass Stove',
      buttonLabel: milkLabel,
      instruction:
        order.teaBase === 'black_lemon_chai'
          ? 'Milkman is delayed! Add fresh lemon juice for aromatic Black Tea.'
          : 'Pour rich milk into the simmering tea decoction.',
    };
  }

  if (!st.spicesInPot) {
    return {
      stationNumber: 2,
      stationName: 'Station 2 · Brass Stove',
      buttonLabel: `Add Crushed ${spiceName}`,
      instruction: `Drop your freshly crushed ${spiceName} into the brass pot.`,
    };
  }

  if (!st.isBoiled) {
    return {
      stationNumber: 2,
      stationName: 'Station 2 · Brass Stove',
      buttonLabel: `Simmering Chai (${Math.round(st.boilProgress)}%)`,
      instruction: 'Watch the chai turn golden and bubble on the brass burner!',
    };
  }

  if (st.hasSpillOnCounter) {
    return {
      stationNumber: 3,
      stationName: 'Station 3 · Spill Cleanup',
      buttonLabel: '🧹 Wipe Counter Spill',
      instruction: 'Oops, tea spilled on the counter! Use the Wipe Cloth before serving.',
    };
  }

  if (!st.pouredCup) {
    return {
      stationNumber: 3,
      stationName: 'Station 3 · Sweet-Spot Pour',
      buttonLabel: `Pour into ${cupName}`,
      instruction: `Stop the Pour Meter in the Green Zone for a Perfect Pour bonus!`,
    };
  }

  if (!st.platedSnack) {
    return {
      stationNumber: 3,
      stationName: 'Station 3 · Serving Tray',
      buttonLabel: `Add ${snackName}`,
      instruction: `Place ${snackName} beside the cup on the serving tray.`,
    };
  }

  return {
    stationNumber: 4,
    stationName: 'Ready to Serve!',
    buttonLabel: `Serve ${order.name}`,
    instruction: `Hand the warm tray to ${order.name} and collect your coins & tips!`,
  };
}
