import type { GraphLink } from "./types.js";

export type SimulationOptions = {
  centerForce: number;
  repelForce: number;
  linkForce: number;
  linkDistance: number;
};

export type SimulationNode = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
};

export type GraphSimulation = {
  nodes: readonly SimulationNode[];
  tick(): boolean;
  reheat(alpha?: number): void;
  setOptions(options: SimulationOptions): void;
  fix(id: string, x: number, y: number): void;
  release(id: string): void;
  stop(): void;
  isActive(): boolean;
  getAlpha(): number;
};

export type CreateSimulationInput = {
  nodeIds: readonly string[];
  links: readonly GraphLink[];
  options: SimulationOptions;
  positions?: ReadonlyMap<string, { x: number; y: number }>;
  centerId?: string | null;
};

export const ALPHA_MIN = 0.001;
export const ALPHA_DECAY = 0.0228;
export const VELOCITY_DECAY = 0.4;
export const MAX_VELOCITY = 40;
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
