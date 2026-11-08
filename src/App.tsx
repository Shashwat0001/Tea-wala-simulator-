import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  TapriGameState,
  createInitialGameState,
  crushSpiceStep,
  addBrewIngredientStep,
  advanceBoiling,
  plateOrderStep,
  isOrderReadyToServe,
  completeServeCustomer,
  advanceToNextDay,
  cycleRadioEventManually,
  purchaseUpgrade,
  getCurrentGuidedHint,
  RADIO_EVENTS,
  UPGRADE_CATALOG,
  SPICE_LABELS,
  CUP_LABELS,
  SNACK_LABELS,
  UpgradeId,
  SpiceType,
} from './game/rules';
import { TapriScene3D, InteractiveStationTarget } from './game/TapriScene3D';
import { soundEngine } from './game/sound';
import {
  TitleEmblemSvg,
  MortarSvgIcon,
  PatilaStoveSvgIcon,
  KulhadTraySvgIcon,
  GullakCoinSvgIcon,
  VintageRadioSvgIcon,
} from './components/TapriIcons';

const STORAGE_KEY = 'cozy_chai_tapri_save_v1';

type ShellMode = 'title' | 'playing' | 'paused' | 'gameover';

function loadSavedState(): Partial<TapriGameState> | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return {
      coins: typeof parsed.coins === 'number' ? parsed.coins : 20,
      totalCoinsEarned: typeof parsed.totalCoinsEarned === 'number' ? parsed.totalCoinsEarned : 20,
      day: typeof parsed.day === 'number' ? parsed.day : 1,
      customersServedTotal:
        typeof parsed.customersServedTotal === 'number' ? parsed.customersServedTotal : 0,
      unlockedUpgrades: Array.isArray(parsed.unlockedUpgrades) ? parsed.unlockedUpgrades : [],
    };
  } catch {
    return undefined;
  }
}

function saveStateToStorage(state: TapriGameState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        coins: state.coins,
        totalCoinsEarned: state.totalCoinsEarned,
        day: state.day,
        customersServedTotal: state.customersServedTotal,
        unlockedUpgrades: state.unlockedUpgrades,
      }),
    );
  } catch {
    // Ignore storage quota errors in private mode
  }
}

export default function App() {
  const initialAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [shellMode, setShellMode] = useState<ShellMode>(initialAutostart ? 'playing' : 'title');
  const [gameState, setGameState] = useState<TapriGameState>(() =>
    createInitialGameState(loadSavedState()),
  );
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMusicOn, setIsMusicOn] = useState(true);
  const [servingToast, setServingToast] = useState<{
    customerName: string;
    thankYou: string;
    coins: number;
  } | null>(null);

  // Refs for stable 3D WebGL scene communication without re-mounting
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<TapriScene3D | null>(null);
  const gameStateRef = useRef<TapriGameState>(gameState);
  const shellModeRef = useRef<ShellMode>(shellMode);
  const boiledBellPlayedRef = useRef<boolean>(false);

  gameStateRef.current = gameState;
  shellModeRef.current = shellMode;

  // Mirror shellMode to document.body.dataset.state & control background music
  useEffect(() => {
    document.body.dataset.state = shellMode;
    sceneRef.current?.syncGameState(gameStateRef.current, shellMode);
    if (shellMode === 'paused') {
      soundEngine.stopBackgroundMusic();
    } else if (shellMode === 'playing') {
      soundEngine.startBackgroundMusic();
    }
  }, [shellMode]);

  // Sync game state changes to 3D scene and localStorage
  useEffect(() => {
    sceneRef.current?.syncGameState(gameState, shellMode);
    saveStateToStorage(gameState);
  }, [gameState, shellMode]);

  // Station 1 Handler: Crush Spices in Mortar & Pestle
  const handleStation1Crush = useCallback((spiceOverride?: SpiceType) => {
    const curr = gameStateRef.current;
    if (curr.station.crushCount >= 3) return;
    const next = crushSpiceStep(curr, spiceOverride);
    soundEngine.playMortarCrush(next.station.crushCount);
    sceneRef.current?.triggerMortarPoundEffect(next.station.crushCount);
    setGameState(next);
  }, []);

  // Station 2 Handler: Add Ingredient / Simmer Pot on Stove
  const handleStation2Brew = useCallback(
    (
      ingredient:
        | 'water'
        | 'tea_leaves'
        | 'milk_or_lemon'
        | 'crushed_spices'
        | 'auto_next' = 'auto_next',
    ) => {
      const curr = gameStateRef.current;
      const next = addBrewIngredientStep(curr, ingredient);
      if (!curr.station.waterAdded && next.station.waterAdded) {
        soundEngine.playLiquidPour();
        sceneRef.current?.triggerPotSplashEffect(0x5bc0be);
      } else if (!curr.station.teaLeavesAdded && next.station.teaLeavesAdded) {
        soundEngine.playSpiceSizzle();
        sceneRef.current?.triggerPotSplashEffect(0x6b240c);
      } else if (!curr.station.milkOrLemonAdded && next.station.milkOrLemonAdded) {
        soundEngine.playLiquidPour();
        sceneRef.current?.triggerPotSplashEffect(0xfffbeb);
      } else if (!curr.station.spicesInPot && next.station.spicesInPot) {
        soundEngine.playSpiceSizzle();
        sceneRef.current?.triggerPotSplashEffect(0xfacc15);
      } else if (!curr.station.isBoiled && next.station.isBoiled) {
        soundEngine.playBubbleReady();
        boiledBellPlayedRef.current = true;
      }
      setGameState(next);
    },
    [],
  );

  // Station 3 Handler: Pour into Cup, Add Snack, or Serve Customer
  const handleStation3PlateOrServe = useCallback(() => {
    const curr = gameStateRef.current;
    if (!curr.station.isBoiled) return;

    if (!curr.station.pouredCup) {
      const next = plateOrderStep(curr, { cup: curr.currentCustomer.cup });
      soundEngine.playLiquidPour();
      sceneRef.current?.triggerTrayActionEffect(true);
      setGameState(next);
      return;
    }

    if (!curr.station.platedSnack) {
      const next = plateOrderStep(curr, { snack: curr.currentCustomer.snack });
      soundEngine.playSnackPlace();
      sceneRef.current?.triggerTrayActionEffect(false);
      setGameState(next);
      return;
    }

    // Order is ready -> Serve Customer!
    const prevRadio = curr.radioEvent;
    const customerName = curr.currentCustomer.name;
    const thankYou = curr.currentCustomer.thankYou;
    const { nextState, earnedCoins, dayCompleted } = completeServeCustomer(curr);

    soundEngine.playServeCoins();
    sceneRef.current?.triggerServeCelebration();
    boiledBellPlayedRef.current = false;

    if (nextState.radioEvent !== prevRadio) {
      setTimeout(() => {
        soundEngine.playRadioTune();
        sceneRef.current?.triggerRadioPulse();
      }, 350);
    }

    setServingToast({
      customerName,
      thankYou,
      coins: earnedCoins,
    });
    setGameState(nextState);

    if (dayCompleted) {
      setTimeout(() => {
        setShellMode('gameover');
      }, 650);
    }
  }, []);

  // Unified "Do Next Guided Step" for 1-click effortless play
  const handleGuidedNextStep = useCallback(() => {
    const curr = gameStateRef.current;
    const st = curr.station;
    if (st.crushCount < 3) {
      handleStation1Crush();
    } else if (!st.isBoiled) {
      handleStation2Brew('auto_next');
    } else {
      handleStation3PlateOrServe();
    }
  }, [handleStation1Crush, handleStation2Brew, handleStation3PlateOrServe]);

  // Radio Manual Tune Handler
  const handleRadioTuneClick = useCallback(() => {
    const curr = gameStateRef.current;
    const next = cycleRadioEventManually(curr);
    soundEngine.playRadioTune();
    sceneRef.current?.triggerRadioPulse();
    setGameState(next);
  }, []);

  // Direct 3D Raycast Click Callback
  const handle3DStationClick = useCallback(
    (target: InteractiveStationTarget) => {
      if (target === 'station_mortar') {
        handleStation1Crush();
      } else if (target === 'station_stove') {
        handleStation2Brew('auto_next');
      } else if (target === 'station_tray' || target === 'customer') {
        const curr = gameStateRef.current;
        if (curr.station.isBoiled) {
          handleStation3PlateOrServe();
        } else {
          handleGuidedNextStep();
        }
      } else if (target === 'station_radio') {
        handleRadioTuneClick();
      }
    },
    [
      handleStation1Crush,
      handleStation2Brew,
      handleStation3PlateOrServe,
      handleGuidedNextStep,
      handleRadioTuneClick,
    ],
  );

  // Mount Three.js WebGL Scene Once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const scene3d = new TapriScene3D(container, (target) => {
      handle3DStationClick(target);
    });
    sceneRef.current = scene3d;
    scene3d.syncGameState(gameStateRef.current, shellModeRef.current);

    return () => {
      scene3d.dispose();
      sceneRef.current = null;
    };
  }, [handle3DStationClick]);

  // Automatic gentle simmering timer when all 4 ingredients are in the pot
  useEffect(() => {
    if (shellMode !== 'playing') return;
    const interval = window.setInterval(() => {
      const curr = gameStateRef.current;
      const st = curr.station;
      if (
        st.waterAdded &&
        st.teaLeavesAdded &&
        st.milkOrLemonAdded &&
        st.spicesInPot &&
        !st.isBoiled
      ) {
        const next = advanceBoiling(curr, 0.2);
        if (next.station.isBoiled && !boiledBellPlayedRef.current) {
          boiledBellPlayedRef.current = true;
          soundEngine.playBubbleReady();
        }
        setGameState(next);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [shellMode]);

  // Auto-hide the warm serving blessing toast after 3.2s
  useEffect(() => {
    if (!servingToast) return;
    const timer = window.setTimeout(() => {
      setServingToast(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [servingToast]);

  // Start / Resume / Continue Handlers
  const handleStartGame = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    soundEngine.startBackgroundMusic();
    if (shellModeRef.current === 'gameover') {
      setGameState((prev) => advanceToNextDay(prev));
    }
    setIsShopOpen(false);
    setShellMode('playing');
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleToggleMusic = useCallback(() => {
    setIsMusicOn((prev) => {
      const next = !prev;
      soundEngine.setMusicEnabled(next);
      return next;
    });
  }, []);

  const handleBuyUpgrade = useCallback((upgradeId: UpgradeId) => {
    const curr = gameStateRef.current;
    const { nextState, success } = purchaseUpgrade(curr, upgradeId);
    if (success) {
      soundEngine.playServeCoins();
      setGameState(nextState);
    }
  }, []);

  const handleResetFreshDay = useCallback(() => {
    const fresh = createInitialGameState({
      coins: gameStateRef.current.coins,
      totalCoinsEarned: gameStateRef.current.totalCoinsEarned,
      day: gameStateRef.current.day,
      customersServedTotal: gameStateRef.current.customersServedTotal,
      unlockedUpgrades: gameStateRef.current.unlockedUpgrades,
      customersServedToday: 0,
    });
    setGameState(fresh);
    setShellMode('playing');
  }, []);

  // Unified Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const mode = shellModeRef.current;

      if (mode === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartGame();
        }
        return;
      }

      if (mode === 'gameover') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartGame();
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (isShopOpen) {
          setIsShopOpen(false);
        } else {
          setShellMode((prev) => (prev === 'paused' ? 'playing' : 'paused'));
        }
        return;
      }

      if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      if (mode !== 'playing') return;

      if (e.code === 'KeyS') {
        e.preventDefault();
        setIsShopOpen((prev) => !prev);
      } else if (e.code === 'KeyH') {
        e.preventDefault();
        setIsDockCollapsed((prev) => !prev);
      } else if (e.code === 'Digit1') {
        e.preventDefault();
        handleStation1Crush();
      } else if (e.code === 'Digit2') {
        e.preventDefault();
        handleStation2Brew('auto_next');
      } else if (e.code === 'Digit3') {
        e.preventDefault();
        handleStation3PlateOrServe();
      } else if (e.code === 'Digit4' || e.code === 'KeyR') {
        e.preventDefault();
        handleRadioTuneClick();
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleGuidedNextStep();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isShopOpen,
    handleStartGame,
    handleToggleMute,
    handleStation1Crush,
    handleStation2Brew,
    handleStation3PlateOrServe,
    handleRadioTuneClick,
    handleGuidedNextStep,
  ]);

  const order = gameState.currentCustomer;
  const st = gameState.station;
  const radioInfo = RADIO_EVENTS[gameState.radioEvent];
  const guided = getCurrentGuidedHint(gameState);
  const readyToServe = isOrderReadyToServe(st);

  return (
    <main className="relative w-screen h-screen overflow-hidden select-none bg-[#2b1810]">
      {/* Isolated 3D WebGL Viewport Container */}
      <div
        ref={canvasMountRef}
        data-testid="tapri-3d-canvas"
        className="absolute inset-0 w-full h-full"
      />

      {/* =====================================================================
          1. TITLE SCREEN OVERLAY (30-40% negative space, inline SVG emblem)
      ===================================================================== */}
      {shellMode === 'title' && (
        <div
          className="fixed inset-0 z-20 flex flex-col items-center justify-between py-7 px-6 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 44%, rgba(43, 24, 16, 0.08) 0%, rgba(28, 13, 6, 0.65) 100%)',
          }}
        >
          {/* Upper Title Emblem Lockup over clean negative space */}
          <div className="flex flex-col items-center pointer-events-auto">
            <TitleEmblemSvg />
          </div>

          {/* Lower CTA & Single Flat Control Hint Line */}
          <div className="flex flex-col items-center gap-3.5 mb-1 pointer-events-auto">
            <button
              type="button"
              data-start="true"
              onClick={handleStartGame}
              className="px-10 py-4 min-h-[64px] rounded-2xl bg-[#D97706] hover:bg-[#B45309] active:scale-[0.98] text-[#FFFBEB] font-display font-bold text-2xl tracking-wide border-2 border-[#FDE68A] shadow-[0_8px_24px_rgba(0,0,0,0.65)] transition-transform cursor-pointer whitespace-nowrap"
            >
              Open Chai Stall
            </button>

            <p className="text-sm md:text-base font-medium text-[#FDE68A] tracking-wide bg-[#231109]/85 px-4 py-1.5 rounded-lg">
              Click / Tap 3D Stations or Buttons · Space Next Step · S Bazaar Shop · P Pause
            </p>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. PLAYING HUD (Unobstructed Center Tabletop & Tea Maker, Compact Bottom-Right Order Tab)
      ===================================================================== */}
      {shellMode === 'playing' && (
        <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 md:p-4">
          {/* TOP PERIMETER BAR: Strictly Top-Left (Gullak) & Top-Right (Radio + Music/Shop/Pause)
              Center is 100% open so the Tea Maker's face & canopy are never covered! */}
          <div className="flex items-start justify-between gap-2 w-full">
            {/* Top-Left Cluster: Gullak Coin Jar & Day Progress */}
            <div className="pointer-events-auto flex items-center gap-2.5 bg-[#2C160C]/95 border-2 border-[#F59E0B] rounded-2xl px-3 py-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.45)]">
              <GullakCoinSvgIcon className="w-8 h-8 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">
                  Gullak Coins
                </span>
                <span
                  data-testid="hud-coins"
                  className="font-mono-num text-xl md:text-2xl font-bold text-[#FFFBEB] leading-tight"
                >
                  {Math.round(gameState.coins)}
                </span>
              </div>

              <div className="h-7 w-[1px] bg-[#F59E0B]/40 mx-0.5" />

              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">
                  Day {gameState.day} · Regulars
                </span>
                <span
                  data-testid="hud-served"
                  className="font-mono-num text-lg md:text-xl font-bold text-[#FFFBEB] leading-tight"
                >
                  {gameState.customersServedToday}/{gameState.customersPerDay}
                </span>
              </div>
            </div>

            {/* Top-Right Cluster: Vintage Radio Event + Music Toggle + Shop + Mute + Pause */}
            <div className="pointer-events-auto flex items-center gap-1.5 md:gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleRadioTuneClick();
                }}
                title="Click to tune Vintage Radio weather/festival event"
                className="flex items-center gap-2 bg-[#2C160C]/95 hover:bg-[#3E1F10] border-2 border-[#F59E0B] rounded-2xl px-3 py-1.5 text-left shadow-[0_4px_14px_rgba(0,0,0,0.45)] cursor-pointer transition-colors max-w-[230px]"
              >
                <VintageRadioSvgIcon className="w-7 h-7 shrink-0" />
                <div className="overflow-hidden">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#FCD34D] truncate">
                    {radioInfo.stationName}
                  </div>
                  <div
                    data-testid="radio-event-title"
                    className="text-xs md:text-sm font-bold text-[#FFFBEB] truncate"
                  >
                    {radioInfo.title}
                  </div>
                </div>
              </button>

              {/* Bazaar Shop Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setIsShopOpen(true);
                }}
                aria-label="Open Upgrade Shop"
                className="min-w-[48px] min-h-[48px] px-2.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] border-2 border-[#FDE68A] text-[#FFFBEB] font-bold text-sm flex flex-col items-center justify-center shadow-md cursor-pointer whitespace-nowrap"
              >
                <span>Shop</span>
                <span className="text-[10px] text-[#FEF08A]">[S]</span>
              </button>

              {/* Soulful Background Music Toggle Button */}
              <button
                type="button"
                tabIndex={-1}
                aria-label={isMusicOn ? 'Pause Background Music' : 'Play Background Music'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleToggleMusic();
                }}
                title="Toggle Gentle Background Music"
                className={`min-w-[48px] h-12 px-2.5 rounded-xl border-2 flex flex-col items-center justify-center shadow-md cursor-pointer transition-colors ${
                  isMusicOn && !isMuted
                    ? 'bg-[#431E0F] hover:bg-[#572814] border-[#FACC15] text-[#FDE047]'
                    : 'bg-[#2C160C]/90 border-[#78350F] text-[#A88973]'
                }`}
              >
                <span className="text-sm font-bold leading-none">♫</span>
                <span className="text-[10px] font-bold mt-0.5">
                  {isMusicOn && !isMuted ? 'Music' : 'Off'}
                </span>
              </button>

              {/* Mute All Audio Button */}
              <button
                type="button"
                tabIndex={-1}
                aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleToggleMute();
                }}
                className="w-11 h-12 rounded-xl bg-[#2C160C]/95 hover:bg-[#431E0F] border-2 border-[#F59E0B] text-[#FFFBEB] flex items-center justify-center shadow-md cursor-pointer"
              >
                {isMuted ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </button>

              {/* Pause Button */}
              <button
                type="button"
                tabIndex={-1}
                aria-label="Pause Game"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShellMode('paused');
                }}
                className="w-11 h-12 rounded-xl bg-[#2C160C]/95 hover:bg-[#431E0F] border-2 border-[#F59E0B] text-[#FFFBEB] flex items-center justify-center shadow-md cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Warm Customer Blessing Toast when an order is served */}
          {servingToast && (
            <div
              role="status"
              className="pointer-events-none self-center bg-[#2C160C]/95 border-2 border-[#FACC15] text-[#FFFBEB] px-4 py-2 rounded-2xl shadow-xl max-w-md text-center"
            >
              <div className="text-sm md:text-base font-bold text-[#FDE047]">
                +{servingToast.coins} Coins · {servingToast.customerName}:
              </div>
              <div className="text-sm text-[#FFFBEB]">“{servingToast.thankYou}”</div>
            </div>
          )}

          {/* =================================================================
              BOTTOM ROW:
              - Bottom-Left Corner: Compact Collapsible 3-Station Menu
              - Bottom-Right Corner: Compact Customer Order Card
              Never stacks vertically, keeping the entire table & people 100% visible!
          ================================================================= */}
          <div className="w-full flex flex-row items-end justify-between gap-2">
            {/* BOTTOM-LEFT CORNER: Compact Collapsible 3-Station Counter Menu */}
            <div className="pointer-events-auto w-[335px] sm:w-[390px] shrink-0 flex flex-col items-start">
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setIsDockCollapsed((prev) => !prev);
                }}
                className="px-2.5 py-0.5 rounded-t-lg bg-[#2C160C]/95 hover:bg-[#431E0F] border-2 border-b-0 border-[#F59E0B] text-[#FDE68A] text-[11px] font-bold tracking-wide cursor-pointer whitespace-nowrap ml-2"
              >
                {isDockCollapsed ? '▴ Show Buttons' : '▾ Hide Buttons'}
              </button>

              {!isDockCollapsed && (
                <div className="w-full bg-[#2C160C]/95 border-2 border-[#F59E0B] rounded-xl p-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.55)]">
                  {/* Compact Single-Row Guided Bar */}
                  <div className="flex items-center justify-between gap-1.5 pb-1 mb-1 border-b border-[#F59E0B]/30 px-1">
                    <span className="text-[11px] font-bold text-[#FDE68A] truncate">
                      {guided.instruction}
                    </span>

                    <button
                      type="button"
                      data-testid="guided-next-btn"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        handleGuidedNextStep();
                      }}
                      className={`min-h-[28px] px-2.5 py-0.5 rounded-md font-display font-bold text-xs border transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0 ${
                        readyToServe
                          ? 'bg-[#15803D] hover:bg-[#166534] text-[#FFFBEB] border-[#86EFAC]'
                          : 'bg-[#D97706] hover:bg-[#B45309] text-[#FFFBEB] border-[#FDE68A]'
                      }`}
                    >
                      {guided.buttonLabel}
                    </button>
                  </div>

                  {/* 3 Tactile Station Buttons Row */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {/* STATION 1: PREP */}
                    <button
                      type="button"
                      data-testid="station-mortar-btn"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        handleStation1Crush();
                      }}
                      disabled={st.crushCount >= 3}
                      className={`min-h-[42px] px-2 py-1 rounded-lg border flex flex-col items-start justify-center transition-colors cursor-pointer ${
                        st.crushCount >= 3
                          ? 'bg-[#14532D]/80 border-[#4ADE80]/60 text-[#BBF7D0]'
                          : guided.stationNumber === 1
                            ? 'bg-[#B45309] hover:bg-[#D97706] border-[#FACC15] text-[#FFFBEB]'
                            : 'bg-[#36180C] hover:bg-[#431E0F] border-[#78350F] text-[#FFFBEB]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full text-[10px] font-bold text-[#FCD34D]">
                        <span className="flex items-center gap-0.5 truncate">
                          <MortarSvgIcon className="w-3.5 h-3.5 shrink-0" /> 1. Spices
                        </span>
                        <span className="font-mono-num">{st.crushCount}/3</span>
                      </div>
                      <div className="font-bold text-[11px] truncate w-full text-left">
                        {st.crushCount >= 3
                          ? `✓ ${SPICE_LABELS[st.spiceSelected].hindi}`
                          : `Crush ${SPICE_LABELS[order.spice].hindi}`}
                      </div>
                    </button>

                    {/* STATION 2: STOVE */}
                    <button
                      type="button"
                      data-testid="station-stove-btn"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        handleStation2Brew('auto_next');
                      }}
                      disabled={st.isBoiled}
                      className={`min-h-[42px] px-2 py-1 rounded-lg border flex flex-col items-start justify-center transition-colors cursor-pointer ${
                        st.isBoiled
                          ? 'bg-[#14532D]/80 border-[#4ADE80]/60 text-[#BBF7D0]'
                          : guided.stationNumber === 2
                            ? 'bg-[#9A3412] hover:bg-[#C2410C] border-[#FACC15] text-[#FFFBEB]'
                            : 'bg-[#36180C] hover:bg-[#431E0F] border-[#78350F] text-[#FFFBEB]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full text-[10px] font-bold text-[#FCD34D]">
                        <span className="flex items-center gap-0.5 truncate">
                          <PatilaStoveSvgIcon className="w-3.5 h-3.5 shrink-0" /> 2. Stove
                        </span>
                        <span className="font-mono-num">
                          {st.isBoiled ? '100%' : `${Math.round(st.boilProgress)}%`}
                        </span>
                      </div>
                      <div className="font-bold text-[11px] truncate w-full text-left">
                        {!st.waterAdded
                          ? '+ Add Water'
                          : !st.teaLeavesAdded
                            ? '+ Tea Leaves'
                            : !st.milkOrLemonAdded
                              ? order.teaBase === 'black_lemon_chai'
                                ? '+ Add Lemon'
                                : '+ Pour Milk'
                              : !st.spicesInPot
                                ? '+ Add Spices'
                                : !st.isBoiled
                                  ? 'Simmering...'
                                  : '✓ Boiled'}
                      </div>
                    </button>

                    {/* STATION 3: TRAY & SERVE */}
                    <button
                      type="button"
                      data-testid="station-tray-btn"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        handleStation3PlateOrServe();
                      }}
                      disabled={!st.isBoiled}
                      className={`min-h-[42px] px-2 py-1 rounded-lg border flex flex-col items-start justify-center transition-colors cursor-pointer ${
                        !st.isBoiled
                          ? 'bg-[#29130A]/80 border-[#572814] text-[#A88973] cursor-not-allowed'
                          : readyToServe
                            ? 'bg-[#15803D] hover:bg-[#166534] border-[#86EFAC] text-[#FFFBEB]'
                            : 'bg-[#0F766E] hover:bg-[#0D9488] border-[#99F6E4] text-[#FFFBEB]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full text-[10px] font-bold text-[#FCD34D]">
                        <span className="flex items-center gap-0.5 truncate">
                          <KulhadTraySvgIcon className="w-3.5 h-3.5 shrink-0" /> 3. Tray
                        </span>
                        <span className="font-mono-num">
                          {readyToServe ? 'Serve!' : st.pouredCup ? '1/2' : '0/2'}
                        </span>
                      </div>
                      <div className="font-bold text-[11px] truncate w-full text-left">
                        {!st.pouredCup
                          ? `Pour ${CUP_LABELS[order.cup].name}`
                          : !st.platedSnack
                            ? `+ ${SNACK_LABELS[order.snack].name}`
                            : `Serve ${order.name}!`}
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* BOTTOM-RIGHT CORNER: Compact Customer Order Card */}
            <section
              aria-label="Customer Order"
              data-testid="customer-order-card"
              className="pointer-events-auto w-[265px] sm:w-[305px] shrink-0 bg-[#FDF6E7]/95 border-2 border-[#9A3412] rounded-xl px-3 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-baseline justify-between gap-1.5 border-b border-[#D97706]/30 pb-0.5 mb-1">
                <div className="truncate">
                  <span className="font-display font-bold text-sm sm:text-base text-[#2C160C]">
                    {order.name}
                  </span>
                  <span className="text-[11px] font-semibold text-[#7C2D12] ml-1">
                    · {order.role}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-[#15803D] shrink-0">
                  At Counter
                </span>
              </div>

              <p
                data-testid="customer-dialogue"
                className="text-xs sm:text-[13px] leading-snug font-semibold text-[#231109] line-clamp-2"
              >
                “{order.greeting}”
              </p>

              <div className="mt-1 pt-0.5 border-t border-[#D97706]/25 text-[11px] font-bold text-[#7C2D12] truncate">
                <span>{SPICE_LABELS[order.spice].name}</span>
                <span className="mx-1" aria-hidden="true">·</span>
                <span>
                  {order.teaBase === 'black_lemon_chai' ? 'Black Lemon' : 'Milk Chai'}
                </span>
                <span className="mx-1" aria-hidden="true">·</span>
                <span>{CUP_LABELS[order.cup].name}</span>
                <span className="mx-1" aria-hidden="true">·</span>
                <span>{SNACK_LABELS[order.snack].name}</span>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. BAZAAR UPGRADE SHOP MODAL
      ===================================================================== */}
      {isShopOpen && shellMode === 'playing' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shop-modal-title"
          className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70"
        >
          <div className="w-full max-w-2xl bg-[#FDF6E7] border-4 border-[#9A3412] rounded-3xl p-6 shadow-2xl text-[#2C160C] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-[#D97706]/30 pb-4 mb-4">
              <div>
                <h2 id="shop-modal-title" className="font-display font-bold text-3xl text-[#2C160C]">
                  Tapri Bazaar &amp; Upgrades
                </h2>
                <p className="text-base font-medium text-[#7C2D12]">
                  Unlock delicious snacks and brassware for your 3D stall (Auto-saved!)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-[#2C160C] text-[#FFFBEB] px-4 py-2 rounded-xl border-2 border-[#F59E0B] font-mono-num font-bold text-xl whitespace-nowrap">
                  {Math.round(gameState.coins)} Coins
                </div>
                <button
                  type="button"
                  onClick={() => setIsShopOpen(false)}
                  className="min-h-[48px] px-4 py-2 rounded-xl bg-[#9A3412] hover:bg-[#7C2D12] text-[#FFFBEB] font-bold text-base cursor-pointer whitespace-nowrap"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {UPGRADE_CATALOG.map((item) => {
                const owned = gameState.unlockedUpgrades.includes(item.id);
                const canAfford = gameState.coins >= item.cost;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#FFFBEB] border-2 border-[#D97706]/40"
                  >
                    <div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="font-display font-bold text-xl text-[#2C160C]">
                          {item.name}
                        </h3>
                        <span className="text-sm font-semibold text-[#9A3412]">
                          · {item.hindiSubtitle}
                        </span>
                      </div>
                      <p className="text-base text-[#431E0F] mt-0.5">{item.description}</p>
                      <p className="text-sm font-bold text-[#B45309] mt-1">{item.roleClue}</p>
                    </div>

                    <button
                      type="button"
                      disabled={owned || !canAfford}
                      onClick={() => handleBuyUpgrade(item.id)}
                      className={`min-h-[56px] px-5 py-2.5 rounded-xl font-bold text-lg shrink-0 border-2 cursor-pointer whitespace-nowrap ${
                        owned
                          ? 'bg-[#14532D] border-[#4ADE80] text-[#FFFBEB] cursor-default'
                          : canAfford
                            ? 'bg-[#D97706] hover:bg-[#B45309] border-[#2C160C] text-[#FFFBEB]'
                            : 'bg-[#E5E7EB] border-[#9CA3AF] text-[#6B7280] cursor-not-allowed'
                      }`}
                    >
                      {owned ? '✓ Unlocked' : `Buy · ${item.cost} Coins`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. PAUSE MODAL ('paused')
      ===================================================================== */}
      {shellMode === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-modal-title"
          className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75"
        >
          <div className="w-full max-w-md bg-[#FDF6E7] border-4 border-[#9A3412] rounded-3xl p-6 text-center shadow-2xl text-[#2C160C]">
            <h2 id="pause-modal-title" className="font-display font-bold text-3xl">
              Chai Break (Paused)
            </h2>
            <p className="text-lg font-medium text-[#7C2D12] mt-1">
              Take all the time you need—the chai never burns and your regulars are happy to wait!
            </p>

            <div className="grid grid-cols-2 gap-3 my-5 p-3 rounded-2xl bg-[#FFFBEB] border border-[#D97706]/40">
              <div>
                <div className="text-xs font-bold uppercase text-[#9A3412]">Gullak Coins</div>
                <div className="font-mono-num text-2xl font-bold text-[#2C160C]">
                  {Math.round(gameState.coins)}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-[#9A3412]">Total Cups Served</div>
                <div className="font-mono-num text-2xl font-bold text-[#2C160C]">
                  {gameState.customersServedTotal}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShellMode('playing')}
                className="w-full min-h-[60px] rounded-xl bg-[#D97706] hover:bg-[#B45309] text-[#FFFBEB] font-bold text-xl border-2 border-[#2C160C] cursor-pointer"
              >
                Resume Brewing
              </button>
              <button
                type="button"
                onClick={handleResetFreshDay}
                className="w-full min-h-[54px] rounded-xl bg-[#FFFBEB] hover:bg-[#FDE68A] text-[#2C160C] font-bold text-lg border-2 border-[#9A3412] cursor-pointer"
              >
                Fresh Order on Counter
              </button>
              <button
                type="button"
                onClick={() => setShellMode('title')}
                className="w-full min-h-[54px] rounded-xl bg-[#2C160C] hover:bg-[#431E0F] text-[#FFFBEB] font-bold text-lg cursor-pointer"
              >
                Return to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. DAY COMPLETE / COZY MILESTONE MODAL ('gameover')
      ===================================================================== */}
      {shellMode === 'gameover' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-complete-title"
          className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75"
        >
          <div className="w-full max-w-lg bg-[#FDF6E7] border-4 border-[#F59E0B] rounded-3xl p-7 text-center shadow-2xl text-[#2C160C]">
            <h2 id="day-complete-title" className="font-display font-bold text-3xl md:text-4xl text-[#2C160C]">
              Day {gameState.day} Complete!
            </h2>
            <p className="text-lg font-medium text-[#7C2D12] mt-1.5">
              Every neighbor left with a warm heart and a steaming cup of chai.
            </p>

            <div className="grid grid-cols-3 gap-3 my-6 p-4 rounded-2xl bg-[#FFFBEB] border-2 border-[#D97706]/40">
              <div>
                <div className="text-xs font-bold uppercase text-[#9A3412]">Gullak Coins</div>
                <div className="font-mono-num text-2xl md:text-3xl font-bold text-[#2C160C]">
                  {Math.round(gameState.coins)}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-[#9A3412]">Cups Served</div>
                <div className="font-mono-num text-2xl md:text-3xl font-bold text-[#2C160C]">
                  {gameState.customersServedTotal}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-[#9A3412]">Upgrades</div>
                <div className="font-mono-num text-2xl md:text-3xl font-bold text-[#2C160C]">
                  {gameState.unlockedUpgrades.length}/{UPGRADE_CATALOG.length}
                </div>
              </div>
            </div>

            <button
              type="button"
              data-start="true"
              onClick={handleStartGame}
              className="w-full min-h-[64px] rounded-2xl bg-[#15803D] hover:bg-[#166534] text-[#FFFBEB] font-display font-bold text-2xl border-2 border-[#86EFAC] shadow-lg cursor-pointer"
            >
              Start Day {gameState.day + 1}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
