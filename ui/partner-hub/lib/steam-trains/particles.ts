import type { SteamEmitterDefinition, SteamParticle } from "./types";

export const emitSteamParticles = (
  particles: SteamParticle[],
  emitter: SteamEmitterDefinition,
  originX: number,
  originY: number,
  dtMs: number,
  intensity: "ambient" | "puff",
  nextParticleId: number,
) => {
  const ratePerSecond = intensity === "ambient" ? emitter.ambientRate : emitter.puffRate;
  const baseVelocity = intensity === "ambient" ? emitter.ambientVelocity : emitter.puffVelocity;
  const rawCount = (ratePerSecond * dtMs) / 1000;
  const particleCount = Math.max(0, Math.floor(rawCount + Math.random() * 0.9));

  const generated: SteamParticle[] = [];
  for (let index = 0; index < particleCount; index += 1) {
    generated.push({
      id: nextParticleId + index,
      x: originX + (Math.random() - 0.5) * 12,
      y: originY,
      vx: (Math.random() - 0.5) * 0.03,
      vy: -(baseVelocity + Math.random() * baseVelocity * 0.5),
      radius: intensity === "ambient" ? 8 + Math.random() * 6 : 12 + Math.random() * 10,
      lifeMs: 0,
      maxLifeMs: emitter.maxLifetimeMs * (0.7 + Math.random() * 0.4),
      alpha: intensity === "ambient" ? 0.3 : 0.85,
    });
  }

  return {
    nextParticleId: nextParticleId + generated.length,
    particles: [...particles, ...generated],
  };
};

export const stepSteamParticles = (particles: SteamParticle[], dtMs: number): SteamParticle[] =>
  particles
    .map((particle) => {
      const lifeMs = particle.lifeMs + dtMs;
      const lifeRatio = Math.min(1, lifeMs / particle.maxLifeMs);
      return {
        ...particle,
        x: particle.x + particle.vx * dtMs,
        y: particle.y + particle.vy * dtMs,
        lifeMs,
        alpha: particle.alpha * (1 - lifeRatio * 0.75),
      };
    })
    .filter((particle) => particle.lifeMs < particle.maxLifeMs && particle.alpha > 0.03);
