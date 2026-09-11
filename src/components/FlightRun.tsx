import { useEffect, useRef, useState, type PointerEvent } from "react";

const BG_IMG_SRC = "/images/progress-flight-bg.png";
const PLANE_IMG_SRC = "/images/progress-plane.png";
const DENVER_ICON_SRC = "/images/progress-denver-airport-icon.png";
const OBSTACLE_IMG_SRC = {
  bird: "/images/progress-obstacle-bird.png",
  plane: "/images/progress-obstacle-plane.png",
  dragon: "/images/progress-obstacle-dragon.png", // § 7
} as const;

type ObstacleType = keyof typeof OBSTACLE_IMG_SRC;
const OBSTACLE_TYPES: ObstacleType[] = ["bird", "plane", "dragon"];
// `collisionThreshold` is the max |dx| from the plane's x that still counts
// as a hit, tuned per type so the visually-bigger rival plane is a bit
// harder to avoid than the small, nimble bird (mirrors how SkiRun.tsx scales
// its own per-type hit radius rather than using one flat value for everything).
const OBSTACLE_VISUAL: Record<ObstacleType, { size: number; collisionThreshold: number }> = {
  bird: { size: 36, collisionThreshold: 22 },
  plane: { size: 64, collisionThreshold: 34 },
  dragon: { size: 64, collisionThreshold: 34 }, // § 7: roughly plane-scale
};

const CANVAS_SIZE = 500;
// 3 labels x 1000ms = a 3-second countdown, both on first entry and on every
// resume after a collision — was 500ms/label (1.5s total), which player
// feedback said was too fast to get set before dodging started/resumed.
const COUNTDOWN_STEP_MS = 1000;
// Open sky "lanes" (no literal road) — kept away from the very top/bottom
// edges so there's room for the ground-hint strip and the landmark below.
const LANE_TOP = 90;
const LANE_BOTTOM = 340;
const NUM_LANES = 3;
const PLANE_X = 95;
const PLANE_SIZE = 56;
const SPAWN_X = CANVAS_SIZE + 40;
const OBSTACLE_TRAVEL_MS = 1700;

// The Denver Airport landmark grows in on the canvas itself (bottom-anchored,
// on the bg's own ground-hint strip — see § 2) rather than via TravelScene,
// since this screen no longer has a passive "coasting" view at all.
const LANDMARK_SIZE = 210; // § 6: was 150 — hard to see
const LANDMARK_X = 380;
const LANDMARK_BOTTOM_GAP = 15; // § 6: was a flat 5px gap — lifted higher too
const LANDMARK_FADE_IN_AT = 0.75;

function laneY(lane: number) {
  const laneHeight = (LANE_BOTTOM - LANE_TOP) / NUM_LANES;
  return LANE_TOP + laneHeight * (lane + 0.5);
}

// Touch/mouse steering: maps a pointer's Y position to the nearest lane
// (mirrors SkiRun.tsx's drag-to-position pointer handling, just quantized to
// NUM_LANES discrete rows instead of a continuous X position) rather than
// requiring the keyboard-only up/down that was the only way to play this on
// a touchscreen before.
function laneFromPointerY(clientY: number, rect: DOMRect) {
  const canvasY = ((clientY - rect.top) / rect.height) * CANVAS_SIZE;
  const laneHeight = (LANE_BOTTOM - LANE_TOP) / NUM_LANES;
  const lane = Math.floor((canvasY - LANE_TOP) / laneHeight);
  return Math.max(0, Math.min(NUM_LANES - 1, lane));
}

interface FlightObstacle {
  id: number;
  lane: number;
  type: ObstacleType;
  spawnAt: number;
  x: number;
}

type Phase = "countdown" | "running" | "collided" | "finished";

interface FlightRunProps {
  durationMs: number;
  startSpawnPerSec: number;
  endSpawnPerSec: number;
  paused: boolean;
  onTick: (elapsedMs: number) => void;
  /** § 5: fired once per collision — the run resumes afterward, same as DriveRun.tsx. */
  onCollision: (elapsedMs: number) => void;
  onFinish: () => void;
}

/**
 * § 1: the flight's interactive dodge mini-game — same architecture as
 * DriveRun.tsx (countdown, fixed lanes, setInterval tick loop with dt capped
 * at 48ms, obstacles spawn only into an unoccupied lane). § 5: a collision no
 * longer ends the run — it now resumes exactly like DriveRun.tsx's collision
 * handling (brief particle beat, obstacles cleared, spawn grace period, back
 * to "running"), just reskinned as a trailing smoke puff instead of a crash.
 */
function FlightRun({ durationMs, startSpawnPerSec, endSpawnPerSec, paused, onTick, onCollision, onFinish }: FlightRunProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdownLabel, setCountdownLabel] = useState("READY");
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const stateRef = useRef({
    elapsedMs: 0,
    laneIndex: 1,
    planeY: laneY(1),
    keys: { up: false, down: false },
    pointerActive: false,
    obstacles: [] as FlightObstacle[],
    nextObstacleId: 1,
    nextSpawnAt: 500,
    smokeParticles: [] as { x: number; y: number; vx: number; vy: number; life: number }[],
    ended: false,
    intervalId: 0,
  });

  useEffect(() => {
    const sources: Record<string, string> = {
      bg: BG_IMG_SRC,
      plane: PLANE_IMG_SRC,
      denverIcon: DENVER_ICON_SRC,
      bird: OBSTACLE_IMG_SRC.bird,
      rivalPlane: OBSTACLE_IMG_SRC.plane,
      dragon: OBSTACLE_IMG_SRC.dragon,
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
        setPhase("running");
        return;
      }
      setCountdownLabel(labels[i]);
    }, COUNTDOWN_STEP_MS);
    return () => clearInterval(interval);
  }, [imagesLoaded, phase]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") stateRef.current.keys.up = true;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") stateRef.current.keys.down = true;
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") stateRef.current.keys.up = false;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") stateRef.current.keys.down = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Edge-triggered lane changes (a held key shouldn't rapid-fire lane changes).
  const prevKeysRef = useRef({ up: false, down: false });

  useEffect(() => {
    if (phase !== "running") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const s = stateRef.current;

    function maybeChangeLane() {
      const keys = s.keys;
      if (keys.up && !prevKeysRef.current.up) s.laneIndex = Math.max(0, s.laneIndex - 1);
      if (keys.down && !prevKeysRef.current.down) s.laneIndex = Math.min(NUM_LANES - 1, s.laneIndex + 1);
      prevKeysRef.current = { ...keys };
    }

    function spawnMaybe() {
      if (s.elapsedMs < s.nextSpawnAt) return;
      const progressT = Math.min(1, s.elapsedMs / durationMs);
      const spawnPerSec = startSpawnPerSec + (endSpawnPerSec - startSpawnPerSec) * progressT;
      const intervalMs = 1000 / Math.max(0.1, spawnPerSec);

      const occupiedLanes = new Set(s.obstacles.map((o) => o.lane));
      const openLanes = [...Array(NUM_LANES).keys()].filter((l) => !occupiedLanes.has(l));
      if (openLanes.length === 0) {
        s.nextSpawnAt = s.elapsedMs + 150;
        return;
      }
      const lane = openLanes[Math.floor(Math.random() * openLanes.length)];
      const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
      s.obstacles.push({ id: s.nextObstacleId++, lane, type, spawnAt: s.elapsedMs, x: SPAWN_X });
      s.nextSpawnAt = s.elapsedMs + intervalMs;
    }

    function update(dt: number) {
      s.elapsedMs = Math.min(durationMs, s.elapsedMs + dt);
      onTick(s.elapsedMs);

      maybeChangeLane();
      const targetY = laneY(s.laneIndex);
      s.planeY += (targetY - s.planeY) * 0.28;

      spawnMaybe();

      let crashedNow = false;
      s.obstacles = s.obstacles.filter((ob) => {
        const t = (s.elapsedMs - ob.spawnAt) / OBSTACLE_TRAVEL_MS;
        if (t >= 1) return false;
        ob.x = SPAWN_X + (PLANE_X - SPAWN_X) * t;

        if (!crashedNow && ob.lane === s.laneIndex) {
          if (Math.abs(ob.x - PLANE_X) < OBSTACLE_VISUAL[ob.type].collisionThreshold) crashedNow = true;
        }
        return true;
      });

      return crashedNow;
    }

    function draw() {
      ctx!.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const bg = imagesRef.current.bg;
      if (bg?.complete && bg.naturalWidth > 0) ctx!.drawImage(bg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const landmarkT = Math.min(1, Math.max(0, (s.elapsedMs / durationMs - LANDMARK_FADE_IN_AT) / (1 - LANDMARK_FADE_IN_AT)));
      if (landmarkT > 0) {
        const denverIcon = imagesRef.current.denverIcon;
        if (denverIcon?.complete && denverIcon.naturalWidth > 0) {
          ctx!.globalAlpha = landmarkT;
          ctx!.drawImage(
            denverIcon,
            LANDMARK_X - LANDMARK_SIZE / 2,
            CANVAS_SIZE - LANDMARK_SIZE - LANDMARK_BOTTOM_GAP,
            LANDMARK_SIZE,
            LANDMARK_SIZE,
          );
          ctx!.globalAlpha = 1;
        }
      }

      const sorted = [...s.obstacles].sort((a, b) => a.x - b.x);
      for (const ob of sorted) {
        const key = ob.type === "bird" ? "bird" : ob.type === "plane" ? "rivalPlane" : "dragon";
        const img = imagesRef.current[key];
        const size = OBSTACLE_VISUAL[ob.type].size;
        if (img?.complete && img.naturalWidth > 0) {
          ctx!.drawImage(img, ob.x - size / 2, laneY(ob.lane) - size / 2, size, size);
        }
      }

      const planeImg = imagesRef.current.plane;
      if (planeImg?.complete && planeImg.naturalWidth > 0) {
        ctx!.drawImage(planeImg, PLANE_X - PLANE_SIZE / 2, s.planeY - PLANE_SIZE / 2, PLANE_SIZE, PLANE_SIZE);
      }
    }

    // setInterval, not requestAnimationFrame: rAF throttles/pauses in a
    // backgrounded tab, which would silently freeze this timed run (same
    // reasoning already documented in SkiRun.tsx/DriveRun.tsx).
    let lastFrame = performance.now();
    function tick() {
      const now = performance.now();
      const dt = Math.min(48, now - lastFrame);
      lastFrame = now;

      if (!paused && !s.ended) {
        const crashedNow = update(dt);
        if (crashedNow && !s.ended) {
          s.ended = true;
          s.obstacles = []; // cleared so resuming (§ 5) doesn't instantly re-collide
          // Trails from the tail (the plane sprite faces right, tail fin at its
          // left edge — see progress-plane.png) rather than bursting outward
          // from center, so the plane itself stays visible and recognizable
          // underneath instead of vanishing behind an explosion-like burst.
          const tailX = PLANE_X - PLANE_SIZE * 0.32;
          const tailY = s.planeY - PLANE_SIZE * 0.12;
          s.smokeParticles = Array.from({ length: 8 }, () => ({
            x: tailX,
            y: tailY,
            vx: -1 - Math.random() * 1.5,
            vy: -(Math.random() * 1.5),
            life: 1,
          }));
          clearInterval(s.intervalId);
          setPhase("collided");
          return;
        }
        if (s.elapsedMs >= durationMs && !s.ended) {
          s.ended = true;
          clearInterval(s.intervalId);
          setPhase("finished");
          return;
        }
      }

      draw();
    }

    const intervalId = window.setInterval(tick, 16);
    s.intervalId = intervalId;
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, durationMs, startSpawnPerSec, endSpawnPerSec, paused]);

  useEffect(() => {
    if (phase !== "collided" && phase !== "finished") return;
    const s = stateRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (phase === "collided" && ctx) {
      let last = performance.now();
      const puff = () => {
        const now = performance.now();
        const dt = Math.min(48, now - last);
        last = now;
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        const bg = imagesRef.current.bg;
        if (bg?.complete) ctx.drawImage(bg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        // The plane stays put and visible — smoking, not gone — matching the
        // softer "getting bumpy" framing instead of reading as a crash.
        const planeImg = imagesRef.current.plane;
        if (planeImg?.complete && planeImg.naturalWidth > 0) {
          ctx.drawImage(planeImg, PLANE_X - PLANE_SIZE / 2, s.planeY - PLANE_SIZE / 2, PLANE_SIZE, PLANE_SIZE);
        }
        s.smokeParticles.forEach((p) => {
          p.x += p.vx * (dt / 16);
          p.y += p.vy * (dt / 16);
          p.life -= dt / 500;
        });
        s.smokeParticles = s.smokeParticles.filter((p) => p.life > 0);
        s.smokeParticles.forEach((p) => {
          ctx.globalAlpha = Math.max(0, p.life) * 0.7;
          ctx.fillStyle = "rgba(220,220,220,0.9)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        if (s.smokeParticles.length === 0) clearInterval(puffInterval);
      };
      const puffInterval = window.setInterval(puff, 16);

      // § 5: collisions no longer end the run — report this one, then
      // resume, exactly mirroring DriveRun.tsx's collision handling. Resuming
      // goes back through the same READY/SET/GO countdown as the initial
      // start (not straight to "running") — the tick-loop-setup effect below
      // only ever runs while phase === "running", so nothing spawns/moves
      // during this second countdown either; obstacles were already cleared
      // to empty the instant the collision was detected, so there's nothing
      // to instantly re-hit once it resumes.
      const timer = setTimeout(() => {
        onCollision(s.elapsedMs);
        s.ended = false;
        s.nextSpawnAt = s.elapsedMs + 800;
        setPhase("countdown");
      }, 700);
      return () => {
        clearInterval(puffInterval);
        clearTimeout(timer);
      };
    }

    if (phase === "finished") {
      const timer = setTimeout(onFinish, 700);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function handlePointerDown(e: PointerEvent<HTMLCanvasElement>) {
    if (phase !== "running") return;
    stateRef.current.pointerActive = true;
    stateRef.current.laneIndex = laneFromPointerY(e.clientY, e.currentTarget.getBoundingClientRect());
  }
  function handlePointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!stateRef.current.pointerActive || phase !== "running") return;
    stateRef.current.laneIndex = laneFromPointerY(e.clientY, e.currentTarget.getBoundingClientRect());
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

      {phase === "countdown" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <p className="text-5xl text-amber-100" style={{ textShadow: "3px 3px 0 #000" }}>
            {imagesLoaded ? countdownLabel : "Loading..."}
          </p>
        </div>
      )}

      {phase === "collided" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <p className="text-3xl text-amber-100" style={{ textShadow: "3px 3px 0 #000" }}>
            Bumpy air!
          </p>
        </div>
      )}

      {phase === "finished" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <p className="text-4xl text-amber-100" style={{ textShadow: "3px 3px 0 #000" }}>
            LANDED!
          </p>
        </div>
      )}

      {phase === "running" && (
        <div className="absolute bottom-[3%] left-[3%] right-[3%] flex justify-between text-xs text-amber-100/80">
          <span>↑ / W</span>
          <span>Arrow keys, W/S, or drag to steer</span>
          <span>S / ↓</span>
        </div>
      )}
    </div>
  );
}

export default FlightRun;
