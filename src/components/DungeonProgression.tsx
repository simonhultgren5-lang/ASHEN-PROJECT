import React, { useCallback, useEffect, useMemo, useState } from 'react';

export const MAX_CAMPAIGN_DEPTH = 20;
const DEPTH_STORAGE_KEY = 'ashen_eclipse_depth_gate_v1';

export interface DepthGateState {
  maxClearedDepth: number;
  unlockedDepth: number;
  higherContentUnlocked: boolean;
}

export function createInitialDepthGateState(
  initialMaxCleared = 0
): DepthGateState {
  const maxCleared = Math.max(
    0,
    Math.min(MAX_CAMPAIGN_DEPTH, Math.floor(initialMaxCleared))
  );
  return {
    maxClearedDepth: maxCleared,
    unlockedDepth: Math.min(MAX_CAMPAIGN_DEPTH, maxCleared + 1),
    higherContentUnlocked: maxCleared >= MAX_CAMPAIGN_DEPTH,
  };
}

/**
 * Enforces the depth-gate rule: players may only enter depths
 * up to unlockedDepth (which never exceeds maxClearedDepth + 1)
 * and within the 1..20 campaign range.
 */
export function canEnterDepth(
  state: DepthGateState,
  targetDepth: number
): boolean {
  const depth = Math.floor(targetDepth);
  if (!Number.isFinite(depth) || depth < 1 || depth > MAX_CAMPAIGN_DEPTH) {
    return false;
  }
  return depth <= state.unlockedDepth && depth <= state.maxClearedDepth + 1;
}

/**
 * Unlocks the next depth only upon completion of the current one
 * (sequentially up to depth 20) and unlocks higher endgame content
 * once depth 20 is cleared.
 */
export function advanceClearedDepth(
  state: DepthGateState,
  completedDepth: number
): DepthGateState {
  const depth = Math.floor(completedDepth);
  if (
    !Number.isFinite(depth) ||
    depth < 1 ||
    depth > MAX_CAMPAIGN_DEPTH ||
    depth > state.maxClearedDepth + 1
  ) {
    return state;
  }
  const nextCleared = Math.max(state.maxClearedDepth, depth);
  return {
    maxClearedDepth: nextCleared,
    unlockedDepth: Math.min(MAX_CAMPAIGN_DEPTH, nextCleared + 1),
    higherContentUnlocked: nextCleared >= MAX_CAMPAIGN_DEPTH,
  };
}

export function canAccessHigherContent(state: DepthGateState): boolean {
  return (
    state.higherContentUnlocked && state.maxClearedDepth >= MAX_CAMPAIGN_DEPTH
  );
}

const DarkChainedIcon: React.FC<{ className?: string }> = ({
  className = 'h-3.5 w-3.5',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <path
      d="M4 5l5 5m6 6l5 5M20 5l-5 5m-6 6l-5 5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeDasharray="2.5 2"
      opacity="0.7"
    />
    <rect
      x="7"
      y="10.5"
      width="10"
      height="8"
      rx="2"
      fill="#0d0a10"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M9.5 10.5V8a2.5 2.5 0 0 1 5 0v2.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <circle cx="12" cy="14.5" r="1.1" fill="currentColor" />
  </svg>
);

const GlowingSigilIcon: React.FC<{ cleared?: boolean; className?: string }> = ({
  cleared = false,
  className = 'h-3.5 w-3.5',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <circle
      cx="12"
      cy="12"
      r="8.5"
      stroke="currentColor"
      strokeWidth="1.6"
      opacity="0.6"
    />
    {cleared ? (
      <path
        d="M8.5 12.2l2.4 2.4 4.8-5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : (
      <path
        d="M12 6.5l1.9 3.6 3.6 1.9-3.6 1.9L12 17.5l-1.9-3.6L6.5 12l3.6-1.9L12 6.5z"
        fill="currentColor"
      />
    )}
  </svg>
);

interface HostDepthMessage {
  type?: string;
  started?: boolean;
  activeDepth?: number;
  maxClearedDepth?: number;
  clearedDepth?: number;
  unlockedDepth?: number;
}

export interface DungeonProgressionProps {
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  initialMaxClearedDepth?: number;
  onEnterDepth?: (depth: number) => void;
  onEnterHigherContent?: () => void;
}

export const DungeonProgression: React.FC<DungeonProgressionProps> = ({
  iframeRef,
  initialMaxClearedDepth = 0,
  onEnterDepth,
  onEnterHigherContent,
}) => {
  const [gateState, setGateState] = useState<DepthGateState>(() => {
    try {
      const raw = localStorage.getItem(DEPTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DepthGateState>;
        if (typeof parsed.maxClearedDepth === 'number') {
          return createInitialDepthGateState(parsed.maxClearedDepth);
        }
      }
    } catch {
      // Ignore storage errors and fall back to initial depth state
    }
    return createInitialDepthGateState(initialMaxClearedDepth);
  });

  const [activeDepth, setActiveDepth] = useState<number>(1);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [gateNotice, setGateNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(DEPTH_STORAGE_KEY, JSON.stringify(gateState));
    } catch {
      // Ignore storage errors
    }
  }, [gateState]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<HostDepthMessage>) => {
      const data = event.data;
      if (event.source === iframeRef?.current?.contentWindow && data?.type === 'ASHEN_OPEN_DEPTH_GATE') {
        setDrawerOpen(true);
        return;
      }
      if (!data || data.type !== 'ASHEN_DEPTH_STATE') return;

      const cleared =
        typeof data.maxClearedDepth === 'number'
          ? data.maxClearedDepth
          : typeof data.clearedDepth === 'number'
          ? data.clearedDepth
          : 0;

      setGateState(createInitialDepthGateState(cleared));
      if (typeof data.activeDepth === 'number' && data.activeDepth >= 1) {
        setActiveDepth(Math.min(MAX_CAMPAIGN_DEPTH, data.activeDepth));
      }
      if (typeof data.started === 'boolean') {
        setGameStarted(data.started);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [iframeRef]);

  const attemptEnterDepth = useCallback(
    (targetDepth: number) => {
      if (!canEnterDepth(gateState, targetDepth)) {
        setGateNotice(
          `Chained & Locked: Clear Depth ${gateState.maxClearedDepth + 1} before entering Depth ${targetDepth}.`
        );
        return false;
      }
      setGateNotice(null);
      setActiveDepth(targetDepth);
      onEnterDepth?.(targetDepth);
      iframeRef?.current?.contentWindow?.postMessage(
        { type: 'ASHEN_ENTER_DEPTH', depth: targetDepth },
        '*'
      );
      setDrawerOpen(false);
      return true;
    },
    [gateState, iframeRef, onEnterDepth]
  );

  const attemptCompleteDepth = useCallback((depthToClear: number) => {
    setGateState((prev) => {
      if (depthToClear > prev.maxClearedDepth + 1) {
        setGateNotice(
          `Cannot complete Depth ${depthToClear} before clearing Depth ${prev.maxClearedDepth + 1}.`
        );
        return prev;
      }
      const next = advanceClearedDepth(prev, depthToClear);
      setGateNotice(
        next.higherContentUnlocked
          ? 'Depth 20 Cleared! Atlas & Endless Delve unlocked.'
          : `Depth ${depthToClear} cleared — Depth ${next.unlockedDepth} unlocked.`
      );
      return next;
    });
  }, []);

  const attemptEnterHigherContent = useCallback(() => {
    if (!canAccessHigherContent(gateState)) {
      setGateNotice(
        `Higher content chained: Clear up to Depth ${MAX_CAMPAIGN_DEPTH} first (${gateState.maxClearedDepth}/${MAX_CAMPAIGN_DEPTH}).`
      );
      return false;
    }
    setGateNotice(null);
    onEnterHigherContent?.();
    iframeRef?.current?.contentWindow?.postMessage(
      { type: 'ASHEN_ENTER_ENDGAME' },
      '*'
    );
    setDrawerOpen(false);
    return true;
  }, [gateState, iframeRef, onEnterHigherContent]);

  const higherUnlocked = useMemo(
    () => canAccessHigherContent(gateState),
    [gateState]
  );

  if (!gameStarted) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-3.5 right-3.5 z-40 flex flex-col items-end gap-2">
      {drawerOpen && (
        <section
          aria-label="Dungeon Progression"
          className="pointer-events-auto max-h-[90dvh] overflow-y-auto w-[min(476px,92vw)] rounded-md border border-[#dfb672]/30 bg-[#100d16]/95 p-4 text-[#f1e6d8] shadow-[0_22px_60px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,232,196,0.08)] backdrop-blur-md"
        >
          <div className="mb-3 flex items-start justify-between gap-3 border-b border-white/10 pb-2.5">
            <div>
              <h3 className="font-display text-sm font-bold tracking-[0.06em] text-[#dfb672] uppercase">
                Depth Gate Seal
              </h3>
              <p className="font-mono-num mt-0.5 text-[11px] text-[#9e91a3]">
                Cleared {gateState.maxClearedDepth}/{MAX_CAMPAIGN_DEPTH} · Next Unlocked: D{gateState.unlockedDepth}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded border border-[#dfb672]/25 bg-[#191421] px-2.5 py-1 text-[11px] font-semibold text-[#e6dacb] transition hover:border-[#dfb672] hover:text-[#fff3dc]"
            >
              Close
            </button>
          </div>

          <div className="mb-3.5 h-1.5 w-full overflow-hidden rounded-sm bg-[#08060c] ring-1 ring-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#8f5b3a] via-[#dfb672] to-[#ffe1a3] transition-all duration-300"
              style={{
                width: `${(gateState.maxClearedDepth / MAX_CAMPAIGN_DEPTH) * 100}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: MAX_CAMPAIGN_DEPTH }, (_, idx) => {
              const depth = idx + 1;
              const allowed = canEnterDepth(gateState, depth);
              const cleared = depth <= gateState.maxClearedDepth;
              const current = depth === activeDepth;

              const tileClass = !allowed
                ? 'depth-tile-locked'
                : cleared
                ? `depth-tile-cleared${current ? ' depth-tile-current' : ''}`
                : `depth-tile-unlocked${current ? ' depth-tile-current' : ''}`;

              return (
                <button
                  key={depth}
                  type="button"
                  onClick={() => attemptEnterDepth(depth)}
                  aria-disabled={!allowed}
                  title={
                    allowed
                      ? `Enter Depth ${depth}`
                      : `Chained & Locked — Clear Depth ${gateState.maxClearedDepth + 1} first`
                  }
                  className={`font-mono-num flex items-center justify-center gap-1.5 rounded border px-2 py-2 text-xs font-bold transition ${tileClass}`}
                >
                  {!allowed ? (
                    <DarkChainedIcon className="h-3.5 w-3.5 text-[#78687d]" />
                  ) : (
                    <GlowingSigilIcon
                      cleared={cleared}
                      className="h-3.5 w-3.5"
                    />
                  )}
                  <span>D{depth}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={attemptEnterHigherContent}
              aria-disabled={!higherUnlocked}
              className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold transition ${
                higherUnlocked
                  ? 'depth-tile-unlocked hover:brightness-110'
                  : 'depth-tile-locked'
              }`}
            >
              {higherUnlocked ? (
                <GlowingSigilIcon className="h-3.5 w-3.5" />
              ) : (
                <DarkChainedIcon className="h-3.5 w-3.5" />
              )}
              <span>
                {higherUnlocked
                  ? 'Enter Atlas & Endless Delve'
                  : 'Higher Content Chained (Clear D20)'}
              </span>
            </button>
            <span className="font-mono-num text-[11px] text-[#9e91a3]">
              Active: D{activeDepth}
            </span>
          </div>

          {gateNotice && (
            <div className="mt-2.5 rounded border border-[#dfb672]/35 bg-[#1b1218] px-2.5 py-1.5 text-xs text-[#ffe1a3]">
              {gateNotice}
            </div>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          setDrawerOpen((open) => !open);
          if (
            gateState.maxClearedDepth >= MAX_CAMPAIGN_DEPTH &&
            !higherUnlocked
          ) {
            attemptCompleteDepth(MAX_CAMPAIGN_DEPTH);
          }
        }}
        className={`font-mono-num pointer-events-auto hidden min-[1100px]:flex items-center gap-2 rounded border px-3 py-1.5 text-xs font-bold tracking-wide shadow-[0_8px_24px_rgba(0,0,0,0.75)] transition hover:brightness-110 ${
          higherUnlocked ? 'depth-tile-cleared' : 'depth-tile-unlocked'
        }`}
      >
        {higherUnlocked ? (
          <GlowingSigilIcon cleared className="h-3.5 w-3.5" />
        ) : (
          <GlowingSigilIcon className="h-3.5 w-3.5" />
        )}
        <span>
          Depth Gate {gateState.maxClearedDepth}/{MAX_CAMPAIGN_DEPTH}
        </span>
      </button>
    </div>
  );
};

export default DungeonProgression;
