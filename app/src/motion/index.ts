/**
 * `src/motion/` — the app's motion runtime, in one import.
 *
 * Views import from here and never from the files underneath, so the runtime can
 * be reorganised without touching six routes. What each piece is *for*, since
 * the names alone do not say:
 *
 *   budget.ts      the numbers: particles, loops, the six-second floor
 *   registers.ts   the thinai grammar: tempo, easing, amplitude per landscape
 *   conditions.ts  the kill matrix, as one pure function
 *   loops.ts       the route's ceiling on `requestAnimationFrame` chains
 *   useMotion.ts   the hooks a component reads conditions and runs frames with
 *   MotionProvider the layer that puts `data-motion` / `data-register` on <html>
 *
 * The playbook — how to give a surface motion, register by register, with the
 * worked example of every Home surface — is `docs/motion-playbook.md`.
 */
export { PARTICLE_BUDGET, LOOP_BUDGET, IDLE_PERIOD_SECONDS_MIN, FAST_LOOPS, INTERACTION_MAX_MS, MATERIAL_EXCEPTION_MS } from './budget.ts'
export {
  DEFAULT_REGISTER,
  MOTION_REGISTERS,
  REGISTER_BY_STATE,
  REGISTER_MOTION,
  ROUTE_REGISTER,
  registerFor,
  registerForPath,
  type MotionRegister,
  type MotionState,
  type RegisterMotion,
} from './registers.ts'
export { motionVerdict, type MotionConditions, type MotionVerdict } from './conditions.ts'
export { LoopRegistry, routeLoops, type LoopKind, type LoopReport } from './loops.ts'
export {
  useInFrame,
  useMedia,
  useMotionConditions,
  useMotionContext,
  useMotionLoop,
  useMotionRegister,
  useMotionSuspended,
  useMotionVerdict,
  usePageHidden,
  type InFrame,
  type MotionLoopStatus,
} from './useMotion.ts'
export { MotionProvider } from './MotionProvider.tsx'
