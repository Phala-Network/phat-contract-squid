import assert from 'node:assert'
import {BigDecimal} from '@subsquid/big-decimal'
import {TypeormDatabase} from '@subsquid/typeorm-store'
import {In} from 'typeorm'
import {ENABLE_SNAPSHOT, INITIAL_BLOCK, INITIAL_WORKERS} from './constants'
import {
  Account,
  Cluster,
  Contract,
  ContractStake,
  Meta,
  Worker,
  WorkerState,
} from './model'
import {type Ctx, type SubstrateBlock, processor} from './processor'
import {isSnapshotUpdateNeeded, takeSnapshot} from './snapshot'
import {
  phalaComputation,
  phalaPhatContracts,
  phalaPhatTokenomic,
  phalaRegistry,
} from './types/events'
import {assertGet, encodeAddress, join, save, toBalance, toMap} from './utils'

processor.run(new TypeormDatabase(), async (ctx) => {
  const meta =
    (await ctx.store.findOneBy(Meta, {id: '0'})) ??
    new Meta({
      id: '0',
      cluster: 0,
      pInit: 0,
      worker: 0,
      idleWorker: 0,
      stake: BigDecimal(0),
      staker: 0,
      contract: 0,
      height: INITIAL_BLOCK,
      snapshotUpdatedTime: new Date('2023-05-10'),
    })
  const events = getEvents(ctx)
  const workerIdSet = new Set<string>()
  const sessionIdSet = new Set<string>()
  const contractIdSet = new Set<string>()
  const accountIdSet = new Set<string>()
  const contractStakeIdSet = new Set<string>()

  for (const {name, args} of events) {
    if (args.sessionId) {
      sessionIdSet.add(args.sessionId)
    }
    if (args.workerId) {
      workerIdSet.add(args.workerId)
    }
    if (args.contractId) {
      contractIdSet.add(args.contractId)
    }
    if (args.accountId) {
      accountIdSet.add(args.accountId)
    }
    if (name === phalaPhatTokenomic.userStakeChanged.name) {
      contractStakeIdSet.add(join(args.contractId, args.accountId))
    }
    if (name === phalaPhatContracts.clusterCreated.name) {
      const workerIds = INITIAL_WORKERS[args.clusterId]
      assert(
        workerIds != null,
        `No initial workers for cluster ${args.clusterId}`,
      )
      for (const workerId of workerIds) {
        workerIdSet.add(workerId)
      }
    }
  }

  const workers = await ctx.store.find(Worker, {
    where: [{id: In([...workerIdSet])}, {session: In([...sessionIdSet])}],
    relations: {cluster: true},
  })
  const workerMap = toMap(workers)
  const workerSessionMap = toMap(
    workers.filter((w): w is Worker & {session: string} => w.session != null),
    (worker) => worker.session,
  )
  const contracts = await ctx.store.find(Contract, {
    where: {id: In([...contractIdSet])},
    relations: {cluster: true, deployer: true},
  })
  const contractMap = toMap(contracts)
  const clusters = await ctx.store.find(Cluster)
  const clusterMap = toMap(clusters)
  const contractStakes = await ctx.store.find(ContractStake, {
    where: {id: In([...contractStakeIdSet])},
    relations: {account: true, contract: true},
  })
  const contractStakeMap = toMap(contractStakes)
  const accounts = await ctx.store.find(Account, {
    where: {id: In([...accountIdSet])},
  })
  const accountMap = toMap(accounts)

  for (let i = 0; i < events.length; i++) {
    const {name, args, block} = events[i]
    switch (name) {
      case phalaPhatContracts.clusterCreated.name: {
        const {clusterId} = args
        const cluster = new Cluster({
          id: clusterId,
          pInit: 0,
          worker: 0,
          idleWorker: 0,
          stake: BigDecimal(0),
          staker: 0,
          contract: 0,
        })
        clusterMap.set(clusterId, cluster)
        meta.cluster++
        const workerIds = INITIAL_WORKERS[clusterId]
        assert(workerIds)
        for (const workerId of workerIds) {
          const worker = assertGet(workerMap, workerId)
          worker.cluster = cluster
          cluster.worker++
          meta.worker++
          if (worker.state === WorkerState.WorkerIdle) {
            cluster.idleWorker++
            cluster.pInit += worker.pInit
            meta.idleWorker++
            meta.pInit += worker.pInit
          }
        }
        break
      }
      case phalaPhatContracts.instantiated.name: {
        const {clusterId, contractId, accountId} = args
        const cluster = assertGet(clusterMap, clusterId)
        cluster.contract++
        meta.contract++
        const contract = new Contract({
          id: contractId,
          deployer: getAccount(accountMap, accountId),
          cluster,
          stake: BigDecimal(0),
          staker: 0,
        })
        contractMap.set(contractId, contract)
        break
      }
      case phalaPhatContracts.workerAddedToCluster.name: {
        const {clusterId, workerId} = args
        const cluster = assertGet(clusterMap, clusterId)
        const worker = assertGet(workerMap, workerId)
        worker.cluster = cluster
        cluster.worker++
        meta.worker++
        if (worker.state === WorkerState.WorkerIdle) {
          cluster.idleWorker++
          meta.idleWorker++
        }
        break
      }
      case phalaPhatContracts.workerRemovedFromCluster.name: {
        const {clusterId, workerId} = args
        const cluster = assertGet(clusterMap, clusterId)
        const worker = assertGet(workerMap, workerId)
        worker.cluster = null
        cluster.worker--
        meta.worker--
        if (worker.state === WorkerState.WorkerIdle) {
          cluster.idleWorker--
          meta.idleWorker--
        }
        break
      }
      case phalaPhatTokenomic.userStakeChanged.name: {
        const {clusterId, accountId, contractId, stake} = args
        const cluster = assertGet(clusterMap, clusterId)
        const contract = assertGet(contractMap, contractId)
        const account = getAccount(accountMap, accountId)
        const id = join(contractId, accountId)
        const contractStake =
          contractStakeMap.get(id) ??
          new ContractStake({
            id,
            amount: BigDecimal(0),
            contract,
            account,
          })
        const prevAmount = contractStake.amount
        contractStake.amount = stake
        contract.stake = contract.stake.minus(prevAmount).plus(stake)
        cluster.stake = cluster.stake.minus(prevAmount).plus(stake)
        meta.stake = meta.stake.minus(prevAmount).plus(stake)
        contractStakeMap.set(contractStake.id, contractStake)
        if (prevAmount.eq(BigDecimal(0)) && stake.gt(BigDecimal(0))) {
          contract.staker++
        } else if (prevAmount.gt(BigDecimal(0)) && stake.eq(BigDecimal(0))) {
          contract.staker--
        }
        break
      }
      case phalaComputation.sessionBound.name: {
        const {sessionId, workerId} = args
        const worker = assertGet(workerMap, workerId)
        worker.session = sessionId
        workerSessionMap.set(sessionId, worker as Worker & {session: string})
        break
      }
      case phalaComputation.sessionUnbound.name: {
        const {workerId, sessionId} = args
        const worker = assertGet(workerMap, workerId)
        worker.session = null
        workerSessionMap.delete(sessionId)
        break
      }
      case phalaComputation.workerStarted.name: {
        const {sessionId, initP} = args
        const worker = assertGet(workerSessionMap, sessionId)
        worker.pInit = initP
        worker.state = WorkerState.WorkerIdle
        if (worker.cluster) {
          const cluster = assertGet(clusterMap, worker.cluster.id)
          cluster.idleWorker++
          cluster.pInit += initP
          meta.idleWorker++
          meta.pInit += initP
        }
        break
      }
      case phalaComputation.workerStopped.name: {
        const {sessionId} = args
        const worker = assertGet(workerSessionMap, sessionId)
        worker.state = WorkerState.WorkerCoolingDown
        if (worker.cluster) {
          const cluster = assertGet(clusterMap, worker.cluster.id)
          cluster.idleWorker--
          cluster.pInit -= worker.pInit
          meta.idleWorker--
          meta.pInit -= worker.pInit
        }
        break
      }
      case phalaComputation.workerReclaimed.name: {
        const {sessionId} = args
        const worker = assertGet(workerSessionMap, sessionId)
        worker.state = WorkerState.Ready
        break
      }
      case phalaComputation.workerEnterUnresponsive.name: {
        const {sessionId} = args
        const worker = assertGet(workerSessionMap, sessionId)
        if (worker.state === WorkerState.WorkerIdle) {
          worker.state = WorkerState.WorkerUnresponsive
          if (worker.cluster) {
            const cluster = assertGet(clusterMap, worker.cluster.id)
            cluster.idleWorker--
            cluster.pInit -= worker.pInit
            meta.idleWorker--
            meta.pInit -= worker.pInit
          }
        }
        break
      }
      case phalaComputation.workerExitUnresponsive.name: {
        const {sessionId} = args
        const worker = assertGet(workerSessionMap, sessionId)
        worker.state = WorkerState.WorkerIdle
        if (worker.cluster) {
          const cluster = assertGet(clusterMap, worker.cluster.id)
          cluster.idleWorker++
          cluster.pInit += worker.pInit
          meta.idleWorker++
          meta.pInit += worker.pInit
        }
        break
      }
      case phalaRegistry.workerAdded.name: {
        const {workerId} = args
        workerMap.set(
          workerId,
          new Worker({
            id: workerId,
            state: WorkerState.Ready,
            pInit: 0,
          }),
        )
        break
      }
    }

    const nextEvent = events[i + 1]
    const isLastEventInHandler = nextEvent == null
    const isLastEventInBlock =
      isLastEventInHandler || block.height !== nextEvent.block.height
    const shouldTakeSnapshot =
      ENABLE_SNAPSHOT &&
      isLastEventInBlock &&
      isSnapshotUpdateNeeded(block, meta)

    if (shouldTakeSnapshot || isLastEventInHandler) {
      await save(ctx, [
        accountMap,
        clusterMap,
        workerMap,
        contractMap,
        contractStakeMap,
      ])

      {
        const contractStakes = await ctx.store.find(ContractStake, {
          relations: {account: true, contract: {cluster: true}},
        })
        const stakerSet = new Set<string>()
        const clusterStakerMap = new Map<string, Set<string>>()
        for (const contractStake of contractStakes) {
          if (contractStake.amount.gt(0)) {
            const accountId = contractStake.account.id
            stakerSet.add(accountId)
            const cluster = assertGet(
              clusterMap,
              contractStake.contract.cluster.id,
            )
            const clusterStakerSet =
              clusterStakerMap.get(cluster.id) ?? new Set<string>()
            clusterStakerSet.add(accountId)
            clusterStakerMap.set(cluster.id, clusterStakerSet)
          }
        }
        meta.staker = stakerSet.size
        for (const [clusterId, stakerSet] of clusterStakerMap) {
          const cluster = assertGet(clusterMap, clusterId)
          cluster.staker = stakerSet.size
        }
      }

      meta.height = block.height
      await save(ctx, [meta, clusterMap])
    }

    if (shouldTakeSnapshot) {
      await takeSnapshot(ctx, block, meta)
    }
  }
})

const decodeEvent = (event: Ctx['blocks'][number]['events'][number]) => {
  const {name} = event
  const error = new Error(
    `Unsupported spec: ${event.name} v${event.block.specVersion}`,
  )
  switch (name) {
    case phalaComputation.sessionBound.name: {
      if (phalaComputation.sessionBound.v1240.is(event)) {
        const {session, worker} =
          phalaComputation.sessionBound.v1240.decode(event)
        return {
          name,
          args: {sessionId: encodeAddress(session), workerId: worker},
        }
      }
      throw error
    }
    case phalaComputation.sessionUnbound.name: {
      if (phalaComputation.sessionUnbound.v1240.is(event)) {
        const {session, worker} =
          phalaComputation.sessionUnbound.v1240.decode(event)
        return {
          name,
          args: {sessionId: encodeAddress(session), workerId: worker},
        }
      }
      throw error
    }
    case phalaComputation.workerStarted.name: {
      if (phalaComputation.workerStarted.v1240.is(event)) {
        const {session, initP} =
          phalaComputation.workerStarted.v1240.decode(event)
        return {name, args: {sessionId: encodeAddress(session), initP}}
      }
      throw error
    }
    case phalaComputation.workerStopped.name: {
      if (phalaComputation.workerStopped.v1240.is(event)) {
        const {session} = phalaComputation.workerStopped.v1240.decode(event)
        return {name, args: {sessionId: encodeAddress(session)}}
      }
      throw error
    }
    case phalaComputation.workerReclaimed.name: {
      if (phalaComputation.workerReclaimed.v1240.is(event)) {
        const {session} = phalaComputation.workerReclaimed.v1240.decode(event)
        return {name, args: {sessionId: encodeAddress(session)}}
      }
      throw error
    }
    case phalaComputation.workerEnterUnresponsive.name: {
      if (phalaComputation.workerEnterUnresponsive.v1240.is(event)) {
        const {session} =
          phalaComputation.workerEnterUnresponsive.v1240.decode(event)
        return {name, args: {sessionId: encodeAddress(session)}}
      }
      throw error
    }
    case phalaComputation.workerExitUnresponsive.name: {
      if (phalaComputation.workerExitUnresponsive.v1240.is(event)) {
        const {session} =
          phalaComputation.workerExitUnresponsive.v1240.decode(event)
        return {name, args: {sessionId: encodeAddress(session)}}
      }
      throw error
    }
    case phalaRegistry.workerAdded.name: {
      if (phalaRegistry.workerAdded.v1240.is(event)) {
        const pubkey = phalaRegistry.workerAdded.v1240.decode(event).pubkey
        return {name, args: {workerId: pubkey}}
      }
      if (phalaRegistry.workerAdded.v1260.is(event)) {
        const pubkey = phalaRegistry.workerAdded.v1260.decode(event).pubkey
        return {name, args: {workerId: pubkey}}
      }
      throw error
    }

    case phalaPhatContracts.clusterCreated.name: {
      if (phalaPhatContracts.clusterCreated.v1240.is(event)) {
        const {cluster} = phalaPhatContracts.clusterCreated.v1240.decode(event)
        return {name, args: {clusterId: cluster}}
      }
      throw error
    }
    case phalaPhatContracts.instantiated.name: {
      if (phalaPhatContracts.instantiated.v1240.is(event)) {
        const {contract, deployer, cluster} =
          phalaPhatContracts.instantiated.v1240.decode(event)
        return {
          name,
          args: {
            contractId: contract,
            accountId: encodeAddress(deployer),
            clusterId: cluster,
          },
        }
      }
      throw error
    }
    case phalaPhatContracts.workerAddedToCluster.name: {
      if (phalaPhatContracts.workerAddedToCluster.v1240.is(event)) {
        const {worker, cluster} =
          phalaPhatContracts.workerAddedToCluster.v1240.decode(event)
        return {
          name,
          args: {clusterId: cluster, workerId: worker},
        }
      }
      throw error
    }
    case phalaPhatContracts.workerRemovedFromCluster.name: {
      if (phalaPhatContracts.workerRemovedFromCluster.v1240.is(event)) {
        const {worker, cluster} =
          phalaPhatContracts.workerRemovedFromCluster.v1240.decode(event)
        return {
          name,
          args: {clusterId: cluster, workerId: worker},
        }
      }
      throw error
    }
    // case phalaPhatTokenomic.contractDepositChanged.name: {
    //   const {contract, deposit} =
    //     new PhalaPhatTokenomicContractDepositChangedEvent(ctx, event).asV1240
    //   return {
    //     name,
    //     args: {contractId: (contract), deposit: deposit.toString()},
    //   }
    // }
    case phalaPhatTokenomic.userStakeChanged.name: {
      if (phalaPhatTokenomic.userStakeChanged.v1240.is(event)) {
        const {cluster, account, contract, stake} =
          phalaPhatTokenomic.userStakeChanged.v1240.decode(event)
        return {
          name,
          args: {
            clusterId: cluster,
            accountId: encodeAddress(account),
            contractId: contract,
            stake: toBalance(stake),
          },
        }
      }
      throw error
    }
  }
}

function getEvents(ctx: Ctx): Array<
  Exclude<ReturnType<typeof decodeEvent>, undefined> & {
    block: SubstrateBlock
  }
> {
  const events = []
  for (const block of ctx.blocks) {
    for (const event of block.events) {
      const decoded = decodeEvent(event)
      if (decoded != null) {
        events.push({...decoded, block: block.header})
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
