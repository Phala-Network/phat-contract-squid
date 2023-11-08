import {sts, Block, Bytes, Option, Result, EventType, RuntimeCtx} from '../support'
import * as v1240 from '../v1240'

export const workerStarted =  {
    name: 'PhalaComputation.WorkerStarted' as const,
    /**
     * A worker starts computing.
     * 
     * Affected states:
     * - the worker info at [`Sessions`] is updated with `WorkerIdle` state
     * - [`NextSessionId`] for the session is incremented
     * - [`Stakes`] for the session is updated
     * - [`OnlineWorkers`] is incremented
     */
    v1240: new EventType(
        'PhalaComputation.WorkerStarted',
        sts.struct({
            session: v1240.AccountId32,
            initV: sts.bigint(),
            initP: sts.number(),
        })
    ),
}

export const workerStopped =  {
    name: 'PhalaComputation.WorkerStopped' as const,
    /**
     * Worker stops computing.
     * 
     * Affected states:
     * - the worker info at [`Sessions`] is updated with `WorkerCoolingDown` state
     * - [`OnlineWorkers`] is decremented
     */
    v1240: new EventType(
        'PhalaComputation.WorkerStopped',
        sts.struct({
            session: v1240.AccountId32,
        })
    ),
}

export const workerReclaimed =  {
    name: 'PhalaComputation.WorkerReclaimed' as const,
    /**
     * Worker is reclaimed, with its slash settled.
     */
    v1240: new EventType(
        'PhalaComputation.WorkerReclaimed',
        sts.struct({
            session: v1240.AccountId32,
            originalStake: sts.bigint(),
            slashed: sts.bigint(),
        })
    ),
}

export const sessionBound =  {
    name: 'PhalaComputation.SessionBound' as const,
    /**
     * Worker & session are bounded.
     * 
     * Affected states:
     * - [`SessionBindings`] for the session account is pointed to the worker
     * - [`WorkerBindings`] for the worker is pointed to the session account
     * - the worker info at [`Sessions`] is updated with `Ready` state
     */
    v1240: new EventType(
        'PhalaComputation.SessionBound',
        sts.struct({
            session: v1240.AccountId32,
            worker: v1240.Public,
        })
    ),
}

export const sessionUnbound =  {
    name: 'PhalaComputation.SessionUnbound' as const,
    /**
     * Worker & worker are unbound.
     * 
     * Affected states:
     * - [`SessionBindings`] for the session account is removed
     * - [`WorkerBindings`] for the worker is removed
     */
    v1240: new EventType(
        'PhalaComputation.SessionUnbound',
        sts.struct({
            session: v1240.AccountId32,
            worker: v1240.Public,
        })
    ),
}

export const workerEnterUnresponsive =  {
    name: 'PhalaComputation.WorkerEnterUnresponsive' as const,
    /**
     * Worker enters unresponsive state.
     * 
     * Affected states:
     * - the worker info at [`Sessions`] is updated from `WorkerIdle` to `WorkerUnresponsive`
     */
    v1240: new EventType(
        'PhalaComputation.WorkerEnterUnresponsive',
        sts.struct({
            session: v1240.AccountId32,
        })
    ),
}

export const workerExitUnresponsive =  {
    name: 'PhalaComputation.WorkerExitUnresponsive' as const,
    /**
     * Worker returns to responsive state.
     * 
     * Affected states:
     * - the worker info at [`Sessions`] is updated from `WorkerUnresponsive` to `WorkerIdle`
     */
    v1240: new EventType(
        'PhalaComputation.WorkerExitUnresponsive',
        sts.struct({
            session: v1240.AccountId32,
        })
    ),
}
