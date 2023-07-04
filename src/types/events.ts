import assert from 'assert'
import {Chain, ChainContext, EventContext, Event, Result, Option} from './support'
import * as v1240 from './v1240'

export class PhalaComputationSessionBoundEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'PhalaComputation.SessionBound')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * Worker & session are bounded.
     * 
     * Affected states:
     * - [`SessionBindings`] for the session account is pointed to the worker
     * - [`WorkerBindings`] for the worker is pointed to the session account
     * - the worker info at [`Sessions`] is updated with `Ready` state
     */
    get isV1240(): boolean {
        return this._chain.getEventHash('PhalaComputation.SessionBound') === 'f46e4c120214de2ad267cd7a520409879e8f20c8fed92bda090ef495de03ca3d'
    }

    /**
     * Worker & session are bounded.
     * 
     * Affected states:
     * - [`SessionBindings`] for the session account is pointed to the worker
     * - [`WorkerBindings`] for the worker is pointed to the session account
     * - the worker info at [`Sessions`] is updated with `Ready` state
     */
    get asV1240(): {session: Uint8Array, worker: Uint8Array} {
        assert(this.isV1240)
        return this._chain.decodeEvent(this.event)
    }
}

export class PhalaComputationSessionUnboundEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'PhalaComputation.SessionUnbound')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * Worker & worker are unbound.
     * 
     * Affected states:
     * - [`SessionBindings`] for the session account is removed
     * - [`WorkerBindings`] for the worker is removed
     */
    get isV1240(): boolean {
        return this._chain.getEventHash('PhalaComputation.SessionUnbound') === 'f46e4c120214de2ad267cd7a520409879e8f20c8fed92bda090ef495de03ca3d'
    }

    /**
     * Worker & worker are unbound.
     * 
     * Affected states:
     * - [`SessionBindings`] for the session account is removed
     * - [`WorkerBindings`] for the worker is removed
     */
    get asV1240(): {session: Uint8Array, worker: Uint8Array} {
        assert(this.isV1240)
        return this._chain.decodeEvent(this.event)
    }
}

export class PhalaComputationWorkerEnterUnresponsiveEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'PhalaComputation.WorkerEnterUnresponsive')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * Worker enters unresponsive state.
     * 
     * Affected states:
     * - the worker info at [`Sessions`] is updated from `WorkerIdle` to `WorkerUnresponsive`
     */
    get isV1240(): boolean {
        return this._chain.getEventHash('PhalaComputation.WorkerEnterUnresponsive') === 'da6fbbac52b4be480812462fce29bab263d644f64756e825d79ddc539a21abdb'
    }

    /**
     * Worker enters unresponsive state.
     * 
     * Affected states:
     * - the worker info at [`Sessions`] is updated from `WorkerIdle` to `WorkerUnresponsive`
     */
    get asV1240(): {session: Uint8Array} {
        assert(this.isV1240)
        return this._chain.decodeEvent(this.event)
    }
}

export class PhalaComputationWorkerExitUnresponsiveEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'PhalaComputation.WorkerExitUnresponsive')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * Worker returns to responsive state.
     * 
     * Affected states:
     * - the worker info at [`Sessions`] is updated from `WorkerUnresponsive` to `WorkerIdle`
     */
    get isV1240(): boolean {
        return this._chain.getEventHash('PhalaComputation.WorkerExitUnresponsive') === 'da6fbbac52b4be480812462fce29bab263d644f64756e825d79ddc539a21abdb'
    }

    /**
     * Worker returns to responsive state.
     * 
     * Affected states:
     * - the worker info at [`Sessions`] is updated from `WorkerUnresponsive` to `WorkerIdle`
     */
    get asV1240(): {session: Uint8Array} {
        assert(this.isV1240)
        return this._chain.decodeEvent(this.event)
    }
}

export class PhalaComputationWorkerReclaimedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'PhalaComputation.WorkerReclaimed')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * Worker is reclaimed, with its slash settled.
     */
    get isV1240(): boolean {
        return this._chain.getEventHash('PhalaComputation.WorkerReclaimed') === '2acf61fd8096c1c9e960d99c92081c668a3e12bf02faf545a8412185ed26c1c3'
    }

    /**
     * Worker is reclaimed, with its slash settled.
     */
    get asV1240(): {session: Uint8Array, originalStake: bigint, slashed: bigint} {
        assert(this.isV1240)
        return this._chain.decodeEvent(this.event)
    }
}

export class PhalaComputationWorkerStartedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'PhalaComputation.WorkerStarted')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * A worker starts computing.
     * 
     * Affected states:
     * - the worker info at [`Sessions`] is updated with `WorkerIdle` state
     * - [`NextSessionId`] for the session is incremented
     * - [`Stakes`] for the session is updated
     * - [`OnlineWorkers`] is incremented
     */
    get isV1240(): boolean {
        return this._chain.getEventHash('PhalaComputation.WorkerStarted') === '012bfc0408798da4d4b2bfbbc98beeb36833493fa36125d9ec82eedf5f1a8874'
    }

    /**
     * A worker starts computing.
     * 
     * Affected states:
     * - the worker info at [`Sessions`] is updated with `WorkerIdle` state
     * - [`NextSessionId`] for the session is incremented
     * - [`Stakes`] for the session is updated
     * - [`OnlineWorkers`] is incremented
     */
    get asV1240(): {session: Uint8Array, initV: bigint, initP: number} {
        assert(this.isV1240)
        return this._chain.decodeEvent(this.event)
    }
}

export class PhalaComputationWorkerStoppedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'PhalaComputation.WorkerStopped')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * Worker stops computing.
     * 
     * Affected states:
     * - the worker info at [`Sessions`] is updated with `WorkerCoolingDown` state
     * - [`OnlineWorkers`] is decremented
     */
    get isV1240(): boolean {
        return this._chain.getEventHash('PhalaComputation.WorkerStopped') === 'da6fbbac52b4be480812462fce29bab263d644f64756e825d79ddc539a21abdb'
    }

    /**
     * Worker stops computing.
     * 
     * Affected states:
     * - the worker info at [`Sessions`] is updated with `WorkerCoolingDown` state
     * - [`OnlineWorkers`] is decremented
     */
    get asV1240(): {session: Uint8Array} {
        assert(this.isV1240)
        return this._chain.decodeEvent(this.event)
    }
}

export class PhalaPhatContractsClusterCreatedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'PhalaPhatContracts.ClusterCreated')
        this._chain = ctx._chain
        this.event = event
    }

    get isV1240(): boolean {
        return this._chain.getEventHash('PhalaPhatContracts.ClusterCreated') === '76b122ebf8a495b2087cf0abc92924c239d2d19699fa28d2bcacaa436c04d497'
    }

    get asV1240(): {cluster: Uint8Array, systemContract: Uint8Array} {
        assert(this.isV1240)
        return this._chain.decodeEvent(this.event)
    }
}

export class PhalaPhatContractsInstantiatedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'PhalaPhatContracts.Instantiated')
        this._chain = ctx._chain
        this.event = event
    }

    get isV1240(): boolean {
        return this._chain.getEventHash('PhalaPhatContracts.Instantiated') === 'faa6eb7944559e1a7e9857d4d13c9b776fb6c67ceb3de219e0197a5af346c0a1'
    }

    get asV1240(): {contract: Uint8Array, cluster: Uint8Array, deployer: Uint8Array} {
        assert(this.isV1240)
        return this._chain.decodeEvent(this.event)
    }
}

export class PhalaPhatContractsWorkerAddedToClusterEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'PhalaPhatContracts.WorkerAddedToCluster')
        this._chain = ctx._chain
        this.event = event
    }

    get isV1240(): boolean {
        return this._chain.getEventHash('PhalaPhatContracts.WorkerAddedToCluster') === '968177eed2de2bf2c8e61ed336eb0687b0eda133b865046fe56d45ba2f83ddd3'
    }

    get asV1240(): {worker: Uint8Array, cluster: Uint8Array} {
        assert(this.isV1240)
        return this._chain.decodeEvent(this.event)
    }
}

export class PhalaPhatContractsWorkerRemovedFromClusterEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'PhalaPhatContracts.WorkerRemovedFromCluster')
        this._chain = ctx._chain
        this.event = event
    }

    get isV1240(): boolean {
        return this._chain.getEventHash('PhalaPhatContracts.WorkerRemovedFromCluster') === '968177eed2de2bf2c8e61ed336eb0687b0eda133b865046fe56d45ba2f83ddd3'
    }

    get asV1240(): {worker: Uint8Array, cluster: Uint8Array} {
        assert(this.isV1240)
        return this._chain.decodeEvent(this.event)
    }
}

export class PhalaPhatTokenomicUserStakeChangedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'PhalaPhatTokenomic.UserStakeChanged')
        this._chain = ctx._chain
        this.event = event
    }

    get isV1240(): boolean {
        return this._chain.getEventHash('PhalaPhatTokenomic.UserStakeChanged') === '1a6d2c08ce9993a93a51d3d78b56ae8b1c6750ee4e5a5910baf93358c9443899'
    }

    get asV1240(): {cluster: (Uint8Array | undefined), account: Uint8Array, contract: Uint8Array, stake: bigint} {
        assert(this.isV1240)
        return this._chain.decodeEvent(this.event)
    }
}

export class PhalaRegistryWorkerAddedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'PhalaRegistry.WorkerAdded')
        this._chain = ctx._chain
        this.event = event
    }

    get isV1240(): boolean {
        return this._chain.getEventHash('PhalaRegistry.WorkerAdded') === '62aabfc3b7ad514db79224f111b8a77d10eec5bfb10570491e4ae9114115d90c'
    }

    get asV1240(): {pubkey: Uint8Array, attestationProvider: (v1240.AttestationProvider | undefined), confidenceLevel: number} {
        assert(this.isV1240)
        return this._chain.decodeEvent(this.event)
    }
}
