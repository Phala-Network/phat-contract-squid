import {In} from 'typeorm'
import {Store, TypeormDatabase} from '@subsquid/typeorm-store'
import {Account, Worker, WorkerState} from './model'
import {EventItem, ProcessorContext, processor} from './processor'
import {
  PhalaComputationBenchmarkUpdatedEvent,
  PhalaComputationSessionBoundEvent,
  PhalaComputationSessionUnboundEvent,
  PhalaComputationWorkerEnterUnresponsiveEvent,
  PhalaComputationWorkerExitUnresponsiveEvent,
  PhalaComputationWorkerReclaimedEvent,
  PhalaComputationWorkerStartedEvent,
  PhalaComputationWorkerStoppedEvent,
  PhalaPhatContractsClusterCreatedEvent,
  PhalaPhatContractsInstantiatedEvent,
  PhalaPhatContractsWorkerAddedToClusterEvent,
  PhalaPhatContractsWorkerRemovedFromClusterEvent,
  PhalaPhatTokenomicContractDepositChangedEvent,
  PhalaPhatTokenomicUserStakeChangedEvent,
  PhalaRegistryWorkerAddedEvent,
} from './types/events'
import {toHex} from '@subsquid/substrate-processor'
import {assertGet, encodeAddress, toBalance, toMap} from './utils'

processor.run(new TypeormDatabase(), async (ctx) => {
  const events = getEvents(ctx)

  const workerIdSet = new Set<string>()
  const sessionIdSet = new Set<string>()

  for (const {name, args} of events) {
    if (args.sessionId) {
      sessionIdSet.add(args.sessionId)
    }
    if (args.workerId) {
      workerIdSet.add(args.workerId)
    }
  }

  const workers = await ctx.store.find(Worker, {
    where: [{id: In([...workerIdSet])}, {session: In([...workerIdSet])}],
  })

  const workerMap = toMap(workers)
  const workerSessionMap = toMap(
    workers.filter((w): w is Worker & {session: string} => w.session != null),
    (worker) => worker.session
  )

  for (const {name, args} of events) {
    switch (name) {
      case 'PhalaComputation.SessionBound': {
        const {sessionId, workerId} = args
        const worker = assertGet(workerMap, workerId)
        worker.session = sessionId
        workerSessionMap.set(sessionId, worker as Worker & {session: string})
        break
      }
      case 'PhalaComputation.SessionUnbound': {
        const {workerId, sessionId} = args
        const worker = assertGet(workerMap, workerId)
        worker.session = null
        workerSessionMap.delete(sessionId)
        break
      }
      case 'PhalaComputation.WorkerStarted': {
        const {sessionId, initP} = args
        const worker = assertGet(workerSessionMap, sessionId)
        worker.pInit = initP
        worker.state = WorkerState.WorkerIdle
        break
      }
      case 'PhalaComputation.WorkerStopped': {
        const {sessionId} = args
        const worker = assertGet(workerSessionMap, sessionId)
        worker.state = WorkerState.WorkerCoolingDown
        break
      }
      case 'PhalaComputation.WorkerReclaimed': {
        const {sessionId} = args
        const worker = assertGet(workerSessionMap, sessionId)
        worker.state = WorkerState.Ready
        break
      }
      case 'PhalaComputation.WorkerEnterUnresponsive': {
        const {sessionId} = args
        const worker = assertGet(workerSessionMap, sessionId)
        if (worker.state === WorkerState.WorkerIdle) {
          worker.state = WorkerState.WorkerUnresponsive
        }
        break
      }
      case 'PhalaComputation.WorkerExitUnresponsive': {
        const {sessionId} = args
        const worker = assertGet(workerSessionMap, sessionId)
        worker.state = WorkerState.WorkerIdle
        break
      }
      case 'PhalaComputation.BenchmarkUpdated': {
        const {sessionId, pInstant} = args
        const worker = assertGet(workerSessionMap, sessionId)
        worker.pInstant = pInstant
        break
      }
      case 'PhalaRegistry.WorkerAdded': {
        const {workerId} = args
        workerMap.set(
          workerId,
          new Worker({
            id: workerId,
            state: WorkerState.Ready,
            pInit: 0,
            pInstant: 0,
          })
        )
        break
      }
    }
  }
})

const decodeEvent = (ctx: ProcessorContext<Store>, item: EventItem) => {
  const {name, event} = item
  switch (name) {
    case 'PhalaComputation.SessionBound': {
      const e = new PhalaComputationSessionBoundEvent(ctx, item.event)
      const {session, worker} = e.asV1240
      return {
        name,
        args: {sessionId: encodeAddress(session), workerId: toHex(worker)},
      }
    }
    case 'PhalaComputation.SessionUnbound': {
      const e = new PhalaComputationSessionUnboundEvent(ctx, item.event)
      const {session, worker} = e.asV1240
      return {
        name,
        args: {sessionId: encodeAddress(session), workerId: toHex(worker)},
      }
    }
    case 'PhalaComputation.WorkerStarted': {
      const e = new PhalaComputationWorkerStartedEvent(ctx, item.event)
      const {session, initP} = e.asV1240
      return {name, args: {sessionId: encodeAddress(session), initP}}
    }
    case 'PhalaComputation.WorkerStopped': {
      const e = new PhalaComputationWorkerStoppedEvent(ctx, item.event)
      const {session} = e.asV1240
      return {name, args: {sessionId: encodeAddress(session)}}
    }
    case 'PhalaComputation.WorkerReclaimed': {
      const e = new PhalaComputationWorkerReclaimedEvent(ctx, item.event)
      const {session} = e.asV1240
      return {name, args: {sessionId: encodeAddress(session)}}
    }
    case 'PhalaComputation.WorkerEnterUnresponsive': {
      const e = new PhalaComputationWorkerEnterUnresponsiveEvent(
        ctx,
        item.event
      )
      const {session} = e.asV1240
      return {name, args: {sessionId: encodeAddress(session)}}
    }
    case 'PhalaComputation.WorkerExitUnresponsive': {
      const e = new PhalaComputationWorkerExitUnresponsiveEvent(ctx, item.event)
      const {session} = e.asV1240
      return {name, args: {sessionId: encodeAddress(session)}}
    }
    case 'PhalaComputation.BenchmarkUpdated': {
      const e = new PhalaComputationBenchmarkUpdatedEvent(ctx, item.event)
      const {session, pInstant} = e.asV1240
      return {name, args: {sessionId: encodeAddress(session), pInstant}}
    }
    case 'PhalaRegistry.WorkerAdded': {
      const e = new PhalaRegistryWorkerAddedEvent(ctx, item.event)
      const {pubkey} = e.asV1240
      return {name, args: {workerId: toHex(pubkey)}}
    }

    case 'PhalaPhatContracts.ClusterCreated': {
      const {cluster} = new PhalaPhatContractsClusterCreatedEvent(ctx, event)
        .asV1240
      return {name, args: {clusterId: toHex(cluster)}}
    }
    case 'PhalaPhatContracts.Instantiated': {
      const {contract, deployer, cluster} =
        new PhalaPhatContractsInstantiatedEvent(ctx, event).asV1240
      return {
        name,
        args: {
          contractId: toHex(contract),
          deployerId: encodeAddress(deployer),
          clusterId: toHex(cluster),
        },
      }
    }
    case 'PhalaPhatContracts.WorkerAddedToCluster': {
      const {worker, cluster} = new PhalaPhatContractsWorkerAddedToClusterEvent(
        ctx,
        event
      ).asV1240
      return {
        name,
        args: {clusterId: toHex(cluster), workerId: toHex(worker)},
      }
    }
    case 'PhalaPhatContracts.WorkerRemovedFromCluster': {
      const {worker, cluster} =
        new PhalaPhatContractsWorkerRemovedFromClusterEvent(ctx, event).asV1240
      return {
        name,
        args: {clusterId: toHex(cluster), workerId: toHex(worker)},
      }
    }
    case 'PhalaPhatTokenomic.ContractDepositChanged': {
      const {contract, deposit} =
        new PhalaPhatTokenomicContractDepositChangedEvent(ctx, event).asV1240
      return {
        name,
        args: {contractId: toHex(contract), deposit: deposit.toString()},
      }
    }
    case 'PhalaPhatTokenomic.UserStakeChanged': {
      const {cluster, account, contract, stake} =
        new PhalaPhatTokenomicUserStakeChangedEvent(ctx, event).asV1240
      return {
        name,
        args: {
          clusterId: cluster && toHex(cluster),
          userId: encodeAddress(account),
          contractId: toHex(contract),
          stake: toBalance(stake),
        },
      }
    }
  }
}

function getEvents(ctx: ProcessorContext<Store>) {
  const events = []
  for (const block of ctx.blocks) {
    for (const item of block.items) {
      if ('event' in item) {
        const decoded = decodeEvent(ctx, item)
        if (decoded != null) {
          events.push(decoded)
        }
      }
    }
  }
  return events
}

function getAccount(m: Map<string, Account>, id: string): Account {
  let acc = m.get(id)
  if (acc == null) {
    acc = new Account()
    acc.id = id
    m.set(id, acc)
  }
  return acc
}
