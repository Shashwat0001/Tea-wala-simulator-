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
  UpgradeId,
  WholesaleResourceId,
  SpiceType,
} from './game/rules';
import {
  TapriScene3D,
  InteractiveStationTarget,
  WorldScreenAnchors,
} from './game/TapriScene3D';
import { soundEngine } from './game/sound';
import {
  TitleEmblemSvg,
  CurvedProgressRingSvg,
  MortarSvgIcon,
  GullakCoinSvgIcon,
  VintageRadioSvgIcon,
  SpiceSvgIcon,
  BrewStepSvgIcon,
  CupSvgIcon,
  SnackSvgIcon,
  SugarDotsIcon,
} from './components/TapriIcons';

const STORAGE_KEY = 'cozy_chai_tapri_save_v1';

type ShellMode = 'title' | 'playing' | 'paused' | 'gameover';

const DEFAULT_ANCHORS: WorldScreenAnchors = {
  mortar: { x: 26, y: 58 },
  stove: { x: 50, y: 56 },
  tray: { x: 74, y: 58 },
  radio: { x: 18, y: 46 },
  customer: { x: 74, y: 28 },
  spill: { x: 64, y: 66 },
};

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
  const [isMuted, setIsMuted] = useState(false);
  const [isMusicOn, setIsMusicOn] = useState(true);
  const [loFiTrackName, setLoFiTrackName] = useState(() => soundEngine.getLoFiTrackName());
  const [pourMeterPos, setPourMeterPos] = useState<number>(50);
  const [worldAnchors, setWorldAnchors] = useState<WorldScreenAnchors>(DEFAULT_ANCHORS);
  const [hovered3DTarget, setHovered3DTarget] = useState<InteractiveStationTarget | null>(null);
  const [isRadioTooltipPinned, setIsRadioTooltipPinned] = useState(false);
  const [isRadioHoveredUI, setIsRadioHoveredUI] = useState(false);
  const [servingToast, setServingToast] = useState<{
    customerName: string;
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
  const radioTooltipTimerRef = useRef<number | null>(null);

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

  const showTemporaryRadioTooltip = useCallback(() => {
    setIsRadioTooltipPinned(true);
    if (radioTooltipTimerRef.current) {
      window.clearTimeout(radioTooltipTimerRef.current);
    }
    radioTooltipTimerRef.current = window.setTimeout(() => {
      setIsRadioTooltipPinned(false);
    }, 3200);
  }, []);

  // Station 1 Handler: Crush Spices in Mortar & Pestle
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

  // Wipe Cloth Cleanup Handler
  const handleWipeCounterSpill = useCallback(() => {
    const curr = gameStateRef.current;
    if (!curr.station.hasSpillOnCounter) return;
    const next = cleanCounterSpill(curr);
    soundEngine.playWipeClean();
    sceneRef.current?.triggerWipeCleanEffect();
    setGameState(next);
  }, []);

  // Sweet-Spot Pour Evaluation Handler
  const handleSweetSpotPourAtPosition = useCallback(
    (meterValue: number) => {
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
        sceneRef.current?.triggerTrayActionEffect(true, true);
      } else {
        soundEngine.playLiquidPour();
        sceneRef.current?.triggerTrayActionEffect(true, false);
      }
      setGameState(nextState);
    },
    [handleWipeCounterSpill],
  );

  // Station 3 Handler: Pour into Cup, Add Snack, Wipe Spill, or Serve Customer
  const handleStation3PlateOrServe = useCallback(() => {
    const curr = gameStateRef.current;
    if (curr.station.hasSpillOnCounter) {
      handleWipeCounterSpill();
      return;
    }
    if (!curr.station.isBoiled) return;

    if (!curr.station.pouredCup) {
      handleSweetSpotPourAtPosition(pourMeterPosRef.current);
      return;
    }

    if (!curr.station.platedSnack) {
      const next = plateOrderStep(curr, { snack: curr.currentCustomer.snack });
      soundEngine.playSnackPlace();
      sceneRef.current?.triggerTrayActionEffect(false, false);
      setGameState(next);
      return;
    }

    // Order is ready -> Serve Customer!
    const prevRadio = curr.radioEvent;
    const customerName = curr.currentCustomer.name;
    const wasVipMemory = curr.currentCustomer.isVip && !curr.station.vipPeeked;
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
        showTemporaryRadioTooltip();
      }, 350);
    }

    const badges: string[] = [];
    if (wasPerfectPour) badges.push('Perfect Pour');
    if (wasVipMemory) badges.push('2x VIP');

    setServingToast({
      customerName,
      coins: earnedCoins,
      badge: badges.length > 0 ? badges.join(' · ') : undefined,
    });
    setGameState(nextState);

    if (dayCompleted) {
      setTimeout(() => {
        setShellMode('gameover');
      }, 650);
    }
  }, [handleWipeCounterSpill, handleSweetSpotPourAtPosition, showTemporaryRadioTooltip]);

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

  // Radio Manual Tune Handler (Shows elegant tooltip over 3D Vintage Radio)
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
    showTemporaryRadioTooltip();
    setGameState(next);
  }, [showTemporaryRadioTooltip]);

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

    const scene3d = new TapriScene3D(
      container,
      (target) => {
        handle3DStationClick(target);
      },
      (anchors, hovered) => {
        setWorldAnchors(anchors);
        setHovered3DTarget(hovered);
      },
    );
    sceneRef.current = scene3d;
    scene3d.syncGameState(gameStateRef.current, shellModeRef.current);
    setWorldAnchors(scene3d.getProjectedAnchors());

    return () => {
      scene3d.dispose();
      sceneRef.current = null;
    };
  }, [handle3DStationClick]);

  // Gameplay tick (200ms)
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

  // Auto-hide serving toast after 2.6s
  useEffect(() => {
    if (!servingToast) return;
    const timer = window.setTimeout(() => {
      setServingToast(null);
    }, 2600);
    return () => clearTimeout(timer);
  }, [servingToast]);

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

      if (mode === 'title' || mode === 'gameover') {
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

  // Compute Station 2 current visual step icon & progress
  const stoveStepKey: 'water' | 'tea' | 'milk' | 'lemon' | 'spices' | 'boil' | 'done' =
    !st.waterAdded
      ? 'water'
      : !st.teaLeavesAdded
        ? 'tea'
        : !st.milkOrLemonAdded
          ? order.teaBase === 'black_lemon_chai'
            ? 'lemon'
            : 'milk'
          : !st.spicesInPot
            ? 'spices'
            : !st.isBoiled
              ? 'boil'
              : 'done';

  const stoveIngredientProgress =
    (st.waterAdded ? 18 : 0) +
    (st.teaLeavesAdded ? 18 : 0) +
    (st.milkOrLemonAdded ? 18 : 0) +
    (st.spicesInPot ? 18 : 0) +
    Math.round(st.boilProgress * 0.28);

  const trayProgress = readyToServe ? 100 : st.pouredCup ? 50 : 0;

  const isRadioTooltipVisible =
    hovered3DTarget === 'station_radio' || isRadioHoveredUI || isRadioTooltipPinned;

  return (
    <main className="relative w-full h-[100dvh] max-w-full overflow-hidden select-none bg-[#2b1810]">
      {/* Isolated 3D WebGL Viewport Container */}
      <div
        ref={canvasMountRef}
        data-testid="tapri-3d-canvas"
        className="absolute inset-0 w-full h-full"
      />

      {/* =====================================================================
          1. TITLE SCREEN OVERLAY (Minimalist & Cozy)
      ===================================================================== */}
      {shellMode === 'title' && (
        <div
          className="fixed inset-0 z-20 flex flex-col items-center justify-between safe-area-hud py-6 px-4 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 44%, rgba(67, 30, 15, 0.05) 0%, rgba(36, 16, 8, 0.65) 100%)',
          }}
        >
          <div className="flex flex-col items-center w-full max-w-[340px] sm:max-w-[460px] pointer-events-auto">
            <TitleEmblemSvg />
          </div>

          <div className="flex flex-col items-center gap-3 mb-2 w-full max-w-md pointer-events-auto">
            <button
              type="button"
              data-start="true"
              onClick={handleStartGame}
              className="cozy-interactive-glow w-full sm:w-auto px-12 py-4 min-h-[64px] rounded-full bg-[#D97706] hover:bg-[#B45309] active:scale-[0.98] text-[#FFFBEB] font-display font-bold text-2xl sm:text-3xl tracking-wide border-2 border-[#FDE68A] shadow-[0_8px_24px_rgba(0,0,0,0.65)] cursor-pointer whitespace-nowrap"
            >
              Open Chai Stall
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. STREAMLINED HUD & CURVED WORLD-SPACE UI ('playing')
      ===================================================================== */}
      {shellMode === 'playing' && (
        <div className="fixed inset-0 z-10 pointer-events-none safe-area-hud flex flex-col justify-between w-full max-w-full overflow-hidden">
          {/* -----------------------------------------------------------------
              TOP PERIMETER: Consolidated Single Frosted-Glass Pill (Left)
              + Compact Icon Controls (Right)
          ----------------------------------------------------------------- */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full">
            {/* CONSOLIDATED SINGLE FROSTED-GLASS PILL: Coins + Day/Timer + Stock */}
            <div className="pointer-events-auto frosted-pill flex items-center gap-1.5 sm:gap-3 border border-[#FDE68A]/45 rounded-full px-2.5 sm:px-4 py-1 sm:py-1.5 min-h-[38px] sm:min-h-[48px] min-w-0 shrink">
              <div className="flex items-center gap-1" title="Gullak Coins">
                <GullakCoinSvgIcon className="w-4 h-4 sm:w-6 sm:h-6 shrink-0" />
                <span
                  data-testid="hud-coins"
                  className="font-mono-num text-xs sm:text-lg font-bold text-[#FFFBEB]"
                >
                  {Math.round(gameState.coins)}
                </span>
              </div>

              <div className="h-3.5 sm:h-4 w-[1px] bg-[#FDE68A]/25 shrink-0" />

              <div className="flex items-center gap-1 text-[11px] sm:text-sm font-mono-num font-bold text-[#FDE68A] whitespace-nowrap">
                <span className="text-[#FCD34D]">D{gameState.day}</span>
                <span data-testid="hud-served" className="text-[#FFFBEB]">
                  {gameState.customersServedToday}/{gameState.customersPerDay}
                </span>
                <span className="text-[10px] sm:text-xs text-[#FDE68A]/80">
                  ·{formatDayTimer(gameState.dayTimerSeconds)}
                </span>
              </div>

              <div className="h-3.5 sm:h-4 w-[1px] bg-[#FDE68A]/25 shrink-0" />

              {/* Compact Stock Pill Trigger */}
              <button
                type="button"
                data-testid="inventory-gauges-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShopTab('wholesale');
                  setIsShopOpen(true);
                }}
                title="Wholesale Stock (Milk, Tea Leaves, Sugar, Gas)"
                className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] sm:text-xs font-mono-num font-bold text-[#FFFBEB] cursor-pointer whitespace-nowrap shrink-0"
              >
                <span className={inv.milk <= 2 ? 'text-[#F87171]' : ''}>🥛{inv.milk}</span>
                <span className={`hidden sm:inline ${inv.teaLeaves <= 2 ? 'text-[#F87171]' : ''}`}>
                  🍃{inv.teaLeaves}
                </span>
                <span className={`hidden sm:inline ${inv.gas <= 2 ? 'text-[#F87171]' : ''}`}>
                  🔥{inv.gas}
                </span>
              </button>
            </div>

            {/* TOP-RIGHT ICON PILLS: Bazaar Shop, Music, Mute, Pause */}
            <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                data-testid="decorate-shop-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShopTab('upgrades');
                  setIsShopOpen(true);
                }}
                aria-label="Open Bazaar Shop and Upgrades"
                title="Bazaar Upgrades & Stock [S]"
                className="cozy-interactive-glow frosted-pill h-9 w-9 sm:w-auto sm:h-11 sm:px-3.5 rounded-full border border-[#FDE68A]/60 text-[#FFFBEB] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <span className="text-sm sm:text-base">🏮</span>
                <span className="hidden sm:inline">Bazaar</span>
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label={isMusicOn ? 'Pause Background Music' : 'Play Background Music'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleToggleMusic();
                }}
                title={`Music: ${loFiTrackName}`}
                className={`cozy-interactive-glow frosted-pill w-9 h-9 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center cursor-pointer shrink-0 ${
                  isMusicOn && !isMuted
                    ? 'border-[#FACC15]/70 text-[#FDE047]'
                    : 'border-white/20 text-[#A88973]'
                }`}
              >
                <span className="text-xs sm:text-base font-bold">♫</span>
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleToggleMute();
                }}
                className="cozy-interactive-glow frosted-pill w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-[#FDE68A]/45 text-[#FFFBEB] flex items-center justify-center cursor-pointer shrink-0"
              >
                {isMuted ? (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Pause Game"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShellMode('paused');
                }}
                className="cozy-interactive-glow frosted-pill w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-[#FDE68A]/45 text-[#FFFBEB] flex items-center justify-center cursor-pointer shrink-0"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              </button>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              3D WORLD-SPACE UI LAYER (Hovers directly over 3D objects!)
          ----------------------------------------------------------------- */}
          <div className="relative flex-1 w-full h-full pointer-events-none">
            {/* A. VINTAGE RADIO WORLD-SPACE ICON & HOVER/TAP TOOLTIP */}
            <div
              style={{
                left: `${Math.max(10, Math.min(35, worldAnchors.radio.x))}%`,
                top: `${Math.max(22, Math.min(58, worldAnchors.radio.y - 6))}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex flex-col items-center z-20"
              onMouseEnter={() => setIsRadioHoveredUI(true)}
              onMouseLeave={() => setIsRadioHoveredUI(false)}
            >
              {/* Small, Elegant Tooltip that ONLY appears when hovering or tapping the 3D Vintage Radio */}
              {isRadioTooltipVisible && (
                <div
                  role="tooltip"
                  data-testid="nostalgic-radio-ticker"
                  className="mb-1.5 px-3 py-1 rounded-full frosted-pill border border-[#FDE047]/70 text-[#FFFBEB] text-[11px] sm:text-xs font-semibold whitespace-nowrap shadow-lg flex items-center gap-1.5 animate-fade-in"
                >
                  <span className="text-[#FDE047]">📻</span>
                  <span data-testid="radio-event-title">{radioInfo.title}</span>
                  <span className="text-[#FDE68A]/80 hidden sm:inline">
                    · {loFiTrackName}
                  </span>
                </div>
              )}

              <button
                type="button"
                data-testid="world-radio-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleRadioTuneClick();
                }}
                aria-label={`Vintage Radio: ${radioInfo.title}`}
                className="cozy-interactive-glow w-9 h-9 sm:w-10 sm:h-10 rounded-full frosted-pill border border-[#F59E0B]/70 flex items-center justify-center shadow-md cursor-pointer"
              >
                <VintageRadioSvgIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* B. MINIMALIST ICON-FIRST CUSTOMER ORDER BUBBLE (World-Space over Customer) */}
            <section
              aria-label="Customer Order"
              data-testid="customer-order-card"
              style={{
                left: `${Math.max(54, Math.min(82, worldAnchors.customer.x))}%`,
                top: `${Math.max(14, Math.min(34, worldAnchors.customer.y - 10))}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto bg-[#FDF6E7]/92 border-2 border-[#9A3412] rounded-2xl px-3 py-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.48)] max-w-[230px] sm:max-w-[260px]"
            >
              <div className="flex items-center justify-between gap-2 pb-1 mb-1 border-b border-[#D97706]/25">
                <span className="font-display font-bold text-xs sm:text-sm text-[#2C160C] truncate">
                  {order.name}
                </span>

                {order.isVip ? (
                  <span
                    data-testid="vip-badge"
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#7C2D12] text-[#FDE047] shrink-0"
                  >
                    {st.vipOrderHidden ? '🌟 2x' : `🌟 ${st.vipMemoryRemaining.toFixed(0)}s`}
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" title="Patient Regular" />
                )}
              </div>

              {order.isVip && st.vipOrderHidden ? (
                <div
                  data-testid="vip-memory-hidden"
                  className="flex items-center justify-between gap-2 py-0.5"
                >
                  <span className="text-[11px] font-bold text-[#7C2D12]">🧠 Memory 2x</span>
                  <button
                    type="button"
                    data-testid="peek-vip-btn"
                    onClick={handlePeekVipOrder}
                    className="px-2 py-0.5 rounded-full bg-[#D97706] hover:bg-[#B45309] text-[#FFFBEB] text-[10px] font-bold cursor-pointer"
                  >
                    👁
                  </button>
                </div>
              ) : (
                <div
                  data-testid="customer-dialogue"
                  title={order.greeting}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 py-0.5"
                >
                  {order.cupsCount > 1 && (
                    <span className="text-[10px] font-mono-num font-bold px-1 py-0.5 rounded bg-[#9A3412] text-[#FFFBEB]">
                      {order.cupsCount}×
                    </span>
                  )}
                  <span
                    className="p-1 rounded-lg bg-[#FEF3C7] border border-[#D97706]/40"
                    title={SPICE_LABELS[order.spice].name}
                  >
                    <SpiceSvgIcon spice={order.spice} className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                  <span
                    className="p-1 rounded-lg bg-[#FEF3C7] border border-[#D97706]/40"
                    title={order.teaBase === 'black_lemon_chai' ? 'Black Lemon' : 'Milk Chai'}
                  >
                    <BrewStepSvgIcon
                      step={order.teaBase === 'black_lemon_chai' ? 'lemon' : 'milk'}
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                  </span>
                  <SugarDotsIcon level={order.sugarLevel} />
                  <span
                    className="p-1 rounded-lg bg-[#FEF3C7] border border-[#D97706]/40"
                    title={CUP_LABELS[order.cup].name}
                  >
                    <CupSvgIcon cup={order.cup} className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                  <span
                    className="p-1 rounded-lg bg-[#FEF3C7] border border-[#D97706]/40"
                    title={SNACK_LABELS[order.snack].name}
                  >
                    <SnackSvgIcon snack={order.snack} className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                </div>
              )}
            </section>

            {/* C. STATION 1 WORLD-SPACE CURVED NODE (Hovers directly over 3D Mortar & Pestle) */}
            <div
              style={{
                left: `${Math.max(15, Math.min(34, worldAnchors.mortar.x))}%`,
                top: `${Math.max(50, Math.min(74, worldAnchors.mortar.y + 4))}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex flex-col items-center gap-1"
            >
              {/* Curved Pestle Scrub Pill above Mortar when active */}
              {st.crushCount < 3 && (
                <div
                  data-testid="masala-minigame-bar"
                  onPointerDown={(e) => {
                    isDraggingMortarRef.current = true;
                    lastDragXRef.current = e.clientX;
                    handleMortarDragScrub(20);
                  }}
                  onPointerMove={(e) => {
                    if (!isDraggingMortarRef.current || lastDragXRef.current === null) return;
                    const dx = Math.abs(e.clientX - lastDragXRef.current);
                    if (dx >= 10) {
                      lastDragXRef.current = e.clientX;
                      handleMortarDragScrub(18);
                    }
                  }}
                  onPointerUp={() => {
                    isDraggingMortarRef.current = false;
                    lastDragXRef.current = null;
                  }}
                  title="Tap or drag left-right to crush spices"
                  className="frosted-pill px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-[#FACC15]/80 flex items-center gap-1.5 cursor-ew-resize shadow-lg"
                >
                  <SpiceSvgIcon spice={order.spice} className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <div className="w-10 sm:w-16 h-1.5 sm:h-2 bg-black/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#F59E0B] to-[#4ADE80] transition-all duration-100"
                      style={{ width: `${st.crushProgress}%` }}
                    />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono-num font-bold text-[#86EFAC]">
                    {Math.ceil(st.masalaTimerRemaining)}s
                  </span>
                </div>
              )}

              {/* Curved Circular World-Space Button */}
              <button
                type="button"
                data-testid="station-mortar-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleStation1Crush();
                }}
                disabled={st.crushCount >= 3}
                aria-label="Station 1: Crush Spices in Mortar"
                className={`cozy-interactive-glow relative w-14 h-14 sm:w-[68px] sm:h-[68px] rounded-full frosted-pill flex flex-col items-center justify-center cursor-pointer ${
                  st.crushCount >= 3
                    ? 'opacity-80'
                    : guided.stationNumber === 1
                      ? 'ring-2 ring-[#FDE047] scale-105'
                      : ''
                }`}
              >
                <CurvedProgressRingSvg
                  progress={st.crushCount >= 3 ? 100 : st.crushProgress}
                  size={68}
                  color={st.crushCount >= 3 ? '#4ADE80' : '#FACC15'}
                />
                {st.crushCount >= 3 ? (
                  <BrewStepSvgIcon step="done" className="w-6 h-6 sm:w-7 sm:h-7" />
                ) : (
                  <MortarSvgIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                )}
                <span className="text-[9px] sm:text-[10px] font-mono-num font-bold text-[#FDE68A] leading-none mt-0.5">
                  {st.crushCount}/3
                </span>
              </button>
            </div>

            {/* D. STATION 2 WORLD-SPACE CURVED NODE (Hovers directly over 3D Brass Patila & Stove) */}
            <div
              style={{
                left: `${Math.max(42, Math.min(58, worldAnchors.stove.x))}%`,
                top: `${Math.max(48, Math.min(72, worldAnchors.stove.y + 4))}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex flex-col items-center"
            >
              <button
                type="button"
                data-testid="station-stove-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleStation2Brew('auto_next');
                }}
                disabled={st.isBoiled}
                aria-label="Station 2: Brew Chai on Stove"
                className={`cozy-interactive-glow relative w-14 h-14 sm:w-[70px] sm:h-[70px] rounded-full frosted-pill flex flex-col items-center justify-center cursor-pointer ${
                  st.isBoiled
                    ? 'opacity-85'
                    : guided.stationNumber === 2
                      ? 'ring-2 ring-[#FDE047] scale-105'
                      : ''
                }`}
              >
                <CurvedProgressRingSvg
                  progress={st.isBoiled ? 100 : stoveIngredientProgress}
                  size={70}
                  color={st.isBoiled ? '#4ADE80' : '#FB923C'}
                />
                <BrewStepSvgIcon step={stoveStepKey} className="w-6 h-6 sm:w-7 sm:h-7" />
                <span className="text-[9px] sm:text-[10px] font-mono-num font-bold text-[#FDE68A] leading-none mt-0.5">
                  {st.isBoiled ? '100%' : `${Math.round(stoveIngredientProgress)}%`}
                </span>
              </button>
            </div>

            {/* E. STATION 3 WORLD-SPACE CURVED NODE & SWEET-SPOT METER (Hovers over 3D Serving Tray) */}
            <div
              style={{
                left: `${Math.max(66, Math.min(85, worldAnchors.tray.x))}%`,
                top: `${Math.max(50, Math.min(74, worldAnchors.tray.y + 4))}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex flex-col items-center gap-1"
            >
              {/* Curved Sweet-Spot Pour Meter Pill directly above the 3D Tray */}
              {st.isBoiled && !st.pouredCup && !st.hasSpillOnCounter && (
                <div
                  data-testid="sweet-spot-meter"
                  className="frosted-pill px-2.5 py-1 rounded-full border border-[#4ADE80] flex items-center gap-1.5 shadow-xl"
                >
                  <div
                    onClick={() => handleSweetSpotPourAtPosition(pourMeterPos)}
                    title="Click in the green zone for a Perfect Pour!"
                    className="relative w-20 sm:w-24 h-3 rounded-full overflow-hidden border border-white/50 cursor-pointer"
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
                    aria-label="Pour Chai Now"
                    className="px-2 py-0.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-[#FFFBEB] font-bold text-[10px] cursor-pointer"
                  >
                    🫗
                  </button>

                  <button
                    type="button"
                    data-testid="force-spill-btn"
                    onClick={() => handleSweetSpotPourAtPosition(8)}
                    title="Trigger Red-Zone Spill"
                    aria-label="Trigger Spill"
                    className="px-1.5 py-0.5 rounded-full bg-[#7F1D1D] hover:bg-[#991B1B] text-[#FECACA] font-bold text-[10px] cursor-pointer"
                  >
                    💧
                  </button>
                </div>
              )}

              {/* Wipe Cloth World-Space Badge when a spill is on the counter */}
              {st.hasSpillOnCounter && (
                <button
                  type="button"
                  data-testid="wipe-spill-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleWipeCounterSpill();
                  }}
                  className="cozy-interactive-glow px-3 py-1 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] border-2 border-[#FDE047] text-[#FFFBEB] text-xs font-bold shadow-xl cursor-pointer animate-bounce flex items-center gap-1"
                >
                  <span>🧹</span>
                  <span>Wipe</span>
                </button>
              )}

              {/* Station 3 Curved World-Space Orb */}
              <button
                type="button"
                data-testid="station-tray-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleStation3PlateOrServe();
                }}
                disabled={!st.isBoiled && !st.hasSpillOnCounter}
                aria-label="Station 3: Pour, Plate Snack, or Serve"
                className={`cozy-interactive-glow relative w-14 h-14 sm:w-[68px] sm:h-[68px] rounded-full frosted-pill flex flex-col items-center justify-center cursor-pointer ${
                  !st.isBoiled && !st.hasSpillOnCounter
                    ? 'opacity-50 cursor-not-allowed'
                    : readyToServe
                      ? 'ring-2 ring-[#4ADE80] scale-105'
                      : guided.stationNumber === 3
                        ? 'ring-2 ring-[#FDE047] scale-105'
                        : ''
                }`}
              >
                <CurvedProgressRingSvg
                  progress={trayProgress}
                  size={68}
                  color={readyToServe ? '#4ADE80' : '#2DD4BF'}
                />
                {st.hasSpillOnCounter ? (
                  <span className="text-xl">🧹</span>
                ) : !st.pouredCup ? (
                  <CupSvgIcon cup={order.cup} className="w-6 h-6 sm:w-7 sm:h-7" />
                ) : !st.platedSnack ? (
                  <SnackSvgIcon snack={order.snack} className="w-6 h-6 sm:w-7 sm:h-7" />
                ) : (
                  <BrewStepSvgIcon step="done" className="w-6 h-6 sm:w-7 sm:h-7" />
                )}
                <span className="text-[9px] sm:text-[10px] font-mono-num font-bold text-[#FDE68A] leading-none mt-0.5">
                  {readyToServe ? 'Serve' : `${st.pouredCup ? 1 : 0}/2`}
                </span>
              </button>
            </div>
          </div>

          {/* Celebratory Floating Toast when a drink is served */}
          {servingToast && (
            <div
              role="status"
              data-testid="perfect-celebration-toast"
              className="animate-float-perfect pointer-events-none self-center frosted-pill border-2 border-[#FACC15] text-[#FFFBEB] px-4 py-1.5 rounded-full shadow-2xl text-center"
            >
              <div className="flex items-center justify-center gap-2 text-sm sm:text-lg font-display font-bold text-[#FDE047]">
                <GullakCoinSvgIcon className="w-5 h-5 shrink-0" />
                <span>
                  +{servingToast.coins} · {servingToast.badge ?? servingToast.customerName}
                </span>
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------------
              BOTTOM SAFE-AREA MINIMALIST ACTION PILL (Zero Marquee Clutter!)
          ----------------------------------------------------------------- */}
          <div className="w-full flex items-center justify-center gap-2 pointer-events-none">
            {/* Out-of-stock compact pill if ingredients run out */}
            {!stockCheck.canMake && (
              <div
                data-testid="out-of-stock-banner"
                className="pointer-events-auto frosted-pill border border-[#FCA5A5] rounded-full px-3 py-1 flex items-center gap-2 text-xs text-[#FEF2F2]"
              >
                <span>⚠ {stockCheck.missing.join(', ')}</span>
                <button
                  type="button"
                  onClick={() => {
                    setShopTab('wholesale');
                    setIsShopOpen(true);
                  }}
                  className="px-2 py-0.5 rounded-full bg-[#D97706] font-bold text-[#FFFBEB] cursor-pointer"
                >
                  +Stock
                </button>
                <button
                  type="button"
                  data-testid="turn-away-btn"
                  onClick={handleTurnAwayCustomer}
                  className="px-2 py-0.5 rounded-full bg-[#991B1B] font-bold text-[#FFFBEB] cursor-pointer"
                >
                  Skip
                </button>
              </div>
            )}

            {/* Minimalist Undo + 1-Tap Guided Step Pill */}
            <div className="pointer-events-auto frosted-pill border border-[#FDE68A]/45 rounded-full p-1 flex items-center gap-1.5 shadow-lg">
              <button
                type="button"
                data-testid="empty-tray-undo-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleEmptyTrayUndo();
                }}
                disabled={!canUndoPrep}
                title="Empty Tray / Undo [U]"
                aria-label="Empty Tray or Undo"
                className={`cozy-interactive-glow w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                  canUndoPrep
                    ? 'bg-[#7C2D12] hover:bg-[#9A3412] text-[#FFFBEB] cursor-pointer'
                    : 'bg-white/5 text-[#A88973]/50 cursor-not-allowed'
                }`}
              >
                ↺
              </button>

              <button
                type="button"
                data-testid="guided-next-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleGuidedNextStep();
                }}
                className={`cozy-interactive-glow min-h-[36px] px-4 py-1 rounded-full font-display font-bold text-xs sm:text-sm border transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap ${
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
                  Tapri Bazaar &amp; Wholesale
                </h2>
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
                ✨ Upgrades ({gameState.unlockedUpgrades.length}/{UPGRADE_CATALOG.length})
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
                🥛 Stock (🥛{inv.milk} 🍃{inv.teaLeaves} 🔥{inv.gas})
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
                          {pack.hindiName} · +{pack.unitsAdded}
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
                          ? '✓ Full'
                          : `+${pack.unitsAdded} · ${pack.cost} Coins`}
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
              Chai Break
            </h2>

            <div className="grid grid-cols-2 gap-3 my-4 p-3 rounded-2xl bg-[#FFFBEB] border border-[#D97706]/40">
              <div>
                <div className="text-xs font-bold uppercase text-[#9A3412]">Coins</div>
                <div className="font-mono-num font-bold text-2xl text-[#2C160C]">
                  {Math.round(gameState.coins)}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-[#9A3412]">Day {gameState.day}</div>
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
                Resume
              </button>

              <button
                type="button"
                onClick={handleResetFreshDay}
                className="w-full min-h-[52px] py-2.5 rounded-full bg-[#D97706] hover:bg-[#B45309] text-[#FFFBEB] font-bold text-lg border-2 border-[#2C160C] cursor-pointer"
              >
                Restart Order
              </button>

              <button
                type="button"
                onClick={() => setShellMode('title')}
                className="w-full min-h-[48px] py-2 rounded-full bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#2C160C] font-bold text-base cursor-pointer"
              >
                Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. END-OF-DAY ACCOUNTING LEDGER ('gameover')
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
              Day {gameState.day} Ledger
            </div>

            <h2 id="day-complete-title" className="font-display font-bold text-2xl sm:text-3xl text-[#2C160C]">
              Evening Hisaab-Kitaab
            </h2>

            <div className="my-3 p-3.5 rounded-2xl bg-[#FFFBEB] border-2 border-[#D97706]/50 text-left space-y-1.5 text-xs sm:text-sm">
              <div className="flex justify-between font-semibold">
                <span>Teas Sold:</span>
                <span className="font-mono-num font-bold">{ledger.teasSoldToday} Cups</span>
              </div>
              <div className="flex justify-between font-semibold text-[#15803D]">
                <span>Base Revenue:</span>
                <span className="font-mono-num font-bold">+{ledger.baseRevenueToday} Coins</span>
              </div>
              <div className="flex justify-between font-semibold text-[#0F766E]">
                <span>Tips (Sweet-Spot, VIP &amp; Weather):</span>
                <span className="font-mono-num font-bold">+{ledger.tipsEarnedToday} Coins</span>
              </div>
              <div className="flex justify-between font-semibold text-[#DC2626]">
                <span>Spill Penalties:</span>
                <span className="font-mono-num font-bold">-{ledger.penaltiesToday} Coins</span>
              </div>
              <div className="border-t border-[#D97706]/40 pt-1.5 flex justify-between text-sm sm:text-base font-bold text-[#2C160C]">
                <span>Net Profit (+15 Bonus):</span>
                <span className="font-mono-num text-[#15803D]">
                  +{netProfitToday + 15} Coins (Total: {Math.round(gameState.coins)})
                </span>
              </div>
            </div>

            <div className="mb-3 text-left">
              <div className="text-xs font-bold uppercase tracking-wider text-[#9A3412] mb-1.5">
                Restock for Day {gameState.day + 1}:
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
              Start Day {gameState.day + 1}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
