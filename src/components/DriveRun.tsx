import { useEffect, useRef, useState } from "react";
import { obstaclePoolForLeg, type DriveObstacleType } from "../game/drive";

const BG_IMG_SRC = "/images/progress-drive-bg.png";
const TRUCK_IMG_SRC = "/images/progress-truck.png";
const COSTCO_ICON_SRC = "/images/progress-costco-icon.png";
const CABIN_ICON_SRC = "/images/progress-cabin-icon.png";
const OBSTACLE_IMG_SRC: Record<DriveObstacleType, string> = {
  car: "/images/progress-obstacle-car.png",
  truck: "/images/progress-obstacle-truck.png",
  wreck: "/images/progress-obstacle-wreck.png",
  wagon: "/images/progress-obstacle-wagon.png",
  train: "/images/progress-obstacle-train.png",
  cowboy: "/images/progress-obstacle-cowboy.png",
  "alien-ufo": "/images/progress-obstacle-alien-ufo.png",
};
// imagesRef preload keys for each obstacle type — "truck" and "alien-ufo"
// need to differ from their type name (the former would collide with the
// player truck's own "truck" key, the latter isn't a valid bare key);
// everything else's preload key already matches its type name directly.
const OBSTACLE_TO_IMAGE_KEY: Record<DriveObstacleType, string> = {
  car: "car",
  truck: "truckObstacle",
  wreck: "wreck",
  wagon: "wagon",
  train: "train",
  cowboy: "cowboy",
  "alien-ufo": "alienUfo",
};

const CANVAS_SIZE = 500;
// 3 labels x 1000ms = a 3-second countdown, both on first entry and on every
// resume after a collision — was 500ms/label (1.5s total), which player
// feedback said was too fast to get set before dodging started/resumed.
const COUNTDOWN_STEP_MS = 1000;
// Pixel-measured against the actual progress-drive-bg.png (1024px tall): the
// paved road band (including its edge stripes) runs from y=604 to y=863.
const ROAD_TOP = 295;
const ROAD_BOTTOM = 421;
const NUM_LANES = 3;
const TRUCK_X = 95;
const SPAWN_X = CANVAS_SIZE + 40;
const OBSTACLE_TRAVEL_MS = 1800;
const COLLISION_THRESHOLD = 30;
const TRUCK_SIZE = 56;
const OBSTACLE_SIZE = 52;
// § 0 item 23: a lane used to stay "occupied" (blocked from a new spawn) for
// an obstacle's entire 1800ms trip, but the spawn interval (~400-700ms at
// these tuned rates) is much shorter than that — so with only 3 lanes,
// 2-3 were almost always mid-flight at once, leaving just 1 open lane for
// nearly every spawn. Math.random() was already being called, it just had
// nothing left to choose from, which read as a fixed lane-rotation rather
// than randomness. Freeing a lane once its obstacle is safely past the
// midpoint (confirmed via live logging: at t=0.45 it's still comfortably in
// the far half of the canvas, ~200px ahead of a freshly-spawned one in the
// same lane — no visual overlap) gives 2+ open lanes most of the time.
const LANE_REOPEN_AT = 0.45;
// Spawn interval used to be perfectly regular (elapsedMs + intervalMs, no
// variance), which reads as metronomic/scripted even when lane and type
// genuinely are random. +/-25% jitter keeps the same average pace (so the
// difficulty ramp from startSpawnPerSec to endSpawnPerSec is unaffected)
// while breaking up the beat.
const SPAWN_JITTER = 0.25;

// § 11/§ 12: Costco grows in near the end of leg 1 (Walter's stop), the
// cabin near the end of leg 2 — same bottom-anchored fade-in technique
// FlightRun.tsx already uses for the Denver Airport landmark.
const LANDMARK_SIZE = 150;
const LANDMARK_X = 380;
const LANDMARK_FADE_IN_AT = 0.75;

function laneY(lane: number) {
  const laneHeight = (ROAD_BOTTOM - ROAD_TOP) / NUM_LANES;
  return ROAD_TOP + laneHeight * (lane + 0.5);
}

interface DriveObstacle {
  id: number;
  lane: number;
  type: DriveObstacleType;
  spawnAt: number;
  x: number;
}

type Phase = "countdown" | "running" | "crashed" | "finished";

interface DriveRunProps {
  firstLegMs: number;
  secondLegMs: number;
  startSpawnPerSec: number;
  endSpawnPerSec: number;
  paused: boolean;
  onTick: (elapsedMs: number) => void;
  /** Fired once per collision (not once per run) — the run resumes afterward, see § 4. */
  onCollision: (elapsedMs: number) => void;
  onFinish: () => void;
}

function DriveRun({ firstLegMs, secondLegMs, startSpawnPerSec, endSpawnPerSec, paused, onTick, onCollision, onFinish }: DriveRunProps) {
  const durationMs = firstLegMs + secondLegMs;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdownLabel, setCountdownLabel] = useState("READY");
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const stateRef = useRef({
    elapsedMs: 0,
    laneIndex: 1,
    truckY: laneY(1),
    keys: { up: false, down: false },
    obstacles: [] as DriveObstacle[],
    nextObstacleId: 1,
    nextSpawnAt: 500,
    lastObstacleType: null as DriveObstacleType | null,
    crashParticles: [] as { x: number; y: number; vx: number; vy: number; life: number }[],
    ended: false,
    intervalId: 0,
  });

  useEffect(() => {
    const sources: Record<string, string> = {
      bg: BG_IMG_SRC,
      truck: TRUCK_IMG_SRC,
      costcoIcon: COSTCO_ICON_SRC,
      cabinIcon: CABIN_ICON_SRC,
      car: OBSTACLE_IMG_SRC.car,
      truckObstacle: OBSTACLE_IMG_SRC.truck,
      wreck: OBSTACLE_IMG_SRC.wreck,
      wagon: OBSTACLE_IMG_SRC.wagon,
      train: OBSTACLE_IMG_SRC.train,
      cowboy: OBSTACLE_IMG_SRC.cowboy,
      alienUfo: OBSTACLE_IMG_SRC["alien-ufo"],
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

      // A lane only counts as occupied while its obstacle is still in the
      // first LANE_REOPEN_AT share of its trip — see the constant's comment
      // above for why the old "occupied for the whole trip" version starved
      // Math.random() down to a single forced choice almost every time.
      const occupiedLanes = new Set(
        s.obstacles.filter((o) => (s.elapsedMs - o.spawnAt) / OBSTACLE_TRAVEL_MS < LANE_REOPEN_AT).map((o) => o.lane),
      );
      const openLanes = [...Array(NUM_LANES).keys()].filter((l) => !occupiedLanes.has(l));
      if (openLanes.length === 0) {
        s.nextSpawnAt = s.elapsedMs + 150;
        return;
      }
      const lane = openLanes[Math.floor(Math.random() * openLanes.length)];
      const pool = obstaclePoolForLeg(s.elapsedMs < firstLegMs ? 1 : 2);
      // Exclude whatever just spawned so the same type can't repeat back to
      // back — the pool always has 6 types (§ 0 item 23), so this never
      // empties out.
      const candidates = pool.filter((t) => t !== s.lastObstacleType);
      const typePool = candidates.length > 0 ? candidates : pool;
      const type = typePool[Math.floor(Math.random() * typePool.length)];
      s.lastObstacleType = type;
      s.obstacles.push({ id: s.nextObstacleId++, lane, type, spawnAt: s.elapsedMs, x: SPAWN_X });
      s.nextSpawnAt = s.elapsedMs + intervalMs * (1 - SPAWN_JITTER + Math.random() * SPAWN_JITTER * 2);
    }

    function update(dt: number) {
      s.elapsedMs = Math.min(durationMs, s.elapsedMs + dt);
      onTick(s.elapsedMs);

      maybeChangeLane();
      const targetY = laneY(s.laneIndex);
      s.truckY += (targetY - s.truckY) * 0.28;

      spawnMaybe();

      let crashedNow = false;
      s.obstacles = s.obstacles.filter((ob) => {
        const t = (s.elapsedMs - ob.spawnAt) / OBSTACLE_TRAVEL_MS;
        if (t >= 1) return false;
        ob.x = SPAWN_X + (TRUCK_X - SPAWN_X) * t;

        if (!crashedNow && ob.lane === s.laneIndex && Math.abs(ob.x - TRUCK_X) < COLLISION_THRESHOLD) {
          crashedNow = true;
        }
        return true;
      });

      return crashedNow;
    }

    function draw() {
      ctx!.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const bg = imagesRef.current.bg;
      if (bg?.complete && bg.naturalWidth > 0) ctx!.drawImage(bg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // § 11/§ 12: whichever leg we're in, fade its own destination landmark
      // in over the last quarter of that leg.
      const inLeg1 = s.elapsedMs < firstLegMs;
      const legStart = inLeg1 ? 0 : firstLegMs;
      const legLen = inLeg1 ? firstLegMs : secondLegMs;
      const legT = legLen > 0 ? (s.elapsedMs - legStart) / legLen : 1;
      const landmarkT = Math.min(1, Math.max(0, (legT - LANDMARK_FADE_IN_AT) / (1 - LANDMARK_FADE_IN_AT)));
      if (landmarkT > 0) {
        const landmark = imagesRef.current[inLeg1 ? "costcoIcon" : "cabinIcon"];
        if (landmark?.complete && landmark.naturalWidth > 0) {
          ctx!.globalAlpha = landmarkT;
          ctx!.drawImage(landmark, LANDMARK_X - LANDMARK_SIZE / 2, CANVAS_SIZE - LANDMARK_SIZE - 5, LANDMARK_SIZE, LANDMARK_SIZE);
          ctx!.globalAlpha = 1;
        }
      }

      const sorted = [...s.obstacles].sort((a, b) => a.x - b.x);
      for (const ob of sorted) {
        // "truck" and "alien-ufo" need different imagesRef keys (the former
        // would otherwise collide with the player truck's own "truck" key,
        // the latter isn't a valid bare key) — everything else's type name
        // already matches its preload key directly.
        const key = OBSTACLE_TO_IMAGE_KEY[ob.type];
        const img = imagesRef.current[key];
        if (img?.complete && img.naturalWidth > 0) {
          ctx!.drawImage(img, ob.x - OBSTACLE_SIZE / 2, laneY(ob.lane) - OBSTACLE_SIZE / 2, OBSTACLE_SIZE, OBSTACLE_SIZE);
        }
      }

      const truckImg = imagesRef.current.truck;
      if (truckImg?.complete && truckImg.naturalWidth > 0) {
        ctx!.drawImage(truckImg, TRUCK_X - TRUCK_SIZE / 2, s.truckY - TRUCK_SIZE / 2, TRUCK_SIZE, TRUCK_SIZE);
      }
    }

    // setInterval, not requestAnimationFrame: rAF throttles/pauses in a
    // backgrounded tab, which would silently freeze this timed run (same
    // reasoning already documented in SkiRun.tsx).
    let lastFrame = performance.now();
    function tick() {
      const now = performance.now();
      const dt = Math.min(48, now - lastFrame);
      lastFrame = now;

      if (!paused && !s.ended) {
        const crashedNow = update(dt);
        if (crashedNow && !s.ended) {
          s.ended = true;
          s.obstacles = []; // cleared so resuming (§ 4) doesn't instantly re-collide
          s.crashParticles = Array.from({ length: 14 }, () => ({
            x: TRUCK_X,
            y: s.truckY,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6 - 1,
            life: 1,
          }));
          clearInterval(s.intervalId);
          setPhase("crashed");
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
  }, [phase, firstLegMs, secondLegMs, durationMs, startSpawnPerSec, endSpawnPerSec, paused]);

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
        const bg = imagesRef.current.bg;
        if (bg?.complete) ctx.drawImage(bg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
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

      // § 4: collisions no longer end the run — report this one, then
      // resume. Resuming goes back through the same READY/SET/GO countdown
      // as the initial start (not straight to "running") — the
      // tick-loop-setup effect below only ever runs while phase ===
      // "running", so nothing spawns/moves during this second countdown
      // either; obstacles were already cleared to empty the instant the
      // collision was detected, so there's nothing to instantly re-hit once
      // it resumes.
      const timer = setTimeout(() => {
        onCollision(s.elapsedMs);
        s.ended = false;
        s.nextSpawnAt = s.elapsedMs + 800;
        setPhase("countdown");
      }, 700);
      return () => {
        clearInterval(burstInterval);
        clearTimeout(timer);
      };
    }

    if (phase === "finished") {
      const timer = setTimeout(onFinish, 700);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-black">
      <img src={BG_IMG_SRC} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />

      <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="absolute inset-0 h-full w-full" />

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
            CRASH!
          </p>
        </div>
      )}

      {phase === "finished" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <p className="text-4xl text-amber-100" style={{ textShadow: "3px 3px 0 #000" }}>
            MADE IT!
          </p>
        </div>
      )}

      {phase === "running" && (
        <div className="absolute bottom-[3%] left-[3%] right-[3%] flex justify-between text-xs text-amber-100/80">
          <span>↑ / W</span>
          <span>Up/Down arrows or W/S to switch lanes</span>
          <span>S / ↓</span>
        </div>
      )}
    </div>
  );
}

export default DriveRun;
