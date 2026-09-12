import { useEffect, useRef, useState, type PointerEvent } from "react";
import { RUN_DURATION_MS, ROUTE_CONFIG, STYLE_CONFIG, computeVerticalFeet, type Route, type SkiStyle } from "../game/ski";

const BG_IMG_SRC = "/images/minigame-ski-bg.png";
const SKIER_IMG_SRC = "/images/minigame-ski-skier.png";
const RIVAL_IMG_SRC = "/images/minigame-ski-rival.png";
const TREE_IMG_SRC = "/images/minigame-ski-tree.png";
const ROCK_IMG_SRC = "/images/minigame-ski-rock.png";
const YETI_IMG_SRC = "/images/minigame-ski-yeti.png";
const CRASHED_SNOWBOARDER_IMG_SRC = "/images/minigame-ski-crashed-snowboarder.png";
// Friday/Saturday-only cameo obstacles (see `bonusObstacles` prop) — the same
// three cabin cameo characters, reskinned as surprise obstacles for variety
// on the later ski days.
const COWBOY_JONATHAN_IMG_SRC = "/images/minigame-ski-cowboy-jonathan.png";
const GUITARIST_BEN_IMG_SRC = "/images/minigame-ski-guitarist-ben.png";
const CART_WALTER_IMG_SRC = "/images/minigame-ski-cart-walter.png";

const CANVAS_SIZE = 500;
// 3 labels x 1000ms = a 3-second countdown — was 550ms/label (1.65s total),
// which player feedback said was too fast to get set before skiing started.
// Also now used every time a non-severe crash resumes (see the "crashed"
// phase effect below) — a severe crash still short-circuits the run, but a
// minor/moderate one now behaves like Flight/Drive's collisions instead of
// ending the run outright.
const COUNTDOWN_STEP_MS = 1000;
const HORIZON_Y = 130;
const PLAYER_Y = 430;
const CENTER_X = CANVAS_SIZE / 2;
const BOTTOM_HALF_WIDTH = 205;
const PLAYER_MOVE_HALF_WIDTH = 215;
const MIN_SCALE = 0.16;
const MAX_SCALE = 1.05;
const BASE_TRAVEL_MS = 2500;
const NUM_LANES: number = 5;

const OBSTACLE_TYPES = ["tree", "rock", "rival", "yeti", "crashed-snowboarder"] as const;
// Friday/Saturday only, mixed into OBSTACLE_TYPES when `bonusObstacles` is
// set — see the prop doc comment on SkiRunProps below.
const BONUS_OBSTACLE_TYPES = ["cowboy-jonathan", "guitarist-ben", "cart-walter"] as const;
type ObstacleType = (typeof OBSTACLE_TYPES)[number] | (typeof BONUS_OBSTACLE_TYPES)[number];

// Per-type draw size / hit radius at full scale (et=1, right at the player).
// Yeti reads better bigger (it's the "big goofy monster" of the set); the
// crashed snowboarder is a sprawled body+board, wider than a tree/rock. The
// cameo obstacles are skier-posed like rival (similar size) except the
// shopping cart, which reads as a wider, front-facing rig.
const OBSTACLE_VISUAL: Record<ObstacleType, { size: number; hitRadius: number }> = {
  tree: { size: 60, hitRadius: 17 },
  rock: { size: 58, hitRadius: 17 },
  rival: { size: 62, hitRadius: 17 },
  yeti: { size: 76, hitRadius: 21 },
  "crashed-snowboarder": { size: 68, hitRadius: 19 },
  "cowboy-jonathan": { size: 62, hitRadius: 17 },
  "guitarist-ben": { size: 62, hitRadius: 17 },
  "cart-walter": { size: 72, hitRadius: 20 },
};

interface Obstacle {
  id: number;
  lane: number;
  type: ObstacleType;
  spawnAt: number;
  travelMs: number;
  spawnXJitter: number;
  x: number;
  y: number;
  scale: number;
}

type Phase = "countdown" | "running" | "crashed" | "finished";

export interface SkiRunResult {
  crashed: boolean;
  elapsedMs: number;
  verticalFeet: number;
}

interface SkiRunProps {
  route: Route;
  skiStyle: SkiStyle;
  riskPercent: number;
  /** Friday/Saturday only — mixes the 3 cabin-cameo obstacles (cowboy
   * Jonathan, guitarist Ben, cart Walter) into the spawn pool alongside the
   * regular 5, for variety on the later ski days. Thursday stays the
   * original 5-type pool. */
  bonusObstacles?: boolean;
  /**
   * Fired once per crash (there can be several in one run now). The parent
   * owns the actual injury roll/escalation (it already has the player's
   * current injury state) and reports back whether this one was severe —
   * true means the run is over and the parent is about to navigate away
   * (e.g. to ending-injured), so this component should just stop; false
   * means resume through the same READY/SET/GO countdown as the start.
   */
  onCrash: (elapsedMs: number) => boolean;
  onComplete: (result: SkiRunResult) => void;
}

function easeInQuad(t: number) {
  return t * t;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function laneTargetX(lane: number) {
  const t = NUM_LANES === 1 ? 0.5 : lane / (NUM_LANES - 1);
  return CENTER_X - BOTTOM_HALF_WIDTH + t * BOTTOM_HALF_WIDTH * 2;
}

function SkiRun({ route, skiStyle, riskPercent, bonusObstacles, onCrash, onComplete }: SkiRunProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeTextRef = useRef<HTMLSpanElement>(null);
  const feetTextRef = useRef<HTMLSpanElement>(null);

  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdownLabel, setCountdownLabel] = useState("READY");
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const stateRef = useRef({
    playerXNorm: 0.5,
    velocity: 0,
    keys: { left: false, right: false },
    pointerActive: false,
    pointerTargetNorm: 0.5,
    obstacles: [] as Obstacle[],
    nextObstacleId: 1,
    nextSpawnAt: 900,
    laneLastSpawn: new Array(NUM_LANES).fill(-Infinity) as number[],
    // Accumulated tick-by-tick, like FlightRun.tsx/DriveRun.tsx — not derived
    // from wall-clock time since mount, because that would count a crash's
    // burst+countdown pause as elapsed skiing time once resuming (§ 14a: a
    // run that resumes after crashing must not lose real ski time to the
    // pause itself).
    elapsedMs: 0,
    rafId: 0,
    crashParticles: [] as { x: number; y: number; vx: number; vy: number; life: number }[],
    crashedEver: false,
    ended: false,
  });

  useEffect(() => {
    const sources: Record<string, string> = {
      bg: BG_IMG_SRC,
      skier: SKIER_IMG_SRC,
      rival: RIVAL_IMG_SRC,
      tree: TREE_IMG_SRC,
      rock: ROCK_IMG_SRC,
      yeti: YETI_IMG_SRC,
      "crashed-snowboarder": CRASHED_SNOWBOARDER_IMG_SRC,
      "cowboy-jonathan": COWBOY_JONATHAN_IMG_SRC,
      "guitarist-ben": GUITARIST_BEN_IMG_SRC,
      "cart-walter": CART_WALTER_IMG_SRC,
    };
    let cancelled = false;
    let loadedCount = 0;
    const total = Object.keys(sources).length;
    Object.entries(sources).forEach(([key, src]) => {
      const img = new Image();
      const markLoaded = () => {
        loadedCount += 1;
        if (loadedCount === total && !cancelled) setImagesLoaded(true);
      };
      img.onload = markLoaded;
      img.onerror = markLoaded;
      img.src = src;
      imagesRef.current[key] = img;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!imagesLoaded || phase !== "countdown") return;
    const labels = ["READY", "SET", "GO!"];
    let i = 0;
    setCountdownLabel(labels[0]);
    const interval = setInterval(() => {
      i += 1;
      if (i >= labels.length) {
        clearInterval(interval);
        // Same grace period whether this is the very first start (elapsedMs
        // is still 0 here, so this lands close to the old flat 900ms) or a
        // resume after a crash — obstacles were already cleared when the
        // crash was detected, so there's nothing to instantly re-hit either
        // way, but this still gives a beat before the next one spawns.
        stateRef.current.nextSpawnAt = stateRef.current.elapsedMs + 600;
        setPhase("running");
        return;
      }
      setCountdownLabel(labels[i]);
    }, COUNTDOWN_STEP_MS);
    return () => clearInterval(interval);
  }, [imagesLoaded, phase]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") stateRef.current.keys.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") stateRef.current.keys.right = true;
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") stateRef.current.keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") stateRef.current.keys.right = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (phase !== "running") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const s = stateRef.current;
    const routeCfg = ROUTE_CONFIG[route];
    const styleCfg = STYLE_CONFIG[skiStyle];
    const travelMs = BASE_TRAVEL_MS / (routeCfg.speedMultiplier * styleCfg.speedMultiplier);
    const riskSpawnFactor = 1 - riskPercent * 0.02;

    function spawnMaybe(elapsed: number) {
      if (elapsed < s.nextSpawnAt) return;
      const progressT = Math.min(1, elapsed / RUN_DURATION_MS);
      const intervalBase = lerp(1300, 550, progressT) * routeCfg.spawnMultiplier * riskSpawnFactor;

      const laneOrder = [...Array(NUM_LANES).keys()].sort(() => Math.random() - 0.5);
      let chosenLane: number | null = null;
      for (const lane of laneOrder) {
        // Lane-gap tracking uses the same accumulated `elapsed` as
        // everything else here (not wall-clock time) — a crash's
        // burst+countdown pause must not make every lane look "overdue" the
        // instant the run resumes.
        if (elapsed - s.laneLastSpawn[lane] > travelMs * 0.32) {
          chosenLane = lane;
          break;
        }
      }
      if (chosenLane === null) {
        s.nextSpawnAt = elapsed + Math.max(220, intervalBase * 0.3);
        return;
      }

      const pool: readonly ObstacleType[] = bonusObstacles ? [...OBSTACLE_TYPES, ...BONUS_OBSTACLE_TYPES] : OBSTACLE_TYPES;
      const type = pool[Math.floor(Math.random() * pool.length)];
      s.obstacles.push({
        id: s.nextObstacleId++,
        lane: chosenLane,
        type,
        spawnAt: elapsed,
        travelMs,
        spawnXJitter: (Math.random() - 0.5) * 14,
        x: CENTER_X,
        y: HORIZON_Y,
        scale: MIN_SCALE,
      });
      s.laneLastSpawn[chosenLane] = elapsed;
      s.nextSpawnAt = elapsed + Math.max(320, intervalBase);
    }

    function update(dt: number) {
      s.elapsedMs = Math.min(RUN_DURATION_MS, s.elapsedMs + dt);
      const elapsed = s.elapsedMs;
      const prevXNorm = s.playerXNorm;

      // Direct speed, no accel/momentum: holding a direction moves at a fixed
      // rate and releasing stops immediately, so the player can settle in any
      // of the 5 lanes rather than always sliding through to an edge. (Earlier
      // version used velocity/friction with maxVel=0.026 and dt~16ms, so a
      // single tick could move ~42% of the full width — effectively an
      // instant snap to an extreme on any keypress. Fixed by testing: full
      // left-to-right traverse now takes ~0.9s, about the time NUM_LANES=5
      // lanes are spread across, so a one-lane correction is ~180ms.)
      // Both control schemes scaled by the same 0.85 factor (15% slower) so
      // keyboard and pointer/drag steering still feel equivalent to each
      // other, not just one of them slowed down.
      if (s.pointerActive) {
        const diff = s.pointerTargetNorm - s.playerXNorm;
        s.playerXNorm += diff * Math.min(1, dt * 0.0102);
      } else {
        const KEY_MOVE_PER_MS = (1 / 900) * 0.85;
        if (s.keys.left) s.playerXNorm -= KEY_MOVE_PER_MS * dt;
        if (s.keys.right) s.playerXNorm += KEY_MOVE_PER_MS * dt;
      }
      s.playerXNorm = Math.max(0, Math.min(1, s.playerXNorm));

      // Cosmetic-only from here — smoothed actual movement this tick, purely
      // to drive the skier's lean animation. Never feeds back into position.
      const instantRate = dt > 0 ? (s.playerXNorm - prevXNorm) / dt : 0;
      s.velocity += (instantRate - s.velocity) * 0.3;

      spawnMaybe(elapsed);

      const playerPx = CENTER_X - PLAYER_MOVE_HALF_WIDTH + s.playerXNorm * PLAYER_MOVE_HALF_WIDTH * 2;
      const playerHitRadius = 20;
      let crashedNow = false;

      s.obstacles = s.obstacles.filter((ob) => {
        const t = Math.min(1, (elapsed - ob.spawnAt) / ob.travelMs);
        if (t >= 1) return false;
        const et = easeInQuad(t);
        const targetX = laneTargetX(ob.lane) + ob.spawnXJitter * (1 - et);
        const spawnX = CENTER_X + ob.spawnXJitter * 0.4;
        ob.x = lerp(spawnX, targetX, et);
        ob.y = lerp(HORIZON_Y, PLAYER_Y, et);
        ob.scale = lerp(MIN_SCALE, MAX_SCALE, et);

        if (!crashedNow && et > 0.55) {
          const obHitRadius = OBSTACLE_VISUAL[ob.type].hitRadius * ob.scale;
          const dist = Math.hypot(ob.x - playerPx, ob.y - PLAYER_Y);
          if (dist < playerHitRadius * 0.75 + obHitRadius) crashedNow = true;
        }
        return true;
      });

      return { crashedNow, elapsed, playerPx };
    }

    function draw(playerPx: number) {
      ctx!.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const sorted = [...s.obstacles].sort((a, b) => a.y - b.y);
      for (const ob of sorted) {
        const img = imagesRef.current[ob.type];
        const size = OBSTACLE_VISUAL[ob.type].size * ob.scale;
        if (img?.complete && img.naturalWidth > 0) {
          ctx!.drawImage(img, ob.x - size / 2, ob.y - size / 2, size, size);
        }
      }

      const skierImg = imagesRef.current.skier;
      const w = 74 * 0.85;
      const h = 74 * 0.85;
      if (skierImg?.complete && skierImg.naturalWidth > 0) {
        ctx!.save();
        // 12000 rescales the new, much smaller direct-movement rate (max ~0.0011
        // norm/ms, vs the old velocity-based max of 0.026) back to a similar
        // +/-14 degree lean range as before.
        const tiltDeg = Math.max(-14, Math.min(14, s.velocity * 12000));
        ctx!.translate(playerPx, PLAYER_Y);
        ctx!.rotate((tiltDeg * Math.PI) / 180);
        ctx!.drawImage(skierImg, -w / 2, -h / 2, w, h);
        ctx!.restore();
      }
    }

    // setInterval rather than requestAnimationFrame: rAF is throttled/paused by
    // the browser whenever the tab isn't the visible foreground tab, which would
    // silently freeze a 30-second run any time the player alt-tabs mid-run.
    let lastFrame = performance.now();
    function tick() {
      const now = performance.now();
      const dt = Math.min(48, now - lastFrame);
      lastFrame = now;
      const { crashedNow, elapsed, playerPx } = update(dt);
      draw(playerPx);

      if (timeTextRef.current) timeTextRef.current.textContent = (elapsed / 1000).toFixed(1);
      if (feetTextRef.current) {
        const cap = 3000 * routeCfg.speedMultiplier * styleCfg.speedMultiplier;
        feetTextRef.current.textContent = String(Math.min(Math.round(cap), computeVerticalFeet(elapsed, route, skiStyle)));
      }

      if (crashedNow && !s.ended) {
        s.ended = true;
        s.crashedEver = true;
        s.obstacles = []; // cleared so resuming doesn't instantly re-hit the same obstacle
        s.crashParticles = Array.from({ length: 14 }, () => ({
          x: playerPx,
          y: PLAYER_Y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6 - 1,
          life: 1,
        }));
        clearInterval(s.rafId);
        setPhase("crashed");
        return;
      }

      if (elapsed >= RUN_DURATION_MS && !s.ended) {
        s.ended = true;
        clearInterval(s.rafId);
        setPhase("finished");
      }
    }

    s.rafId = window.setInterval(tick, 16);
    return () => clearInterval(s.rafId);
  }, [phase, route, skiStyle, riskPercent, bonusObstacles]);

  useEffect(() => {
    if (phase !== "crashed" && phase !== "finished") return;
    const s = stateRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (phase === "crashed" && ctx) {
      let last = performance.now();
      const burst = () => {
        const now = performance.now();
        const dt = Math.min(48, now - last);
        last = now;
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        s.crashParticles.forEach((p) => {
          p.x += p.vx * (dt / 16);
          p.y += p.vy * (dt / 16);
          p.vy += 0.15 * (dt / 16);
          p.life -= dt / 500;
        });
        s.crashParticles = s.crashParticles.filter((p) => p.life > 0);
        s.crashParticles.forEach((p) => {
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        if (s.crashParticles.length === 0) clearInterval(burstInterval);
      };
      const burstInterval = window.setInterval(burst, 16);

      // A crash no longer ends the run by itself — the parent owns the
      // actual injury roll (it already tracks the player's current injury
      // state) and reports back whether this one was severe. Severe means
      // the parent is about to navigate away entirely (e.g. to
      // ending-injured), so there's nothing further to do here; anything
      // else resumes through the same READY/SET/GO countdown as the start.
      const timer = setTimeout(() => {
        const severe = onCrash(s.elapsedMs);
        if (!severe) {
          s.ended = false;
          setPhase("countdown");
        }
      }, 1000);
      return () => {
        clearInterval(burstInterval);
        clearTimeout(timer);
      };
    }

    if (phase === "finished") {
      const timer = setTimeout(() => {
        onComplete({
          crashed: s.crashedEver,
          elapsedMs: RUN_DURATION_MS,
          verticalFeet: computeVerticalFeet(RUN_DURATION_MS, route, skiStyle),
        });
      }, 700);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function handlePointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (phase !== "running") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    stateRef.current.pointerTargetNorm = Math.max(0, Math.min(1, normX));
  }
  function handlePointerDown(e: PointerEvent<HTMLCanvasElement>) {
    stateRef.current.pointerActive = true;
    handlePointerMove(e);
  }
  function handlePointerUp() {
    stateRef.current.pointerActive = false;
  }

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-black">
      <img src={BG_IMG_SRC} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />

      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {phase !== "countdown" && (
        <div className="absolute left-[3%] right-[3%] top-[9%] flex items-center justify-between rounded border-2 border-cyan-300 bg-black/80 px-3 py-1 text-lg text-cyan-200">
          <span>
            TIME <span ref={timeTextRef}>0.0</span>s
          </span>
          <span className="uppercase">
            {route} · {skiStyle.replace("-", " ")}
          </span>
          <span>
            <span ref={feetTextRef}>0</span> FT
          </span>
        </div>
      )}

      {phase === "countdown" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <p className="text-5xl text-amber-100" style={{ textShadow: "3px 3px 0 #000" }}>
            {imagesLoaded ? countdownLabel : "Loading..."}
          </p>
        </div>
      )}

      {phase === "crashed" && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/30">
          <p className="text-4xl text-red-100" style={{ textShadow: "3px 3px 0 #000" }}>
            WIPEOUT!
          </p>
        </div>
      )}

      {phase === "finished" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <p className="text-4xl text-amber-100" style={{ textShadow: "3px 3px 0 #000" }}>
            REACHED THE LODGE!
          </p>
        </div>
      )}

      {phase === "running" && (
        <div
          className="absolute bottom-[3%] left-[3%] right-[3%] flex justify-between text-xs text-amber-100/90"
          style={{ textShadow: "1px 1px 0 #000" }}
        >
          <span>← / A</span>
          <span>Arrow keys, A/D, or drag to steer</span>
          <span>D / →</span>
        </div>
      )}
    </div>
  );
}

export default SkiRun;
