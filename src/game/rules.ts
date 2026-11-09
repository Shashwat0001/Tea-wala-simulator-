export type RadioEventId = 'normal' | 'monsoon' | 'milkman_delayed' | 'diwali';

export type SpiceType = 'ginger' | 'cardamom' | 'tulsi_lemon';

export type TeaBaseType = 'milk_chai' | 'black_lemon_chai';

export type CupType = 'kulhad' | 'cutting_glass';

export type SnackType = 'parle_g' | 'samosa' | 'pakora' | 'mithai';

export type UpgradeId =
  | 'samosa'
  | 'pakora'
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
    id: 'pakora',
    name: 'Monsoon Pakora Platter',
    hindiSubtitle: 'Kurkure Pyaz Pakode',
    cost: 50,
    tipBonus: 8,
    description: 'Hot gram-flour onion and chili fritters, irresistible during monsoon showers.',
    roleClue: 'Unlocks Pakora orders · +8 Coin Tip Bonus',
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
    announcement: 'Good morning! Classic 70s melodies and a pleasant golden breeze float across the neighborhood.',
    effectSummary: 'Classic Milk Chai, Ginger & Cardamom favourites',
    tickerText:
      '📻 Now playing: Classic 70s Melodies on Vividh Bharati · Pleasant morning breeze across the stall · Customers waiting patiently with zero rush...',
  },
  monsoon: {
    id: 'monsoon',
    title: 'Gentle Monsoon Rain',
    stationName: 'Akashvani Weather Desk',
    announcement: 'Gentle monsoon rain is falling outside the stall! Everyone is craving hot Adrak Chai and crispy snacks.',
    effectSummary: 'Extra Ginger Chai & Pakoras · +5 Weather Tip Bonus',
    tickerText:
      '📻 Weather: Gentle monsoon rain expected across the bazaar · Neighbors craving steaming Fresh Ginger Chai & hot Pakoras (+5 Coin Tip Bonus!)...',
  },
  milkman_delayed: {
    id: 'milkman_delayed',
    title: 'Milkman Cycle Delayed',
    stationName: 'Mohalla Morning Bulletin',
    announcement: 'Local dairy delivery is running late at the railway crossing! Serving aromatic Black & Lemon Chai.',
    effectSummary: 'Black & Lemon Spiced Tea only (No Milk needed)',
    tickerText:
      '📻 Mohalla Bulletin: Milkman cycle delayed at the railway crossing · Serving fragrant Tulsi & Lemon Black Tea today (+4 Coin Tip Bonus!)...',
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
  greeting: string;
  thankYou: string;
  spice: SpiceType;
  teaBase: TeaBaseType;
  cup: CupType;
  snack: SnackType;
  baseCoins: number;
  appearance: CustomerAppearance;
}

export interface StationProgress {
  spiceSelected: SpiceType;
  crushCount: number; // 0 to 3
  waterAdded: boolean;
  teaLeavesAdded: boolean;
  milkOrLemonAdded: boolean;
  spicesInPot: boolean;
  boilProgress: number; // 0 to 100
  isBoiled: boolean;
  pouredCup: CupType | null;
  platedSnack: SnackType | null;
  isServed: boolean;
}

export interface TapriGameState {
  coins: number;
  totalCoinsEarned: number;
  day: number;
  customersServedTotal: number;
  customersServedToday: number;
  customersPerDay: number;
  radioEvent: RadioEventId;
  unlockedUpgrades: UpgradeId[];
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
    role: 'Classical Music Teacher',
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
        `Namaste! After morning riyaz, my throat loves your fragrant ${s} Chai in a ${c}, paired with ${sn}.`,
      monsoon: (s, c, sn) =>
        `The rain sounds like Raag Malhar today! Please brew me a soothing ${s} Chai in a ${c} with ${sn}.`,
      milkman_delayed: (s, c, sn) =>
        `No milk today? Actually, a light Lemon & ${s} Black Tea in a ${c} with ${sn} is marvellous for a singer's voice!`,
      diwali: (s, c, sn) =>
        `Happy Diwali beta! May your stall always prosper. Serve me a festive ${s} Chai in a ${c} with ${sn}!`,
    },
    thankYous: [
      'The aroma of freshly crushed cardamom is pure magic. Thank you, dear!',
      'So comforting and unhurried. My students will hear a sweeter melody today!',
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
    name: 'Kamla Mausi',
    role: 'Neighborhood Florist',
    preferredSpice: 'cardamom',
    preferredCup: 'kulhad',
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
        `Ram Ram beta! I have been stringing marigold garlands since dawn. Could I have a sweet ${s} Chai in a ${c} with ${sn}?`,
      monsoon: (s, c, sn) =>
        `The flowers are blooming in this rain, and I am shivering! Warm me up with ${s} Chai in a ${c} and ${sn}.`,
      milkman_delayed: (s, c, sn) =>
        `A light herbal ${s} Black Tea in a ${c} with ${sn} sounds so refreshing while the milkman is away!`,
      diwali: (s, c, sn) =>
        `Happy Diwali! Everyone bought marigolds today! Treat me to your special ${s} Chai in a ${c} with ${sn}!`,
    },
    thankYous: [
      'Bless your hands! There is so much love in every cup you pour.',
      'Now I have all the energy I need for the afternoon market!',
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

  let spice: SpiceType = template.preferredSpice;
  if (radioEvent === 'monsoon') {
    spice = 'ginger';
  } else if (radioEvent === 'milkman_delayed') {
    spice = customerIndex % 2 === 0 ? 'tulsi_lemon' : 'ginger';
  } else if (radioEvent === 'diwali') {
    spice = customerIndex % 2 === 0 ? 'cardamom' : 'ginger';
  }

  const teaBase: TeaBaseType =
    radioEvent === 'milkman_delayed' ? 'black_lemon_chai' : 'milk_chai';

  const cup: CupType =
    customerIndex % 2 === 0 ? template.preferredCup : template.preferredCup === 'kulhad' ? 'cutting_glass' : 'kulhad';

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
    waterAdded: false,
    teaLeavesAdded: false,
    milkOrLemonAdded: false,
    spicesInPot: false,
    boilProgress: 0,
    isBoiled: false,
    pouredCup: null,
    platedSnack: null,
    isServed: false,
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
    customersServedTotal,
    customersServedToday: saved?.customersServedToday ?? 0,
    customersPerDay: saved?.customersPerDay ?? 5,
    radioEvent,
    unlockedUpgrades,
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
  return {
    ...state,
    station: {
      ...state.station,
      spiceSelected: chosenSpice,
      crushCount: nextCrush,
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

export function addBrewIngredientStep(
  state: TapriGameState,
  ingredient: 'water' | 'tea_leaves' | 'milk_or_lemon' | 'crushed_spices' | 'auto_next' = 'auto_next',
): TapriGameState {
  // Ensure spices are crushed first; if a parent clicks the stove early, gently finish crushing for them or step through
  let nextState = state;
  if (nextState.station.crushCount < 3) {
    nextState = {
      ...nextState,
      station: {
        ...nextState.station,
        spiceSelected: nextState.currentCustomer.spice,
        crushCount: 3,
      },
    };
  }

  const st = { ...nextState.station };

  if (ingredient === 'water' || (ingredient === 'auto_next' && !st.waterAdded)) {
    st.waterAdded = true;
  } else if (ingredient === 'tea_leaves' || (ingredient === 'auto_next' && !st.teaLeavesAdded)) {
    st.teaLeavesAdded = true;
  } else if (ingredient === 'milk_or_lemon' || (ingredient === 'auto_next' && !st.milkOrLemonAdded)) {
    st.milkOrLemonAdded = true;
  } else if (ingredient === 'crushed_spices' || (ingredient === 'auto_next' && !st.spicesInPot)) {
    st.spicesInPot = true;
  } else if (ingredient === 'auto_next' && areAllIngredientsInPot(st) && !st.isBoiled) {
    // Clicking the boiling pot advances boil progress generously so tapping works too
    st.boilProgress = Math.min(100, st.boilProgress + 50);
    if (st.boilProgress >= 100) {
      st.isBoiled = true;
    }
  }

  return {
    ...nextState,
    station: st,
  };
}

export function advanceBoiling(state: TapriGameState, dtSeconds: number): TapriGameState {
  if (!areAllIngredientsInPot(state.station) || state.station.isBoiled) {
    return state;
  }
  const speedMultiplier = state.unlockedUpgrades.includes('brass_teapot') ? 55 : 40; // ~1.8s to 2.5s
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

export function plateOrderStep(
  state: TapriGameState,
  action: { cup?: CupType; snack?: SnackType } | 'auto_plate' = 'auto_plate',
): TapriGameState {
  // If pot isn't boiled yet, only allow plating once boiled (or auto-finish if auto_plate)
  const st = { ...state.station };
  if (!st.isBoiled) {
    return state;
  }

  if (action === 'auto_plate') {
    if (!st.pouredCup) {
      st.pouredCup = state.currentCustomer.cup;
    } else if (!st.platedSnack) {
      st.platedSnack = state.currentCustomer.snack;
    }
  } else {
    if (action.cup) {
      st.pouredCup = action.cup;
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
    station.platedSnack !== null
  );
}

export function hasAnyStationProgress(station: StationProgress): boolean {
  return (
    station.crushCount > 0 ||
    station.waterAdded ||
    station.teaLeavesAdded ||
    station.milkOrLemonAdded ||
    station.spicesInPot ||
    station.boilProgress > 0 ||
    station.pouredCup !== null ||
    station.platedSnack !== null
  );
}

export function resetCurrentPreparation(state: TapriGameState): TapriGameState {
  return {
    ...state,
    station: createInitialStation(state.currentCustomer),
  };
}

export function calculateOrderCoins(
  order: CustomerOrder,
  radioEvent: RadioEventId,
  unlockedUpgrades: UpgradeId[],
): { base: number; eventBonus: number; upgradeBonus: number; total: number } {
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
  if (unlockedUpgrades.includes('marigold_lights')) {
    upgradeBonus += 10;
  }

  let eventBonus = 0;
  if (radioEvent === 'monsoon') {
    eventBonus = 5;
  } else if (radioEvent === 'milkman_delayed') {
    eventBonus = 4;
  } else if (radioEvent === 'diwali') {
    // Festival Day: customers pay double!
    eventBonus = base + upgradeBonus;
  }

  const total = base + upgradeBonus + eventBonus;
  return { base, eventBonus, upgradeBonus, total };
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
  );
  const nextServedTotal = state.customersServedTotal + 1;
  const nextServedToday = state.customersServedToday + 1;
  const dayCompleted = nextServedToday >= state.customersPerDay;

  const nextRadioEvent = getRadioEventForCustomerIndex(nextServedTotal);
  const nextCustomer = generateCustomerOrder(
    nextServedTotal,
    nextRadioEvent,
    state.unlockedUpgrades,
  );

  const nextState: TapriGameState = {
    ...state,
    coins: state.coins + reward.total,
    totalCoinsEarned: state.totalCoinsEarned + reward.total,
    customersServedTotal: nextServedTotal,
    customersServedToday: nextServedToday,
    radioEvent: nextRadioEvent,
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
    customersServedToday: 0,
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
      instruction: `Tap the Mortar & Pestle ${remaining} more ${remaining === 1 ? 'time' : 'times'} to crush fresh ${spiceName}.`,
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
      buttonLabel: 'Add Assam Tea Leaves',
      instruction: 'Add fragrant tea leaves into the warm water.',
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
      instruction: 'Watch the chai turn golden and bubble! (It will never burn or boil over).',
    };
  }

  if (!st.pouredCup) {
    return {
      stationNumber: 3,
      stationName: 'Station 3 · Serving Tray',
      buttonLabel: `Pour into ${cupName}`,
      instruction: `Pour the bubbling hot chai into a ${cupName} on the tray.`,
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
    instruction: `Hand the warm tray to ${order.name} and collect your coins!`,
  };
}
