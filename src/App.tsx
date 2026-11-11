import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  TapriGameState,
  createInitialGameState,
  crushSpiceStep,
  crushSpiceByDrag,
  addBrewIngredientStep,
  advanceBoiling,
  plateOrderStep,
  evaluatePourMeterChallenge,
  cleanCounterSpill,
  tickGameplayTimers,
  peekVipOrder,
  buyWholesaleStock,
  turnAwayCustomer,
  hasRequiredIngredientsForOrder,
  isOrderReadyToServe,
  hasAnyStationProgress,
  resetCurrentPreparation,
  completeServeCustomer,
  advanceToNextDay,
  cycleRadioEventManually,
  purchaseUpgrade,
  getCurrentGuidedHint,
  RADIO_EVENTS,
  UPGRADE_CATALOG,
  WHOLESALE_CATALOG,
  SPICE_LABELS,
  CUP_LABELS,
  SNACK_LABELS,
  SUGAR_LABELS,
  UpgradeId,
  WholesaleResourceId,
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

function formatDayTimer(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function loadSavedState(): Partial<TapriGameState> | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return {
      coins: typeof parsed.coins === 'number' ? parsed.coins : 35,
      totalCoinsEarned: typeof parsed.totalCoinsEarned === 'number' ? parsed.totalCoinsEarned : 35,
      day: typeof parsed.day === 'number' ? parsed.day : 1,
      customersServedTotal:
        typeof parsed.customersServedTotal === 'number' ? parsed.customersServedTotal : 0,
      unlockedUpgrades: Array.isArray(parsed.unlockedUpgrades) ? parsed.unlockedUpgrades : [],
      inventory:
        parsed.inventory && typeof parsed.inventory.milk === 'number'
          ? parsed.inventory
          : undefined,
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
        inventory: state.inventory,
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
  const [shopTab, setShopTab] = useState<'upgrades' | 'wholesale'>('upgrades');
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMusicOn, setIsMusicOn] = useState(true);
  const [loFiTrackName, setLoFiTrackName] = useState(() => soundEngine.getLoFiTrackName());
  const [pourMeterPos, setPourMeterPos] = useState<number>(50);
  const [servingToast, setServingToast] = useState<{
    customerName: string;
    thankYou: string;
    coins: number;
    badge?: string;
  } | null>(null);

  // Refs for stable 3D WebGL scene communication without re-mounting
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<TapriScene3D | null>(null);
  const gameStateRef = useRef<TapriGameState>(gameState);
  const shellModeRef = useRef<ShellMode>(shellMode);
  const pourMeterPosRef = useRef<number>(pourMeterPos);
  const boiledBellPlayedRef = useRef<boolean>(false);
  const isDraggingMortarRef = useRef<boolean>(false);
  const lastDragXRef = useRef<number | null>(null);

  gameStateRef.current = gameState;
  shellModeRef.current = shellMode;
  pourMeterPosRef.current = pourMeterPos;

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

  // Oscillate Sweet-Spot Pour Meter when Station 3 Pour step is active
  const isPourStepActive =
    shellMode === 'playing' &&
    gameState.station.isBoiled &&
    !gameState.station.pouredCup &&
    !gameState.station.hasSpillOnCounter;

  useEffect(() => {
    if (!isPourStepActive) return;
    let dir = 1;
    let pos = 50;
    const id = window.setInterval(() => {
      pos += dir * 4.5;
      if (pos >= 96) {
        pos = 96;
        dir = -1;
      } else if (pos <= 4) {
        pos = 4;
        dir = 1;
      }
      setPourMeterPos(Math.round(pos));
    }, 45);
    return () => clearInterval(id);
  }, [isPourStepActive]);

  // Station 1 Handler: Crush Spices in Mortar & Pestle (Click or Drag)
  const handleStation1Crush = useCallback((spiceOverride?: SpiceType) => {
    const curr = gameStateRef.current;
    if (curr.station.crushCount >= 3) return;
    const next = crushSpiceStep(curr, spiceOverride);
    soundEngine.playMortarCrush(next.station.crushCount);
    sceneRef.current?.triggerMortarPoundEffect(next.station.crushCount);
    setGameState(next);
  }, []);

  const handleMortarDragScrub = useCallback((deltaProgress: number) => {
    const curr = gameStateRef.current;
    if (curr.station.crushCount >= 3) return;
    const next = crushSpiceByDrag(curr, deltaProgress);
    if (next.station.crushCount > curr.station.crushCount) {
      soundEngine.playMortarCrush(next.station.crushCount);
      sceneRef.current?.triggerMortarPoundEffect(next.station.crushCount);
    }
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

  // Wipe Cloth Cleanup Handler for Prompt 1 Spill Challenge
  const handleWipeCounterSpill = useCallback(() => {
    const curr = gameStateRef.current;
    if (!curr.station.hasSpillOnCounter) return;
    const next = cleanCounterSpill(curr);
    soundEngine.playWipeClean();
    sceneRef.current?.triggerWipeCleanEffect();
    setGameState(next);
  }, []);

  // Sweet-Spot Pour Evaluation Handler (Green Zone 34..66 = Perfect +6 Tip, Red Zone <20 or >80 = Spill -3 Coins)
  const handleSweetSpotPourAtPosition = useCallback((meterValue: number) => {
    const curr = gameStateRef.current;
    if (!curr.station.isBoiled || curr.station.pouredCup) return;

    if (curr.station.hasSpillOnCounter) {
      handleWipeCounterSpill();
      return;
    }

    const { nextState, outcome } = evaluatePourMeterChallenge(curr, meterValue);
    if (outcome === 'spill') {
      soundEngine.playSpillError();
      sceneRef.current?.triggerSpillSplashEffect();
    } else if (outcome === 'perfect') {
      soundEngine.playSweetSpotPerfect();
      sceneRef.current?.triggerTrayActionEffect(true);
    } else {
      soundEngine.playLiquidPour();
      sceneRef.current?.triggerTrayActionEffect(true);
    }
    setGameState(nextState);
  }, [handleWipeCounterSpill]);

  // Station 3 Handler: Pour into Cup, Add Snack, Wipe Spill, or Serve Customer
  const handleStation3PlateOrServe = useCallback(() => {
    const curr = gameStateRef.current;
    if (curr.station.hasSpillOnCounter) {
      handleWipeCounterSpill();
      return;
    }
    if (!curr.station.isBoiled) return;

    if (!curr.station.pouredCup) {
      // Use current oscillating sweet-spot meter position
      handleSweetSpotPourAtPosition(pourMeterPosRef.current);
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
    const wasVipMemory =
      curr.currentCustomer.isVip && !curr.station.vipPeeked;
    const wasPerfectPour = curr.station.pourQuality === 'perfect';

    const { nextState, earnedCoins, dayCompleted } = completeServeCustomer(curr);

    soundEngine.playServeCoins();
    sceneRef.current?.triggerServeCelebration();
    boiledBellPlayedRef.current = false;

    if (nextState.radioEvent !== prevRadio) {
      setTimeout(() => {
        if (nextState.radioEvent === 'monsoon') {
          soundEngine.playThunderRumble();
        } else {
          soundEngine.playRadioTune();
        }
        sceneRef.current?.triggerRadioPulse();
      }, 350);
    }

    const badges: string[] = [];
    if (wasPerfectPour) badges.push('Perfect Pour!');
    if (wasVipMemory) badges.push('VIP 2x Memory Tip!');

    setServingToast({
      customerName,
      thankYou,
      coins: earnedCoins,
      badge: badges.length > 0 ? badges.join(' · ') : undefined,
    });
    setGameState(nextState);

    if (dayCompleted) {
      setTimeout(() => {
        setShellMode('gameover');
      }, 650);
    }
  }, [handleWipeCounterSpill, handleSweetSpotPourAtPosition]);

  // Unified "Do Next Guided Step" for 1-click effortless play
  const handleGuidedNextStep = useCallback(() => {
    const curr = gameStateRef.current;
    const st = curr.station;
    if (st.hasSpillOnCounter) {
      handleWipeCounterSpill();
      return;
    }
    if (st.crushCount < 3) {
      handleStation1Crush();
    } else if (!st.isBoiled) {
      handleStation2Brew('auto_next');
    } else if (!st.pouredCup) {
      // Guided button hits the green Sweet-Spot center (50) for forgiving accessibility!
      handleSweetSpotPourAtPosition(50);
    } else {
      handleStation3PlateOrServe();
    }
  }, [
    handleWipeCounterSpill,
    handleStation1Crush,
    handleStation2Brew,
    handleSweetSpotPourAtPosition,
    handleStation3PlateOrServe,
  ]);

  // Radio Manual Tune Handler (Also cycles Lo-Fi radio tracks if Lo-Fi upgrade is owned)
  const handleRadioTuneClick = useCallback(() => {
    const curr = gameStateRef.current;
    const next = cycleRadioEventManually(curr);
    if (next.radioEvent === 'monsoon') {
      soundEngine.playThunderRumble();
    } else {
      soundEngine.playRadioTune();
    }
    const nextTrack = soundEngine.cycleLoFiTrack();
    setLoFiTrackName(nextTrack);
    sceneRef.current?.triggerRadioPulse();
    setGameState(next);
  }, []);

  // Direct 3D Raycast Click Callback
  const handle3DStationClick = useCallback(
    (target: InteractiveStationTarget) => {
      if (target === 'station_spill') {
        handleWipeCounterSpill();
      } else if (target === 'station_mortar') {
        handleStation1Crush();
      } else if (target === 'station_stove') {
        handleStation2Brew('auto_next');
      } else if (target === 'station_tray' || target === 'customer') {
        const curr = gameStateRef.current;
        if (curr.station.hasSpillOnCounter) {
          handleWipeCounterSpill();
        } else if (curr.station.isBoiled) {
          handleStation3PlateOrServe();
        } else {
          handleGuidedNextStep();
        }
      } else if (target === 'station_radio') {
        handleRadioTuneClick();
      }
    },
    [
      handleWipeCounterSpill,
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

  // Gameplay tick (200ms): Simmering pot + 3-Minute Day Timer + VIP Memory 5s Bubble + Masala Aroma Timer
  useEffect(() => {
    if (shellMode !== 'playing') return;
    const interval = window.setInterval(() => {
      let next = tickGameplayTimers(gameStateRef.current, 0.2);
      const st = next.station;
      if (
        st.waterAdded &&
        st.teaLeavesAdded &&
        st.milkOrLemonAdded &&
        st.spicesInPot &&
        !st.isBoiled
      ) {
        next = advanceBoiling(next, 0.2);
        if (next.station.isBoiled && !boiledBellPlayedRef.current) {
          boiledBellPlayedRef.current = true;
          soundEngine.playBubbleReady();
        }
      }

      setGameState(next);

      if (next.dayTimerSeconds <= 0) {
        setShellMode('gameover');
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

  const handleBuyWholesale = useCallback((resourceId: WholesaleResourceId) => {
    const curr = gameStateRef.current;
    const { nextState, success } = buyWholesaleStock(curr, resourceId);
    if (success) {
      soundEngine.playServeCoins();
      setGameState(nextState);
    }
  }, []);

  const handleTurnAwayCustomer = useCallback(() => {
    const curr = gameStateRef.current;
    const next = turnAwayCustomer(curr);
    soundEngine.playSpillError();
    boiledBellPlayedRef.current = false;
    setGameState(next);
  }, []);

  const handlePeekVipOrder = useCallback(() => {
    const curr = gameStateRef.current;
    setGameState(peekVipOrder(curr));
  }, []);

  const handleEmptyTrayUndo = useCallback(() => {
    const curr = gameStateRef.current;
    if (!hasAnyStationProgress(curr.station)) return;
    soundEngine.playSnackPlace();
    boiledBellPlayedRef.current = false;
    setGameState(resetCurrentPreparation(curr));
  }, []);

  const handleResetFreshDay = useCallback(() => {
    const fresh = createInitialGameState({
      coins: gameStateRef.current.coins,
      totalCoinsEarned: gameStateRef.current.totalCoinsEarned,
      day: gameStateRef.current.day,
      customersServedTotal: gameStateRef.current.customersServedTotal,
      unlockedUpgrades: gameStateRef.current.unlockedUpgrades,
      inventory: gameStateRef.current.inventory,
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
        setShopTab('upgrades');
        setIsShopOpen((prev) => !prev);
      } else if (e.code === 'KeyW') {
        e.preventDefault();
        if (gameStateRef.current.station.hasSpillOnCounter) {
          handleWipeCounterSpill();
        } else {
          setShopTab('wholesale');
          setIsShopOpen((prev) => !prev);
        }
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
      } else if (e.code === 'KeyU' || e.code === 'Backspace') {
        e.preventDefault();
        handleEmptyTrayUndo();
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
    handleWipeCounterSpill,
    handleStation1Crush,
    handleStation2Brew,
    handleStation3PlateOrServe,
    handleRadioTuneClick,
    handleEmptyTrayUndo,
    handleGuidedNextStep,
  ]);

  const order = gameState.currentCustomer;
  const st = gameState.station;
  const inv = gameState.inventory;
  const ledger = gameState.ledger;
  const radioInfo = RADIO_EVENTS[gameState.radioEvent];
  const guided = getCurrentGuidedHint(gameState);
  const readyToServe = isOrderReadyToServe(st);
  const canUndoPrep = hasAnyStationProgress(st);
  const stockCheck = hasRequiredIngredientsForOrder(gameState);
  const netProfitToday =
    ledger.baseRevenueToday + ledger.tipsEarnedToday - ledger.penaltiesToday;

  return (
    <main className="relative w-full h-[100dvh] max-w-full overflow-hidden select-none bg-[#2b1810]">
      {/* Isolated 3D WebGL Viewport Container */}
      <div
        ref={canvasMountRef}
        data-testid="tapri-3d-canvas"
        className="absolute inset-0 w-full h-full"
      />

      {/* =====================================================================
          1. TITLE SCREEN OVERLAY (Warm terracotta, sunset orange & warm brown palette,
             pill-shaped 64px+ Start button, 20px+ readable typography, CSS teacup steam)
      ===================================================================== */}
      {shellMode === 'title' && (
        <div
          className="fixed inset-0 z-20 flex flex-col items-center justify-between py-5 sm:py-7 px-4 sm:px-6 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 44%, rgba(67, 30, 15, 0.08) 0%, rgba(44, 22, 12, 0.68) 100%)',
          }}
        >
          {/* Upper Title Emblem Lockup with continuous CSS-animated steam rising from teacup */}
          <div className="flex flex-col items-center w-full max-w-[340px] sm:max-w-[500px] pointer-events-auto">
            <TitleEmblemSvg />
          </div>

          {/* Lower Pill-Shaped CTA & Accessible 20px Hint Line */}
          <div className="flex flex-col items-center gap-3 sm:gap-4 mb-1 w-full max-w-xl pointer-events-auto">
            <button
              type="button"
              data-start="true"
              onClick={handleStartGame}
              className="cozy-interactive-glow w-full sm:w-auto px-10 sm:px-14 py-4 min-h-[64px] rounded-full bg-[#D97706] hover:bg-[#B45309] active:scale-[0.98] text-[#FFFBEB] font-display font-bold text-2xl sm:text-3xl tracking-wide border-2 border-[#FDE68A] shadow-[0_8px_24px_rgba(0,0,0,0.65)] cursor-pointer whitespace-nowrap"
            >
              Open Chai Stall
            </button>

            <p className="text-sm sm:text-[20px] text-center font-semibold text-[#FDE68A] tracking-wide bg-[#2C160C]/90 border border-[#F59E0B]/50 px-4 sm:px-5 py-1.5 rounded-full">
              Tap 3D Stations or Buttons · Sweet-Spot Pour · Wholesale &amp; Upgrades
            </p>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. PLAYING HUD (Responsive for Mobile Phones, Tablets & Desktops)
      ===================================================================== */}
      {shellMode === 'playing' && (
        <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-1.5 sm:p-3 w-full max-w-full overflow-hidden">
          {/* TOP PERIMETER BAR */}
          <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2 w-full max-w-full">
            {/* Top-Left Cluster: Gullak Coin Jar, Day Progress, 3-Min Day Timer & Live Inventory Gauges */}
            <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 bg-[#2C160C]/90 border-2 border-[#F59E0B]/80 rounded-full px-2.5 sm:px-3.5 py-1 sm:py-1.5 min-h-[40px] sm:min-h-[52px] shadow-[0_4px_16px_rgba(0,0,0,0.5)] shrink-0">
              <GullakCoinSvgIcon className="w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#FCD34D] leading-none">
                  Coins
                </span>
                <span
                  data-testid="hud-coins"
                  className="font-mono-num text-xs sm:text-xl font-bold text-[#FFFBEB] leading-tight"
                >
                  {Math.round(gameState.coins)}
                </span>
              </div>

              <div className="h-5 sm:h-7 w-[1px] bg-[#F59E0B]/40 mx-0.5" />

              <div className="flex flex-col">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#FCD34D] leading-none">
                  Day {gameState.day} · {formatDayTimer(gameState.dayTimerSeconds)}
                </span>
                <span
                  data-testid="hud-served"
                  className="font-mono-num text-xs sm:text-lg font-bold text-[#FFFBEB] leading-tight"
                >
                  {gameState.customersServedToday}/{gameState.customersPerDay}
                </span>
              </div>

              <div className="h-5 sm:h-7 w-[1px] bg-[#F59E0B]/40 mx-0.5" />

              {/* Prompt 5: Compact Visual Inventory Stock Gauges (Click opens Wholesale Market) */}
              <button
                type="button"
                data-testid="inventory-gauges-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShopTab('wholesale');
                  setIsShopOpen(true);
                }}
                title="View & Restock Daily Inventory (Milk, Tea Leaves, Sugar, Gas)"
                className="flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 rounded-full bg-[#1C0D06]/85 hover:bg-[#36180C] border border-[#FDE68A]/50 cursor-pointer"
              >
                <span
                  className={`text-[9px] sm:text-[11px] font-mono-num font-bold ${
                    inv.milk <= 2 ? 'text-[#F87171]' : 'text-[#FFFBEB]'
                  }`}
                >
                  🥛{inv.milk}
                </span>
                <span
                  className={`text-[9px] sm:text-[11px] font-mono-num font-bold ${
                    inv.teaLeaves <= 2 ? 'text-[#F87171]' : 'text-[#FDE68A]'
                  }`}
                >
                  🍃{inv.teaLeaves}
                </span>
                <span
                  className={`hidden md:inline text-[11px] font-mono-num font-bold ${
                    inv.sugar <= 2 ? 'text-[#F87171]' : 'text-[#FFFBEB]'
                  }`}
                >
                  🍬{inv.sugar}
                </span>
                <span
                  className={`text-[9px] sm:text-[11px] font-mono-num font-bold ${
                    inv.gas <= 2 ? 'text-[#F87171]' : 'text-[#67E8F9]'
                  }`}
                >
                  🔥{inv.gas}
                </span>
              </button>
            </div>

            {/* Top-Right Cluster: Weather/Radio + Wholesale Market + Upgrades + Music + Mute + Pause */}
            <div className="pointer-events-auto flex items-center justify-end gap-1 sm:gap-1.5 min-w-0">
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleRadioTuneClick();
                }}
                title="Click to tune Nostalgic Radio weather/festival broadcast & Lo-Fi track"
                className="cozy-interactive-glow flex items-center gap-1 sm:gap-1.5 bg-[#2C160C]/90 hover:bg-[#3E1F10] border-2 border-[#F59E0B]/85 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 min-h-[38px] sm:min-h-[52px] text-left shadow-[0_4px_14px_rgba(0,0,0,0.45)] cursor-pointer max-w-[88px] sm:max-w-[165px] md:max-w-[215px] min-w-0"
              >
                <VintageRadioSvgIcon className="w-4 h-4 sm:w-6 sm:h-6 shrink-0" />
                <div className="overflow-hidden min-w-0">
                  <div className="hidden md:block text-[9px] font-bold uppercase tracking-wider text-[#FCD34D] truncate">
                    {gameState.radioEvent === 'monsoon'
                      ? `🌧 2x Ginger & Pakora`
                      : loFiTrackName}
                  </div>
                  <div
                    data-testid="radio-event-title"
                    className="text-[10px] sm:text-xs md:text-sm font-bold text-[#FFFBEB] truncate"
                  >
                    {radioInfo.title}
                  </div>
                </div>
              </button>

              {/* Wholesale Market & Stall Upgrades Button */}
              <button
                type="button"
                data-testid="decorate-shop-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShopTab('upgrades');
                  setIsShopOpen(true);
                }}
                aria-label="Open Wholesale Market and Stall Upgrades"
                className="cozy-interactive-glow h-9 sm:min-h-[52px] px-2 sm:px-3 rounded-full bg-[#D97706] hover:bg-[#B45309] border-2 border-[#FDE68A] text-[#FFFBEB] font-bold text-[10px] sm:text-sm flex flex-col items-center justify-center shadow-md cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Bazaar</span>
                <span className="hidden sm:inline text-[9px] text-[#FEF08A] leading-none">
                  Stock &amp; Upgrades
                </span>
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
                className={`cozy-interactive-glow h-9 w-9 sm:w-auto sm:min-h-[52px] sm:min-w-[50px] px-1.5 sm:px-2.5 rounded-full border-2 flex flex-col items-center justify-center shadow-md cursor-pointer shrink-0 ${
                  isMusicOn && !isMuted
                    ? 'bg-[#431E0F] hover:bg-[#572814] border-[#FACC15] text-[#FDE047]'
                    : 'bg-[#2C160C]/90 border-[#78350F] text-[#A88973]'
                }`}
              >
                <span className="text-xs sm:text-base font-bold leading-none">♫</span>
                <span className="hidden sm:inline text-[9px] font-bold leading-none mt-0.5">
                  {isMusicOn && !isMuted ? 'Lo-Fi' : 'Off'}
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
                className="cozy-interactive-glow w-9 h-9 sm:w-[50px] sm:h-[52px] rounded-full bg-[#2C160C]/90 hover:bg-[#431E0F] border-2 border-[#F59E0B] text-[#FFFBEB] flex items-center justify-center shadow-md cursor-pointer shrink-0"
              >
                {isMuted ? (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
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
                className="cozy-interactive-glow w-9 h-9 sm:w-[50px] sm:h-[52px] rounded-full bg-[#2C160C]/90 hover:bg-[#431E0F] border-2 border-[#F59E0B] text-[#FFFBEB] flex items-center justify-center shadow-md cursor-pointer shrink-0"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Celebratory Floating "Perfect!" + Golden Coins & Customer Happiness when a drink is served */}
          {servingToast && (
            <div
              role="status"
              data-testid="perfect-celebration-toast"
              className="animate-float-perfect pointer-events-none self-center bg-[#2C160C]/92 border-2 border-[#FACC15] text-[#FFFBEB] px-4 py-2 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.65)] max-w-[92vw] sm:max-w-lg text-center"
            >
              <div className="flex items-center justify-center gap-2 text-sm sm:text-xl font-display font-bold text-[#FDE047]">
                <GullakCoinSvgIcon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                <span>
                  {servingToast.badge ? `${servingToast.badge} ` : 'Perfect! '}
                  +{servingToast.coins} Coins · {servingToast.customerName}
                </span>
                <GullakCoinSvgIcon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
              </div>
              <div className="text-xs sm:text-base font-medium text-[#FFFBEB] truncate">
                “{servingToast.thankYou}”
              </div>
            </div>
          )}

          {/* =================================================================
              BOTTOM ZONE:
              - Row A: Fluid responsive Bottom-Left 3-Station Menu + Bottom-Right Customer Card
              - Row B: Sleek Nostalgic Radio Scrolling Ticker at the bottom perimeter
          ================================================================= */}
          <div className="w-full max-w-full flex flex-col gap-1">
            <div className="w-full max-w-full flex flex-col-reverse sm:flex-row items-stretch sm:items-end justify-between gap-1 sm:gap-2">
              {/* BOTTOM-LEFT: Compact Collapsible 3-Station Counter Menu + Minigame Bars */}
              <div className="pointer-events-auto w-full sm:w-[56%] sm:max-w-[465px] min-w-0 flex flex-col items-start">
                <div className="flex flex-wrap items-center gap-1 ml-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setIsDockCollapsed((prev) => !prev);
                    }}
                    className="cozy-interactive-glow px-2.5 py-0.5 rounded-t-lg bg-[#2C160C]/90 hover:bg-[#431E0F] border-2 border-b-0 border-[#F59E0B] text-[#FDE68A] text-[10px] sm:text-xs font-bold tracking-wide cursor-pointer whitespace-nowrap"
                  >
                    {isDockCollapsed ? '▴ Show Buttons' : '▾ Hide Buttons'}
                  </button>

                  {/* Forgiving Empty Tray / Undo Button */}
                  <button
                    type="button"
                    data-testid="empty-tray-undo-btn"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handleEmptyTrayUndo();
                    }}
                    disabled={!canUndoPrep}
                    title="Clear current tray or pot with zero penalty"
                    className={`cozy-interactive-glow px-2.5 py-0.5 rounded-t-lg border-2 border-b-0 text-[10px] sm:text-xs font-bold tracking-wide whitespace-nowrap ${
                      canUndoPrep
                        ? 'bg-[#7C2D12] hover:bg-[#9A3412] border-[#FDE68A] text-[#FFFBEB] cursor-pointer'
                        : 'bg-[#2C160C]/75 border-[#78350F]/60 text-[#A88973] cursor-not-allowed'
                    }`}
                  >
                    ↺ Empty Tray / Undo
                  </button>

                  {/* Prompt 1: Wipe Cloth Button when a Spill is on the Counter */}
                  {st.hasSpillOnCounter && (
                    <button
                      type="button"
                      data-testid="wipe-spill-btn"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        handleWipeCounterSpill();
                      }}
                      className="cozy-interactive-glow px-2.5 py-0.5 rounded-t-lg bg-[#DC2626] hover:bg-[#B91C1C] border-2 border-b-0 border-[#FDE047] text-[#FFFBEB] text-[10px] sm:text-xs font-bold tracking-wide cursor-pointer whitespace-nowrap animate-pulse"
                    >
                      🧹 Wipe Counter Spill
                    </button>
                  )}
                </div>

                {!isDockCollapsed && (
                  <div className="w-full bg-[#2C160C]/90 border-2 border-[#F59E0B]/90 rounded-xl p-1.5 shadow-[0_8px_22px_rgba(0,0,0,0.6)]">
                    {/* Prompt 5: Out-of-Stock Alert with Restock & Turn Away Customer */}
                    {!stockCheck.canMake && (
                      <div
                        data-testid="out-of-stock-banner"
                        className="flex items-center justify-between gap-1.5 bg-[#7F1D1D]/95 border border-[#FCA5A5] rounded-lg px-2 py-1 mb-1 text-[10px] sm:text-xs text-[#FEF2F2]"
                      >
                        <span className="font-bold truncate">
                          ⚠ Low {stockCheck.missing.join(', ')}! Restock or Turn Away:
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setShopTab('wholesale');
                              setIsShopOpen(true);
                            }}
                            className="px-2 py-0.5 rounded bg-[#D97706] hover:bg-[#B45309] font-bold text-[#FFFBEB] cursor-pointer"
                          >
                            Restock
                          </button>
                          <button
                            type="button"
                            data-testid="turn-away-btn"
                            onClick={handleTurnAwayCustomer}
                            className="px-2 py-0.5 rounded bg-[#991B1B] hover:bg-[#7F1D1D] border border-[#FCA5A5] font-bold text-[#FFFBEB] cursor-pointer"
                          >
                            Turn Away
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Prompt 4: Advanced Masala Mortar & Pestle Interactive Drag/Click Minigame */}
                    {st.crushCount < 3 && (
                      <div
                        data-testid="masala-minigame-bar"
                        onPointerDown={(e) => {
                          isDraggingMortarRef.current = true;
                          lastDragXRef.current = e.clientX;
                          handleMortarDragScrub(18);
                        }}
                        onPointerMove={(e) => {
                          if (!isDraggingMortarRef.current || lastDragXRef.current === null) return;
                          const dx = Math.abs(e.clientX - lastDragXRef.current);
                          if (dx >= 12) {
                            lastDragXRef.current = e.clientX;
                            handleMortarDragScrub(16);
                          }
                        }}
                        onPointerUp={() => {
                          isDraggingMortarRef.current = false;
                          lastDragXRef.current = null;
                        }}
                        className="flex items-center justify-between gap-2 bg-[#3E1F10]/90 border border-[#FACC15]/60 rounded-lg px-2 py-1 mb-1 cursor-ew-resize select-none"
                        title="Rapidly click or drag left-right across the mortar bar to crush spices!"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MortarSvgIcon className="w-4 h-4 shrink-0" />
                          <span className="text-[10px] sm:text-xs font-bold text-[#FDE68A] truncate">
                            Drag/Tap Pestle: {st.crushProgress}%
                          </span>
                        </div>
                        <div className="flex-1 h-2.5 bg-[#1C0D06] rounded-full overflow-hidden border border-[#F59E0B]/50">
                          <div
                            className="h-full bg-gradient-to-r from-[#F59E0B] to-[#4ADE80] transition-all duration-100"
                            style={{ width: `${st.crushProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono-num font-bold text-[#86EFAC] shrink-0">
                          ⏱{Math.ceil(st.masalaTimerRemaining)}s
                        </span>
                      </div>
                    )}

                    {/* Prompt 1: Moving Sweet-Spot Pour & Sugar Meter (When Boiled & Ready to Pour) */}
                    {st.isBoiled && !st.pouredCup && !st.hasSpillOnCounter && (
                      <div
                        data-testid="sweet-spot-meter"
                        className="flex items-center justify-between gap-1.5 bg-[#1C0D06]/95 border border-[#4ADE80] rounded-lg px-2 py-1 mb-1"
                      >
                        <span className="text-[10px] sm:text-xs font-bold text-[#BBF7D0] shrink-0">
                          🎯 Sweet-Spot:
                        </span>

                        {/* Color-coded Red / Amber / Green Sweet-Spot / Amber / Red Track */}
                        <div
                          onClick={() => handleSweetSpotPourAtPosition(pourMeterPos)}
                          className="relative flex-1 h-3.5 rounded-full overflow-hidden border border-[#FFFBEB]/50 cursor-pointer"
                          style={{
                            background:
                              'linear-gradient(90deg, #DC2626 0%, #DC2626 20%, #F59E0B 20%, #F59E0B 34%, #16A34A 34%, #16A34A 66%, #F59E0B 66%, #F59E0B 80%, #DC2626 80%, #DC2626 100%)',
                          }}
                        >
                          <div
                            className="absolute top-0 bottom-0 w-1.5 bg-[#FFFBEB] shadow-[0_0_6px_#fff] -translate-x-1/2"
                            style={{ left: `${pourMeterPos}%` }}
                          />
                        </div>

                        <button
                          type="button"
                          data-testid="sweet-spot-pour-btn"
                          onClick={() => handleSweetSpotPourAtPosition(pourMeterPos)}
                          className="px-2 py-0.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-[#FFFBEB] font-bold text-[10px] sm:text-xs cursor-pointer shrink-0"
                        >
                          Pour!
                        </button>

                        <button
                          type="button"
                          data-testid="force-spill-btn"
                          onClick={() => handleSweetSpotPourAtPosition(8)}
                          title="Test Red-Zone Spill & Wipe Cloth Mechanics"
                          className="px-1.5 py-0.5 rounded bg-[#7F1D1D] hover:bg-[#991B1B] text-[#FECACA] font-bold text-[9px] sm:text-[10px] cursor-pointer shrink-0"
                        >
                          Spill
                        </button>
                      </div>
                    )}

                    {/* Compact Single-Row Guided Bar */}
                    <div className="flex items-center justify-between gap-1.5 pb-1 mb-1 border-b border-[#F59E0B]/30 px-1 min-w-0">
                      <span className="text-[11px] sm:text-xs font-bold text-[#FDE68A] truncate min-w-0">
                        {guided.instruction}
                      </span>

                      <button
                        type="button"
                        data-testid="guided-next-btn"
                        onClick={(e) => {
                          e.currentTarget.blur();
                          handleGuidedNextStep();
                        }}
                        className={`cozy-interactive-glow min-h-[28px] sm:min-h-[30px] px-2.5 sm:px-3 py-0.5 rounded-full font-display font-bold text-[11px] sm:text-sm border transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0 ${
                          st.hasSpillOnCounter
                            ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-[#FFFBEB] border-[#FDE047]'
                            : readyToServe
                              ? 'bg-[#15803D] hover:bg-[#166534] text-[#FFFBEB] border-[#86EFAC]'
                              : 'bg-[#D97706] hover:bg-[#B45309] text-[#FFFBEB] border-[#FDE68A]'
                        }`}
                      >
                        {guided.buttonLabel}
                      </button>
                    </div>

                    {/* 3 Tactile Station Buttons Row */}
                    <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                      {/* STATION 1: PREP */}
                      <button
                        type="button"
                        data-testid="station-mortar-btn"
                        onClick={(e) => {
                          e.currentTarget.blur();
                          handleStation1Crush();
                        }}
                        disabled={st.crushCount >= 3}
                        className={`cozy-interactive-glow min-h-[40px] sm:min-h-[46px] px-1.5 sm:px-2 py-1 rounded-lg border flex flex-col items-start justify-center cursor-pointer min-w-0 ${
                          st.crushCount >= 3
                            ? 'bg-[#14532D]/80 border-[#4ADE80]/60 text-[#BBF7D0]'
                            : guided.stationNumber === 1
                              ? 'bg-[#B45309] hover:bg-[#D97706] border-[#FACC15] text-[#FFFBEB]'
                              : 'bg-[#36180C] hover:bg-[#431E0F] border-[#78350F] text-[#FFFBEB]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full text-[10px] sm:text-[11px] font-bold text-[#FCD34D] min-w-0">
                          <span className="flex items-center gap-0.5 truncate">
                            <MortarSvgIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> 1. Spices
                          </span>
                          <span className="font-mono-num shrink-0">{st.crushCount}/3</span>
                        </div>
                        <div className="font-bold text-[10px] sm:text-xs truncate w-full text-left">
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
                        className={`cozy-interactive-glow min-h-[40px] sm:min-h-[46px] px-1.5 sm:px-2 py-1 rounded-lg border flex flex-col items-start justify-center cursor-pointer min-w-0 ${
                          st.isBoiled
                            ? 'bg-[#14532D]/80 border-[#4ADE80]/60 text-[#BBF7D0]'
                            : guided.stationNumber === 2
                              ? 'bg-[#9A3412] hover:bg-[#C2410C] border-[#FACC15] text-[#FFFBEB]'
                              : 'bg-[#36180C] hover:bg-[#431E0F] border-[#78350F] text-[#FFFBEB]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full text-[10px] sm:text-[11px] font-bold text-[#FCD34D] min-w-0">
                          <span className="flex items-center gap-0.5 truncate">
                            <PatilaStoveSvgIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> 2. Stove
                          </span>
                          <span className="font-mono-num shrink-0">
                            {st.isBoiled ? '100%' : `${Math.round(st.boilProgress)}%`}
                          </span>
                        </div>
                        <div className="font-bold text-[10px] sm:text-xs truncate w-full text-left">
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
                        disabled={!st.isBoiled && !st.hasSpillOnCounter}
                        className={`cozy-interactive-glow min-h-[40px] sm:min-h-[46px] px-1.5 sm:px-2 py-1 rounded-lg border flex flex-col items-start justify-center cursor-pointer min-w-0 ${
                          st.hasSpillOnCounter
                            ? 'bg-[#DC2626] hover:bg-[#B91C1C] border-[#FDE047] text-[#FFFBEB]'
                            : !st.isBoiled
                              ? 'bg-[#29130A]/80 border-[#572814] text-[#A88973] cursor-not-allowed'
                              : readyToServe
                                ? 'bg-[#15803D] hover:bg-[#166534] border-[#86EFAC] text-[#FFFBEB]'
                                : 'bg-[#0F766E] hover:bg-[#0D9488] border-[#99F6E4] text-[#FFFBEB]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full text-[10px] sm:text-[11px] font-bold text-[#FCD34D] min-w-0">
                          <span className="flex items-center gap-0.5 truncate">
                            <KulhadTraySvgIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> 3. Tray
                          </span>
                          <span className="font-mono-num shrink-0">
                            {st.hasSpillOnCounter
                              ? 'Wipe!'
                              : readyToServe
                                ? 'Serve!'
                                : st.pouredCup
                                  ? '1/2'
                                  : '0/2'}
                          </span>
                        </div>
                        <div className="font-bold text-[10px] sm:text-xs truncate w-full text-left">
                          {st.hasSpillOnCounter
                            ? '🧹 Wipe Spill'
                            : !st.pouredCup
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

              {/* BOTTOM-RIGHT: Customer Dialogue & VIP Memory Order Card */}
              <section
                aria-label="Customer Order"
                data-testid="customer-order-card"
                className="pointer-events-auto w-full sm:w-[42%] sm:max-w-[335px] min-w-0 bg-[#FDF6E7]/92 border-2 border-[#9A3412] rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.5)]"
              >
                <div className="flex items-center justify-between gap-1.5 border-b border-[#D97706]/30 pb-0.5 mb-0.5">
                  <div className="truncate min-w-0">
                    <span className="font-display font-bold text-xs sm:text-base text-[#2C160C]">
                      {order.name}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-[#7C2D12] ml-1">
                      · {order.role}
                    </span>
                  </div>

                  {order.isVip ? (
                    <span
                      data-testid="vip-badge"
                      className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#7C2D12] text-[#FDE047] shrink-0"
                    >
                      {st.vipOrderHidden
                        ? '🌟 VIP Memory (2x)'
                        : `🌟 VIP ${st.vipMemoryRemaining.toFixed(0)}s`}
                    </span>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] font-bold text-[#15803D] shrink-0">
                      Regular · Patient
                    </span>
                  )}
                </div>

                {/* Prompt 3: VIP Memory Order Speech Bubble (Fades after 5 seconds with optional Peek button) */}
                {order.isVip && st.vipOrderHidden ? (
                  <div
                    data-testid="vip-memory-hidden"
                    className="flex items-center justify-between gap-2 py-0.5"
                  >
                    <p className="text-[10px] sm:text-xs font-bold text-[#7C2D12]">
                      🧠 VIP Order faded! Serve from memory for 2x Tips!
                    </p>
                    <button
                      type="button"
                      data-testid="peek-vip-btn"
                      onClick={handlePeekVipOrder}
                      className="px-2 py-0.5 rounded bg-[#D97706] hover:bg-[#B45309] text-[#FFFBEB] text-[10px] font-bold cursor-pointer shrink-0"
                    >
                      👁 Peek
                    </button>
                  </div>
                ) : (
                  <>
                    <p
                      data-testid="customer-dialogue"
                      className="text-[10px] sm:text-[12px] leading-snug font-semibold text-[#231109] line-clamp-1 sm:line-clamp-2"
                    >
                      “{order.greeting}”
                    </p>

                    <div className="mt-0.5 pt-0.5 border-t border-[#D97706]/25 text-[10px] sm:text-[11px] font-bold text-[#7C2D12] truncate">
                      <span>
                        {order.cupsCount > 1 ? `${order.cupsCount}x ` : ''}
                        {SPICE_LABELS[order.spice].name}
                      </span>
                      <span className="mx-1" aria-hidden="true">·</span>
                      <span>{SUGAR_LABELS[order.sugarLevel]}</span>
                      <span className="mx-1" aria-hidden="true">·</span>
                      <span>{CUP_LABELS[order.cup].name}</span>
                      <span className="mx-1" aria-hidden="true">·</span>
                      <span>{SNACK_LABELS[order.snack].name}</span>
                    </div>
                  </>
                )}
              </section>
            </div>

            {/* SLEEK NOSTALGIC RADIO SCROLLING TICKER AT BOTTOM EDGE */}
            <div
              data-testid="nostalgic-radio-ticker"
              onClick={handleRadioTuneClick}
              title="Click to tune Nostalgic Radio broadcast"
              className="pointer-events-auto w-full max-w-full overflow-hidden bg-[#231109]/90 border border-[#F59E0B]/50 rounded-full py-0.5 px-3 cursor-pointer"
            >
              <div className="radio-ticker-scroll text-[10px] sm:text-xs font-semibold text-[#FDE68A] tracking-wide">
                <span className="mr-12">{radioInfo.tickerText}</span>
                <span className="mr-12">{radioInfo.tickerText}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. BAZAAR MODAL: WHOLESALE MARKET (INVENTORY) & STALL UPGRADES
      ===================================================================== */}
      {isShopOpen && shellMode === 'playing' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shop-modal-title"
          className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-black/75"
        >
          <div className="w-full max-w-2xl bg-[#FDF6E7] border-4 border-[#9A3412] rounded-3xl p-4 sm:p-6 shadow-2xl text-[#2C160C] max-h-[90vh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#D97706]/30 pb-3 mb-3">
              <div>
                <h2 id="shop-modal-title" className="font-display font-bold text-2xl sm:text-3xl text-[#2C160C]">
                  Tapri Bazaar &amp; Wholesale Market
                </h2>
                <p className="text-xs sm:text-sm font-medium text-[#7C2D12]">
                  Restock daily ingredients or unlock permanent stall upgrades
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-[#2C160C] text-[#FFFBEB] px-3 py-1.5 rounded-xl border-2 border-[#F59E0B] font-mono-num font-bold text-base sm:text-lg whitespace-nowrap">
                  {Math.round(gameState.coins)} Coins
                </div>
                <button
                  type="button"
                  onClick={() => setIsShopOpen(false)}
                  className="min-h-[42px] px-3.5 py-1.5 rounded-xl bg-[#9A3412] hover:bg-[#7C2D12] text-[#FFFBEB] font-bold text-sm sm:text-base cursor-pointer whitespace-nowrap"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Tab Switcher: Stall Upgrades vs Wholesale Inventory */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                data-testid="tab-upgrades-btn"
                onClick={() => setShopTab('upgrades')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-sm sm:text-base border-2 cursor-pointer ${
                  shopTab === 'upgrades'
                    ? 'bg-[#2C160C] text-[#FDE68A] border-[#F59E0B]'
                    : 'bg-[#FFFBEB] text-[#7C2D12] border-[#D97706]/40'
                }`}
              >
                ✨ Stall Upgrades ({gameState.unlockedUpgrades.length}/{UPGRADE_CATALOG.length})
              </button>
              <button
                type="button"
                data-testid="tab-wholesale-btn"
                onClick={() => setShopTab('wholesale')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-sm sm:text-base border-2 cursor-pointer ${
                  shopTab === 'wholesale'
                    ? 'bg-[#2C160C] text-[#FDE68A] border-[#F59E0B]'
                    : 'bg-[#FFFBEB] text-[#7C2D12] border-[#D97706]/40'
                }`}
              >
                🥛 Wholesale Inventory (🥛{inv.milk} 🍃{inv.teaLeaves} 🔥{inv.gas})
              </button>
            </div>

            {shopTab === 'wholesale' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {WHOLESALE_CATALOG.map((pack) => {
                  const currentAmt = inv[pack.id];
                  const canAfford = gameState.coins >= pack.cost;
                  const isFull = currentAmt >= pack.maxCap;

                  return (
                    <div
                      key={pack.id}
                      className="flex flex-col justify-between gap-2 p-3.5 rounded-2xl bg-[#FFFBEB] border-2 border-[#D97706]/40"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="font-display font-bold text-lg text-[#2C160C]">
                            {pack.name}
                          </h3>
                          <span className="font-mono-num font-bold text-sm px-2 py-0.5 rounded bg-[#FEF3C7] text-[#9A3412]">
                            {currentAmt}/{pack.maxCap}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#7C2D12]">
                          {pack.hindiName} · +{pack.unitsAdded} per pack
                        </p>
                      </div>

                      <button
                        type="button"
                        data-testid={`buy-wholesale-${pack.id}`}
                        disabled={!canAfford || isFull}
                        onClick={() => handleBuyWholesale(pack.id)}
                        className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-sm border-2 cursor-pointer ${
                          isFull
                            ? 'bg-[#14532D] border-[#4ADE80] text-[#FFFBEB] cursor-default'
                            : canAfford
                              ? 'bg-[#D97706] hover:bg-[#B45309] border-[#2C160C] text-[#FFFBEB]'
                              : 'bg-[#E5E7EB] border-[#9CA3AF] text-[#6B7280] cursor-not-allowed'
                        }`}
                      >
                        {isFull
                          ? '✓ Stock Full'
                          : `Restock +${pack.unitsAdded} · ${pack.cost} Coins`}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {UPGRADE_CATALOG.map((item) => {
                  const owned = gameState.unlockedUpgrades.includes(item.id);
                  const canAfford = gameState.coins >= item.cost;

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FFFBEB] border-2 border-[#D97706]/40"
                    >
                      <div>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h3 className="font-display font-bold text-lg sm:text-xl text-[#2C160C]">
                            {item.name}
                          </h3>
                          <span className="text-xs sm:text-sm font-semibold text-[#9A3412]">
                            · {item.hindiSubtitle}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-[#431E0F] mt-0.5">{item.description}</p>
                        <p className="text-xs font-bold text-[#B45309] mt-0.5">{item.roleClue}</p>
                      </div>

                      <button
                        type="button"
                        data-testid={`buy-upgrade-${item.id}`}
                        disabled={owned || !canAfford}
                        onClick={() => handleBuyUpgrade(item.id)}
                        className={`min-h-[48px] px-4 py-2 rounded-xl font-bold text-sm sm:text-base shrink-0 border-2 cursor-pointer whitespace-nowrap ${
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
            )}
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
            <p className="text-base font-medium text-[#7C2D12] mt-1">
              Take a breather—your tapri ledger and recipes are safe.
            </p>

            <div className="grid grid-cols-2 gap-3 my-4 p-3 rounded-2xl bg-[#FFFBEB] border border-[#D97706]/40">
              <div>
                <div className="text-xs font-bold uppercase text-[#9A3412]">Gullak Coins</div>
                <div className="font-mono-num font-bold text-2xl text-[#2C160C]">
                  {Math.round(gameState.coins)}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-[#9A3412]">Day {gameState.day} Timer</div>
                <div className="font-mono-num font-bold text-2xl text-[#2C160C]">
                  {formatDayTimer(gameState.dayTimerSeconds)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShellMode('playing')}
                className="w-full min-h-[56px] py-3 rounded-full bg-[#15803D] hover:bg-[#166534] text-[#FFFBEB] font-display font-bold text-xl border-2 border-[#86EFAC] cursor-pointer"
              >
                Resume Brewing
              </button>

              <button
                type="button"
                onClick={handleResetFreshDay}
                className="w-full min-h-[52px] py-2.5 rounded-full bg-[#D97706] hover:bg-[#B45309] text-[#FFFBEB] font-bold text-lg border-2 border-[#2C160C] cursor-pointer"
              >
                Restart Current Order
              </button>

              <button
                type="button"
                onClick={() => setShellMode('title')}
                className="w-full min-h-[48px] py-2 rounded-full bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#2C160C] font-bold text-base cursor-pointer"
              >
                Return to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. PROMPT 7: END-OF-DAY ACCOUNTING LEDGER & UPGRADE SHOP ('gameover')
      ===================================================================== */}
      {shellMode === 'gameover' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-complete-title"
          data-testid="end-of-day-ledger"
          className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-black/80"
        >
          <div className="w-full max-w-xl bg-[#FDF6E7] border-4 border-[#F59E0B] rounded-3xl p-4 sm:p-6 text-center shadow-2xl text-[#2C160C] max-h-[92vh] overflow-y-auto">
            <div className="inline-block px-3.5 py-1 rounded-full bg-[#FEF3C7] border border-[#D97706] text-[#9A3412] font-bold text-xs uppercase tracking-wider mb-1">
              Day {gameState.day} Accounting Ledger
            </div>

            <h2 id="day-complete-title" className="font-display font-bold text-2xl sm:text-3xl text-[#2C160C]">
              Evening Hisaab-Kitaab (Ledger)
            </h2>

            {/* Detailed Accounting Breakdown Table */}
            <div className="my-3 p-3.5 rounded-2xl bg-[#FFFBEB] border-2 border-[#D97706]/50 text-left space-y-1.5 text-xs sm:text-sm">
              <div className="flex justify-between font-semibold">
                <span>Teas Sold Today:</span>
                <span className="font-mono-num font-bold">{ledger.teasSoldToday} Cups</span>
              </div>
              <div className="flex justify-between font-semibold text-[#15803D]">
                <span>Base Chai &amp; Snack Revenue:</span>
                <span className="font-mono-num font-bold">+{ledger.baseRevenueToday} Coins</span>
              </div>
              <div className="flex justify-between font-semibold text-[#0F766E]">
                <span>Tips Earned (Sweet-Spot, VIP Memory &amp; Rain):</span>
                <span className="font-mono-num font-bold">+{ledger.tipsEarnedToday} Coins</span>
              </div>
              <div className="flex justify-between font-semibold text-[#DC2626]">
                <span>Penalties from Spills / Over-Sweet:</span>
                <span className="font-mono-num font-bold">-{ledger.penaltiesToday} Coins</span>
              </div>
              <div className="border-t border-[#D97706]/40 pt-1.5 flex justify-between text-sm sm:text-base font-bold text-[#2C160C]">
                <span>Net Profit Today (+15 Evening Bonus):</span>
                <span className="font-mono-num text-[#15803D]">
                  +{netProfitToday + 15} Coins (Total: {Math.round(gameState.coins)} Coins)
                </span>
              </div>
            </div>

            {/* Quick Wholesale Restock before Next Day */}
            <div className="mb-3 text-left">
              <div className="text-xs font-bold uppercase tracking-wider text-[#9A3412] mb-1.5">
                Wholesale Restock for Day {gameState.day + 1}:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {WHOLESALE_CATALOG.map((pack) => {
                  const amt = inv[pack.id];
                  const canAfford = gameState.coins >= pack.cost;
                  const full = amt >= pack.maxCap;
                  return (
                    <button
                      key={pack.id}
                      type="button"
                      disabled={!canAfford || full}
                      onClick={() => handleBuyWholesale(pack.id)}
                      className={`p-2 rounded-xl border text-left text-xs font-bold cursor-pointer ${
                        full
                          ? 'bg-[#14532D] border-[#4ADE80] text-[#FFFBEB]'
                          : canAfford
                            ? 'bg-[#FFFBEB] hover:bg-[#FEF3C7] border-[#D97706] text-[#2C160C]'
                            : 'bg-[#E5E7EB] border-[#9CA3AF] text-[#6B7280] cursor-not-allowed'
                      }`}
                    >
                      <div className="truncate">{pack.name.split(' ')[0]} ({amt}/{pack.maxCap})</div>
                      <div className="text-[10px] text-[#9A3412]">
                        {full ? '✓ Full' : `+${pack.unitsAdded} · ${pack.cost}c`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              data-start="true"
              onClick={handleStartGame}
              className="w-full min-h-[56px] py-3 rounded-full bg-[#D97706] hover:bg-[#B45309] text-[#FFFBEB] font-display font-bold text-xl sm:text-2xl border-2 border-[#2C160C] shadow-lg cursor-pointer"
            >
              Start Day {gameState.day + 1} Morning
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
