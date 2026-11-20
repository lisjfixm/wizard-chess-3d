import { useEffect, useMemo, useRef, useState } from 'react';
import { initWizardChess } from './wizardChessEngine.js';
import {
  detectInitialLanguage,
  persistLanguage,
  createTranslator,
  isSupportedLang,
  LANGUAGES
} from './i18n.js';

interface MoveHistoryItem {
  index: number;
  moveNumber: number;
  color: 'w' | 'b';
  pieceType: string;
  san: string;
  fromSq: string;
  toSq: string;
  capture: boolean;
  ready: boolean;
}

interface MoveInsight {
  index: number;
  moveNumber: number;
  color: 'w' | 'b';
  san: string;
  fromSq: string;
  toSq: string;
  badge: string;
  badgeTone: 'gold' | 'emerald' | 'blue' | 'danger';
  summary: string;
  details: string[];
  evalScore: number;
  evalLabel: string;
  deltaPawns: number;
}

interface MoveHistoryState {
  moves: MoveHistoryItem[];
  reviewingIndex: number | null;
  focusedIndex: number | null;
  activeInsight?: MoveInsight | null;
}

interface AIDifficultyLevel {
  id: string;
  tier: number;
  name: string;
  shortName: string;
  elo: number;
  styleTag: string;
  tacticalHint: string;
}

const QUALITY_OPTIONS = ['ultra-low', 'low', 'medium-low', 'medium', 'medium-high', 'high', 'ultra'];

const AI_LEVEL_META: Array<{ id: string; tier: number; elo: number }> = [
  { id: 'rookie', tier: 1, elo: 120 },
  { id: 'scout', tier: 2, elo: 260 },
  { id: 'novice', tier: 3, elo: 400 },
  { id: 'apprentice', tier: 4, elo: 750 },
  { id: 'amateur', tier: 5, elo: 1100 },
  { id: 'club', tier: 6, elo: 1450 },
  { id: 'expert', tier: 7, elo: 1750 },
  { id: 'master', tier: 8, elo: 2050 },
  { id: 'grandmaster', tier: 9, elo: 2400 },
  { id: 'legend', tier: 10, elo: 2650 },
  { id: 'oracle', tier: 11, elo: 2900 }
];

type Translator = (key: string, vars?: Record<string, string | number>) => string;

function localizeAiLevels(t: Translator): AIDifficultyLevel[] {
  return AI_LEVEL_META.map((m) => ({
    id: m.id,
    tier: m.tier,
    elo: m.elo,
    name: t(`ai.level.${m.id}.name`),
    shortName: t(`ai.level.${m.id}.short`),
    styleTag: t(`ai.level.${m.id}.style`),
    tacticalHint: t(`ai.level.${m.id}.hint`)
  }));
}

interface WizardChessApi {
  toggleUI?: (force?: boolean) => void;
  setEffectsEnabled?: (enabled: boolean) => boolean;
  getEffectsEnabled?: () => boolean;
  setSceneMode?: (mode: string) => string;
  getSceneMode?: () => string;
  AI_DIFFICULTY_LEVELS?: AIDifficultyLevel[];
  setAIDifficulty?: (id: string) => AIDifficultyLevel;
  getAIDifficulty?: () => AIDifficultyLevel;
  getMoveHistory?: () => MoveHistoryState;
  inspectHistoryMove?: (index: number) => boolean;
  exitHistoryReview?: (restoreCamera?: boolean) => boolean;
  analyzeHistoryMove?: (index: number) => MoveInsight | null;
  setLanguage?: (lang: string) => string;
  getLanguage?: () => string;
  setQualityLevel?: (level: string) => string;
  getQualityLevel?: () => string;
  QUALITY_LEVELS?: string[];
}

function getWizardChessApi(): WizardChessApi | undefined {
  return (window as unknown as { wizardChess?: WizardChessApi }).wizardChess;
}

export default function App() {
  const initializedRef = useRef(false);
  const historyListRef = useRef<HTMLDivElement | null>(null);
  const [lang, setLang] = useState<string>(() => detectInitialLanguage());
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [sceneMode, setSceneModeState] = useState<'castle' | 'starfield'>('castle');
  const [quality, setQuality] = useState<string>('medium');
  const [aiLevels, setAiLevels] = useState<AIDifficultyLevel[]>(() =>
    localizeAiLevels(createTranslator(detectInitialLanguage()))
  );
  const [aiDifficultyId, setAiDifficultyId] = useState<string>('amateur');
  const [aiSettingsCollapsed, setAiSettingsCollapsed] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [insightCollapsed, setInsightCollapsed] = useState(false);
  const [historyState, setHistoryState] = useState<MoveHistoryState>({
    moves: [],
    reviewingIndex: null,
    focusedIndex: null,
    activeInsight: null
  });

  const t = useMemo<Translator>(() => createTranslator(lang), [lang]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initWizardChess();
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t('brand.title');
  }, [lang, t]);

  useEffect(() => {
    const handleHistoryChange = (e: Event) => {
      const customEvent = e as CustomEvent<MoveHistoryState>;
      if (customEvent.detail) {
        setHistoryState(customEvent.detail);
      }
    };
    const handleEffectsChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      if (typeof customEvent.detail?.enabled === 'boolean') {
        setEffectsEnabled(customEvent.detail.enabled);
      }
    };
    const handleAiDifficultyChange = (e: Event) => {
      const customEvent = e as CustomEvent<AIDifficultyLevel>;
      if (customEvent.detail?.id) {
        setAiDifficultyId(customEvent.detail.id);
      }
    };
    const handleSceneModeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode: 'castle' | 'starfield' }>;
      if (customEvent.detail?.mode) {
        setSceneModeState(customEvent.detail.mode);
      }
    };
    const handleQualityChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ quality: string }>;
      if (customEvent.detail?.quality) {
        setQuality(customEvent.detail.quality);
      }
    };

    window.addEventListener('wizardchess:historychange', handleHistoryChange);
    window.addEventListener('wizardchess:effectschange', handleEffectsChange);
    window.addEventListener('wizardchess:aidifficultychange', handleAiDifficultyChange);
    window.addEventListener('wizardchess:scenemodechange', handleSceneModeChange);
    window.addEventListener('wizardchess:qualitychange', handleQualityChange);

    const api = getWizardChessApi();
    if (api?.getMoveHistory) {
      setHistoryState(api.getMoveHistory());
    }
    if (api?.getEffectsEnabled) {
      setEffectsEnabled(api.getEffectsEnabled());
    }
    if (api?.getSceneMode) {
      const cur = api.getSceneMode();
      if (cur === 'castle' || cur === 'starfield') setSceneModeState(cur);
    }
    if (api?.getQualityLevel) {
      const q = api.getQualityLevel();
      if (q) setQuality(q);
    }
    if (api?.AI_DIFFICULTY_LEVELS?.length) {
      setAiLevels(api.AI_DIFFICULTY_LEVELS);
    }
    if (api?.getAIDifficulty) {
      const cur = api.getAIDifficulty();
      if (cur?.id) setAiDifficultyId(cur.id);
    }

    return () => {
      window.removeEventListener('wizardchess:historychange', handleHistoryChange);
      window.removeEventListener('wizardchess:effectschange', handleEffectsChange);
      window.removeEventListener('wizardchess:aidifficultychange', handleAiDifficultyChange);
      window.removeEventListener('wizardchess:scenemodechange', handleSceneModeChange);
      window.removeEventListener('wizardchess:qualitychange', handleQualityChange);
    };
  }, []);

  useEffect(() => {
    if (historyState.reviewingIndex === null && historyListRef.current) {
      historyListRef.current.scrollTop = historyListRef.current.scrollHeight;
    }
  }, [historyState.moves.length, historyState.reviewingIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSheetOpen(false);
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const movePairs = useMemo(() => {
    const pairs: Array<{
      moveNumber: number;
      white?: MoveHistoryItem;
      black?: MoveHistoryItem;
    }> = [];
    for (let i = 0; i < historyState.moves.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: historyState.moves[i],
        black: historyState.moves[i + 1]
      });
    }
    return pairs;
  }, [historyState.moves]);

  const handleRestoreUI = () => {
    const api = getWizardChessApi();
    if (api?.toggleUI) {
      api.toggleUI(false);
    } else {
      document.body.classList.remove('cinematic-ui-hidden');
      const btnHide = document.getElementById('btn-hide-ui');
      if (btnHide) btnHide.textContent = t('actions.showUI');
    }
  };

  const activeAiLevel = useMemo(() => {
    return (
      aiLevels.find((lvl) => lvl.id === aiDifficultyId) ||
      aiLevels.find((lvl) => lvl.id === 'amateur') ||
      aiLevels[Math.floor(aiLevels.length / 2)] ||
      localizeAiLevels(t)[Math.floor(localizeAiLevels(t).length / 2)]
    );
  }, [aiLevels, aiDifficultyId, t]);

  const handleToggleEffects = () => {
    const next = !effectsEnabled;
    setEffectsEnabled(next);
    getWizardChessApi()?.setEffectsEnabled?.(next);
  };

  const handleSelectScene = (mode: 'castle' | 'starfield') => {
    setSceneModeState(mode);
    getWizardChessApi()?.setSceneMode?.(mode);
  };

  const handleChangeQuality = (next: string) => {
    if (!QUALITY_OPTIONS.includes(next) || next === quality) return;
    setQuality(next);
    getWizardChessApi()?.setQualityLevel?.(next);
  };

  const handleSelectAiDifficulty = (id: string) => {
    setAiDifficultyId(id);
    getWizardChessApi()?.setAIDifficulty?.(id);
  };

  const handleChangeLang = (next: string) => {
    if (!isSupportedLang(next) || next === lang) return;
    setLang(next);
    persistLanguage(next);
    const api = getWizardChessApi();
    api?.setLanguage?.(next);
    if (api?.AI_DIFFICULTY_LEVELS?.length) {
      setAiLevels(api.AI_DIFFICULTY_LEVELS);
    } else {
      setAiLevels(localizeAiLevels(createTranslator(next)));
    }
  };

  const activeInsight = useMemo<MoveInsight | null>(() => {
    if (historyState.activeInsight) return historyState.activeInsight;
    const targetIdx =
      historyState.reviewingIndex !== null
        ? historyState.reviewingIndex
        : historyState.focusedIndex;
    if (typeof targetIdx === 'number' && targetIdx >= 0 && targetIdx < historyState.moves.length) {
      return getWizardChessApi()?.analyzeHistoryMove?.(targetIdx) ?? null;
    }
    return null;
  }, [historyState]);

  const handleInspectMove = (index: number) => {
    const ok = getWizardChessApi()?.inspectHistoryMove?.(index);
    if (ok) {
      setInsightCollapsed(false);
      if (window.innerWidth <= 768) {
        setMobileSheetOpen(false);
      }
    }
  };

  const handleStepInsight = (delta: -1 | 1) => {
    const total = historyState.moves.length;
    if (total === 0) return;
    const currentIdx =
      historyState.reviewingIndex !== null
        ? historyState.reviewingIndex
        : historyState.focusedIndex !== null
          ? historyState.focusedIndex
          : total - 1;
    const nextIdx = Math.max(0, Math.min(total - 1, currentIdx + delta));
    if (nextIdx !== currentIdx || historyState.reviewingIndex === null) {
      getWizardChessApi()?.inspectHistoryMove?.(nextIdx);
      setInsightCollapsed(false);
    }
  };

  const handleExitReview = () => {
    getWizardChessApi()?.exitHistoryReview?.(true);
  };

  const sideLabel = (color: 'w' | 'b') => (color === 'w' ? t('status.sideWhite') : t('status.sideBlack'));

  return (
    <>
      <div id="loading-overlay">
        <div className="loader-title">{t('loading.title')}</div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" id="loader-bar"></div>
        </div>
        <div id="loader-text">{t('loading.text')}</div>
      </div>

      <div id="canvas-container"></div>

      <button
        type="button"
        className="hud-btn mobile-only-restore-ui"
        id="btn-mobile-show-ui"
        onClick={handleRestoreUI}
        title={t('actions.restoreUI')}
      >
        {t('actions.restoreUI')}
      </button>

      {historyState.reviewingIndex !== null && (
        <button
          type="button"
          className="hud-btn primary mobile-only-return-live"
          id="btn-mobile-return-live"
          onClick={handleExitReview}
          title={t('history.returnToGame')}
        >
          {t('history.returnToGame')}
        </button>
      )}

      <div id="hud-top">
        <div className="hud-group" id="hud-left">
          <div className="brand-pill">
            <span className="brand-title">{t('brand.title')}</span>
          </div>
          <div className="status-pill" id="status-pill">
            <span className="turn-dot" id="turn-dot"></span>
            <span id="turn-text">{t('status.turnWhite')}</span>
            <span className="mode-badge" id="mode-badge">{t('status.modeWhite')}</span>
          </div>
          <select
            className="lang-select"
            id="lang-select"
            aria-label="Language"
            value={lang}
            onChange={(e) => handleChangeLang(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={`hud-btn mobile-controls-trigger ${mobileSheetOpen ? 'active' : ''}`}
          id="btn-mobile-controls"
          aria-expanded={mobileSheetOpen}
          aria-controls="hud-right"
          onClick={() => setMobileSheetOpen((prev) => !prev)}
        >
          {mobileSheetOpen ? t('actions.close') : t('actions.controls')}
        </button>

        <div
          className={`mobile-sheet-backdrop ${mobileSheetOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setMobileSheetOpen(false);
          }}
          aria-hidden="true"
        ></div>

        <div
          className={`hud-group ${mobileSheetOpen ? 'mobile-sheet-open' : ''}`}
          id="hud-right"
        >
          <div
            className="mobile-sheet-handle-wrap"
            onClick={(e) => {
              e.stopPropagation();
              setMobileSheetOpen(false);
            }}
            aria-hidden="true"
          >
            <div className="mobile-sheet-handle"></div>
          </div>

          <div className="mobile-sheet-header">
            <span className="mobile-sheet-title">{t('sections.ops')}</span>
            <button
              type="button"
              className="mobile-sheet-close"
              id="btn-mobile-sheet-close"
              onClick={(e) => {
                e.stopPropagation();
                setMobileSheetOpen(false);
              }}
              aria-label={t('actions.close')}
            >
              {t('actions.close')} ✕
            </button>
          </div>

          <div className="mobile-sheet-section-label">{t('sections.ops')}</div>

          <button
            className="hud-btn"
            id="btn-side-toggle"
            title={t('status.sideToBlack')}
            onClick={() => setMobileSheetOpen(false)}
          >
            {t('status.sideToBlack')}
          </button>
          <button
            className="hud-btn"
            id="btn-ai-move"
            title={t('actions.aiMove')}
            onClick={() => setMobileSheetOpen(false)}
          >
            {t('actions.aiMove')}
          </button>
          <button
            className="hud-btn"
            id="btn-reset"
            title={t('actions.newGame')}
            onClick={() => setMobileSheetOpen(false)}
          >
            {t('actions.newGame')}
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">
            <span>{t('sections.camera')}</span>
            <span className="mobile-sheet-section-sub">{t('sections.cameraSub')}</span>
          </div>

          <button
            className="hud-btn active"
            id="btn-cam-player"
            title={t('actions.camPlayer')}
          >
            {t('actions.camPlayer')}
          </button>
          <button
            className="hud-btn"
            id="btn-cam-top"
            title={t('actions.camTop')}
          >
            {t('actions.camTop')}
          </button>
          <button
            className="hud-btn"
            id="btn-cam-side"
            title={t('actions.camSide')}
          >
            {t('actions.camSide')}
          </button>
          <button
            className="hud-btn"
            id="btn-cam-wide"
            title={t('actions.camWide')}
          >
            {t('actions.camWide')}
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">
            <span>{t('sections.scene')}</span>
            <span className="mobile-sheet-section-sub">{t('sections.sceneSub')}</span>
          </div>

          <button
            className={`hud-btn ${sceneMode === 'castle' ? 'active' : ''}`}
            id="btn-scene-castle"
            title={t('actions.sceneCastle')}
            onClick={() => handleSelectScene('castle')}
          >
            {t('actions.sceneCastle')}
          </button>
          <button
            className={`hud-btn ${sceneMode === 'starfield' ? 'active' : ''}`}
            id="btn-scene-star"
            title={t('actions.sceneStar')}
            onClick={() => handleSelectScene('starfield')}
          >
            {t('actions.sceneStar')}
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">
            <span>{t('sections.display')}</span>
            <span className="mobile-sheet-section-sub">{t('sections.displaySub')}</span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={effectsEnabled}
            className={`hud-btn effects-toggle-btn ${effectsEnabled ? 'active' : ''}`}
            id="btn-effects-toggle"
            title={t('actions.effects')}
            onClick={handleToggleEffects}
          >
            <svg
              className="hud-btn-icon"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M8 1.75L9.45 5.8L13.75 7.25L9.45 8.7L8 12.75L6.55 8.7L2.25 7.25L6.55 5.8L8 1.75Z" />
            </svg>
            <span className="effects-toggle-label">{t('actions.effects')}</span>
            <span className={`effects-switch-track ${effectsEnabled ? 'on' : ''}`} aria-hidden="true">
              <span className="effects-switch-thumb"></span>
            </span>
          </button>

          <select
            className="lang-select quality-select"
            id="quality-select"
            aria-label={t('quality.label')}
            value={quality}
            onChange={(e) => handleChangeQuality(e.target.value)}
          >
            {QUALITY_OPTIONS.map((q) => (
              <option key={q} value={q}>{t(`quality.${q}`)}</option>
            ))}
          </select>

          <button
            className="hud-btn"
            id="btn-hide-ui"
            title={t('actions.hideUI')}
            onClick={() => setMobileSheetOpen(false)}
          >
            {t('actions.hideUI')}
          </button>

          <div className="mobile-sheet-hint">
            <strong>{t('sections.display')}：</strong>{t('actions.touchHint')}
          </div>

          <div className="hud-right-dock" id="hud-right-dock">
            <div className="mobile-sheet-section-label">
              <span>{t('sections.ai')}</span>
              <span className="mobile-sheet-section-sub">{t('sections.aiSub')}</span>
            </div>

            <aside
              className={`hud-dock-card ai-settings-panel ${aiSettingsCollapsed ? 'collapsed' : ''}`}
              id="ai-settings-panel"
              aria-label={t('sections.ai')}
            >
              <div className="hud-dock-header">
                <div className="hud-dock-title-wrap">
                  <svg
                    className="hud-dock-icon"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4.5 13H11.5M5.25 10.5L4.5 5.25L7 7L8 3.5L9 7L11.5 5.25L10.75 10.5H5.25Z" />
                  </svg>
                  <span className="hud-dock-title">{t('sections.ai')}</span>
                  <span className="ai-tier-badge">
                    Lv.{activeAiLevel.tier} {activeAiLevel.shortName}
                  </span>
                </div>
                <div className="hud-dock-header-actions">
                  <button
                    type="button"
                    className="hud-dock-collapse-btn"
                    id="btn-ai-collapse"
                    onClick={() => setAiSettingsCollapsed((prev) => !prev)}
                    aria-expanded={!aiSettingsCollapsed}
                    aria-label={aiSettingsCollapsed ? t('ui.expand') : t('ui.collapse')}
                    title={aiSettingsCollapsed ? t('ui.expand') : t('ui.collapse')}
                  >
                    <svg
                      className={`hud-dock-chevron ${aiSettingsCollapsed ? 'rotated' : ''}`}
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4.5 6.5L8 10L11.5 6.5" />
                    </svg>
                  </button>
                </div>
              </div>

              {!aiSettingsCollapsed && (
                <div className="ai-settings-body">
                  <div className="ai-strength-row">
                    <div className="ai-strength-bars" aria-hidden="true">
                      {aiLevels.map((lvl) => (
                        <span
                          key={lvl.id}
                          className={`ai-strength-bar ${lvl.tier <= activeAiLevel.tier ? 'filled' : ''}`}
                        ></span>
                      ))}
                    </div>
                    <span className="ai-elo-label">{t('ai.elo', { elo: activeAiLevel.elo })}</span>
                  </div>

                  <div className="ai-level-grid" id="ai-level-grid" role="group" aria-label={t('sections.ai')}>
                    {aiLevels.map((lvl) => {
                      const isActive = lvl.id === activeAiLevel.id;
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          className={`ai-level-btn ${isActive ? 'active' : ''}`}
                          aria-pressed={isActive}
                          onClick={() => handleSelectAiDifficulty(lvl.id)}
                          title={`Lv.${lvl.tier} ${lvl.name} · ${t('ai.elo', { elo: lvl.elo })} — ${lvl.styleTag}`}
                        >
                          <span className="ai-level-num">{lvl.tier}</span>
                          <span className="ai-level-name">{lvl.shortName}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="ai-tactics-card" id="ai-tactics-hint" aria-live="polite">
                    <div className="ai-tactics-header">
                      <svg
                        className="ai-tactics-icon"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="8" cy="8" r="5.75" />
                        <path d="M10.5 5.5L8.9 8.9L5.5 10.5L7.1 7.1L10.5 5.5Z" />
                      </svg>
                      <span className="ai-tactics-fullname">{activeAiLevel.name}</span>
                      <span className="ai-tactics-tag">{activeAiLevel.styleTag}</span>
                    </div>
                    <p className="ai-tactics-desc">{activeAiLevel.tacticalHint}</p>
                  </div>
                </div>
              )}
            </aside>

            <div className="mobile-sheet-section-label">
              <span>{t('sections.history')}</span>
              <span className="mobile-sheet-section-sub">{t('sections.historySub')}</span>
            </div>

            <aside
              className={`hud-dock-card move-history-panel ${historyCollapsed ? 'collapsed' : ''}`}
              id="move-history-panel"
              aria-label={t('sections.history')}
            >
              <div className="hud-dock-header move-history-header">
                <div className="hud-dock-title-wrap move-history-title-wrap">
                  <svg
                    className="hud-dock-icon move-history-icon"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 3.5H13M3 8H13M3 12.5H9.5" />
                  </svg>
                  <span className="hud-dock-title move-history-title">{t('sections.history')}</span>
                  <span className="move-history-count">{t('history.count', { n: historyState.moves.length })}</span>
                </div>
                <div className="hud-dock-header-actions move-history-header-actions">
                  {historyState.reviewingIndex !== null && (
                    <button
                      type="button"
                      className="move-history-return-btn"
                      id="btn-history-return"
                      onClick={handleExitReview}
                      title={t('history.returnToGame')}
                    >
                      {t('history.returnToGame')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="hud-dock-collapse-btn move-history-collapse-btn"
                    id="btn-history-collapse"
                    onClick={() => setHistoryCollapsed((prev) => !prev)}
                    aria-expanded={!historyCollapsed}
                    aria-label={historyCollapsed ? t('ui.expand') : t('ui.collapse')}
                    title={historyCollapsed ? t('ui.expand') : t('ui.collapse')}
                  >
                    <svg
                      className={`hud-dock-chevron move-history-chevron ${historyCollapsed ? 'rotated' : ''}`}
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4.5 6.5L8 10L11.5 6.5" />
                    </svg>
                  </button>
                </div>
              </div>

              {!historyCollapsed && (
                <div className="move-history-body">
                  {historyState.reviewingIndex !== null && (
                    <div className="move-history-review-banner">
                      <span>{t('history.reviewing', { n: historyState.reviewingIndex + 1 })}</span>
                      <button
                        type="button"
                        className="move-history-inline-return"
                        onClick={handleExitReview}
                      >
                        {t('history.backToLive')}
                      </button>
                    </div>
                  )}

                  <div className="move-history-list" id="move-history-list" ref={historyListRef}>
                    {movePairs.length === 0 ? (
                      <div className="move-history-empty">
                        <span className="move-history-empty-title">{t('history.emptyTitle')}</span>
                        <span className="move-history-empty-sub">{t('history.emptySub')}</span>
                      </div>
                    ) : (
                      movePairs.map((pair) => (
                        <div className="move-history-row" key={pair.moveNumber}>
                          <span className="move-history-num">{pair.moveNumber}.</span>
                          {pair.white ? (
                            <button
                              type="button"
                              className={`move-history-cell ${
                                historyState.focusedIndex === pair.white.index ? 'active' : ''
                              } ${pair.white.capture ? 'capture' : ''}`}
                              onClick={() => handleInspectMove(pair.white!.index)}
                              title={t('history.inspectTitle', {
                                n: pair.white.index + 1,
                                side: sideLabel(pair.white.color),
                                from: pair.white.fromSq,
                                to: pair.white.toSq
                              })}
                            >
                              <span className="move-san">{pair.white.san}</span>
                            </button>
                          ) : (
                            <span className="move-history-cell placeholder" aria-hidden="true"></span>
                          )}
                          {pair.black ? (
                            <button
                              type="button"
                              className={`move-history-cell ${
                                historyState.focusedIndex === pair.black.index ? 'active' : ''
                              } ${pair.black.capture ? 'capture' : ''}`}
                              onClick={() => handleInspectMove(pair.black!.index)}
                              title={t('history.inspectTitle', {
                                n: pair.black.index + 1,
                                side: sideLabel(pair.black.color),
                                from: pair.black.fromSq,
                                to: pair.black.toSq
                              })}
                            >
                              <span className="move-san">{pair.black.san}</span>
                            </button>
                          ) : (
                            <span className="move-history-cell placeholder" aria-hidden="true"></span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </aside>

            <div className="mobile-sheet-section-label">
              <span>{t('sections.insight')}</span>
              <span className="mobile-sheet-section-sub">{t('sections.insightSub')}</span>
            </div>

            <aside
              className={`hud-dock-card match-insight-panel ${insightCollapsed ? 'collapsed' : ''}`}
              id="match-insight-panel"
              aria-label={t('sections.insight')}
            >
              <div className="hud-dock-header match-insight-header">
                <div className="hud-dock-title-wrap">
                  <svg
                    className="hud-dock-icon"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="7.25" cy="7.25" r="4.75" />
                    <path d="M10.75 10.75L14 14" />
                    <path d="M7.25 5.25V7.25L8.75 8.25" />
                  </svg>
                  <span className="hud-dock-title">{t('sections.insight')}</span>
                  {activeInsight && (
                    <span className="insight-move-pill">
                      #{activeInsight.index + 1} {activeInsight.san}
                    </span>
                  )}
                </div>

                <div className="hud-dock-header-actions">
                  {historyState.moves.length > 0 && (
                    <div className="insight-step-group" role="group" aria-label={t('sections.insight')}>
                      <button
                        type="button"
                        className="insight-step-btn"
                        id="btn-insight-prev"
                        disabled={(activeInsight?.index ?? historyState.moves.length - 1) <= 0}
                        onClick={() => handleStepInsight(-1)}
                        aria-label={t('insight.prev')}
                        title={t('insight.prev')}
                      >
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M9.75 4.5L6.25 8L9.75 11.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="insight-step-btn"
                        id="btn-insight-next"
                        disabled={
                          (activeInsight?.index ?? historyState.moves.length - 1) >=
                          historyState.moves.length - 1
                        }
                        onClick={() => handleStepInsight(1)}
                        aria-label={t('insight.next')}
                        title={t('insight.next')}
                      >
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M6.25 4.5L9.75 8L6.25 11.5" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className="hud-dock-collapse-btn"
                    id="btn-insight-collapse"
                    onClick={() => setInsightCollapsed((prev) => !prev)}
                    aria-expanded={!insightCollapsed}
                    aria-label={insightCollapsed ? t('ui.expand') : t('ui.collapse')}
                    title={insightCollapsed ? t('ui.expand') : t('ui.collapse')}
                  >
                    <svg
                      className={`hud-dock-chevron ${insightCollapsed ? 'rotated' : ''}`}
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4.5 6.5L8 10L11.5 6.5" />
                    </svg>
                  </button>
                </div>
              </div>

              {!insightCollapsed && (
                <div className="match-insight-body" id="match-insight-content" aria-live="polite">
                  {!activeInsight ? (
                    <div className="insight-empty">
                      <span className="insight-empty-title">{t('insight.emptyTitle')}</span>
                      <span className="insight-empty-sub">{t('insight.emptySub')}</span>
                    </div>
                  ) : (
                    <>
                      <div className="insight-meta-row">
                        <span className={`insight-badge tone-${activeInsight.badgeTone}`}>
                          {activeInsight.badge}
                        </span>
                        <span className="insight-coord">
                          {sideLabel(activeInsight.color)} {activeInsight.fromSq} →{' '}
                          {activeInsight.toSq}
                        </span>
                        <span className="insight-eval">{activeInsight.evalLabel}</span>
                      </div>

                      <p className="insight-summary">{activeInsight.summary}</p>

                      {activeInsight.details.length > 0 && (
                        <ul className="insight-details-list">
                          {activeInsight.details.map((line, idx) => (
                            <li key={idx} className="insight-detail-item">
                              <svg
                                className="insight-detail-bullet"
                                viewBox="0 0 10 10"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <polygon points="2,2 8,5 2,8" />
                              </svg>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {historyState.reviewingIndex === null && historyState.moves.length > 1 && (
                        <div className="insight-footer-hint">
                          {t('insight.footerHint')}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      <div id="hud-bottom">
        <div className="hint-pill" id="controls-hint">
          <strong>{t('sections.ops')}：</strong>{t('actions.controlsHint')}
        </div>
        <div className="captured-pill" id="captured-tray"></div>
      </div>

      <div id="checkmate-overlay" role="status" aria-live="polite">
        <div className="checkmate-banner">
          <div className="checkmate-ornament">{t('checkmate.ornament')}</div>
          <div className="checkmate-crown" id="checkmate-crown">♔</div>
          <div className="checkmate-title" id="checkmate-title">{t('checkmate.title')}</div>
          <div className="checkmate-rule"></div>
          <div className="checkmate-subtitle" id="checkmate-subtitle">
            {t('checkmate.subtitle', { winner: t('status.sideWhite'), defeated: t('status.sideBlack') })}
          </div>
          <div className="checkmate-actions">
            <button className="checkmate-btn" id="btn-checkmate-replay">
              {t('checkmate.replay')}
            </button>
            <button className="checkmate-btn" id="btn-checkmate-newgame">
              {t('checkmate.newGame')}
            </button>
            <button className="checkmate-btn secondary" id="btn-checkmate-dismiss">
              {t('checkmate.dismiss')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
