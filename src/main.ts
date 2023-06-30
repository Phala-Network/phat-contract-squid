import {In} from 'typeorm'
import {Store, TypeormDatabase} from '@subsquid/typeorm-store'
import {
  Account,
  Cluster,
  Contract,
  ContractStake,
  Meta,
  Worker,
  WorkerState,
} from './model'
import fetch from 'node-fetch'
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
  // PhalaPhatTokenomicContractDepositChangedEvent,
  PhalaPhatTokenomicUserStakeChangedEvent,
  PhalaRegistryWorkerAddedEvent,
} from './types/events'
import {toHex} from '@subsquid/substrate-processor'
import {assertGet, encodeAddress, join, toBalance, toMap} from './utils'
import {BigDecimal} from '@subsquid/big-decimal'

interface Dump {
  workers: {
    id: string
    session?: string
    state?: WorkerState
    pInit?: number
    pInstant?: number
  }[]
  clusters: {id: string; owner: string; workers: string[]}[]
}

const importDump = async (ctx: ProcessorContext<Store>) => {
  const dump = await fetch(
    'https://raw.githubusercontent.com/Phala-Network/phat-contract-squid/main/dump_2512648.json'
  ).then(async (res) => (await res.json()) as Dump)
  const workers: Worker[] = []
  const clusters: Cluster[] = []
  const meta = new Meta({
    id: '0',
    cluster: 0,
    pInstant: 0,
    worker: 0,
    idleWorker: 0,
    stake: BigDecimal(0),
    staker: 0,
  })

  for (const worker of dump.workers) {
    workers.push(
      new Worker({
        id: worker.id,
        session: worker.session,
        state: worker.state ?? WorkerState.Ready,
        pInit: worker.pInit ?? 0,
        pInstant: worker.pInstant ?? 0,
      })
    )
  }

  const workerMap = toMap(workers)

  for (const cluster of dump.clusters) {
    const c = new Cluster({
      id: cluster.id,
      pInstant: 0,
      idleWorker: 0,
      worker: cluster.workers.length,
      stake: BigDecimal(0),
      staker: 0,
    })
    clusters.push(c)

    for (const workerId of cluster.workers) {
      const worker = assertGet(workerMap, workerId)
      worker.cluster = c
      meta.worker++
      if (worker.state === WorkerState.WorkerIdle) {
        c.idleWorker++
        c.pInstant += worker.pInstant
        meta.idleWorker++
        meta.pInstant += worker.pInstant
      }
    }
  }

  meta.cluster = clusters.length

  await ctx.store.insert(meta)
  await ctx.store.insert(clusters)
  await ctx.store.insert(workers)
}

processor.run(new TypeormDatabase(), async (ctx) => {
  if ((await ctx.store.get(Meta, '0')) == null) {
    ctx.log.info('Importing dump...')
    await importDump(ctx)
    ctx.log.info('Dump imported')
  }
  const meta = await ctx.store.findOneByOrFail(Meta, {id: '0'})
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
    if (name === 'PhalaPhatTokenomic.UserStakeChanged') {
      contractStakeIdSet.add(join(args.contractId, args.accountId))
    }
  }

  const workers = await ctx.store.find(Worker, {
    where: [{id: In([...workerIdSet])}, {session: In([...sessionIdSet])}],
    relations: {cluster: true},
  })
  const workerMap = toMap(workers)
  const workerSessionMap = toMap(
    workers.filter((w): w is Worker & {session: string} => w.session != null),
    (worker) => worker.session
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

  for (const {name, args} of events) {
    switch (name) {
      case 'PhalaPhatContracts.ClusterCreated': {
        const {clusterId} = args
        clusterMap.set(
          clusterId,
          new Cluster({
            id: clusterId,
            pInstant: 0,
            worker: 0,
            idleWorker: 0,
            stake: BigDecimal(0),
            staker: 0,
          })
        )
        break
      }
      case 'PhalaPhatContracts.Instantiated': {
        const {clusterId, contractId, accountId} = args
        const cluster = assertGet(clusterMap, clusterId)
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
      case 'PhalaPhatContracts.WorkerAddedToCluster': {
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
      case 'PhalaPhatContracts.WorkerRemovedFromCluster': {
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
      case 'PhalaPhatTokenomic.UserStakeChanged': {
        const {clusterId, accountId, contractId, stake} = args
        console.log(contractId)
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
        if (worker.cluster) {
          const cluster = assertGet(clusterMap, worker.cluster.id)
          cluster.idleWorker++
          meta.idleWorker++
        }
        break
      }
      case 'PhalaComputation.WorkerStopped': {
        const {sessionId} = args
        const worker = assertGet(workerSessionMap, sessionId)
        worker.state = WorkerState.WorkerCoolingDown
        if (worker.cluster) {
          const cluster = assertGet(clusterMap, worker.cluster.id)
          cluster.idleWorker--
          cluster.pInstant -= worker.pInstant
          meta.idleWorker--
          meta.pInstant -= worker.pInstant
          worker.pInstant = 0
        }
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
          if (worker.cluster) {
            const cluster = assertGet(clusterMap, worker.cluster.id)
            cluster.idleWorker--
            cluster.pInstant -= worker.pInstant
            meta.idleWorker--
            meta.pInstant -= worker.pInstant
          }
        }
        break
      }
      case 'PhalaComputation.WorkerExitUnresponsive': {
        const {sessionId} = args
        const worker = assertGet(workerSessionMap, sessionId)
        worker.state = WorkerState.WorkerIdle
        if (worker.cluster) {
          const cluster = assertGet(clusterMap, worker.cluster.id)
          cluster.idleWorker++
          cluster.pInstant += worker.pInstant
          meta.idleWorker++
          meta.pInstant += worker.pInstant
        }
        break
      }
      case 'PhalaComputation.BenchmarkUpdated': {
        const {sessionId, pInstant} = args
        const worker = assertGet(workerSessionMap, sessionId)
        if (worker.cluster) {
          const cluster = assertGet(clusterMap, worker.cluster.id)
          cluster.pInstant -= worker.pInstant
          cluster.pInstant += pInstant
          meta.pInstant -= worker.pInstant
          meta.pInstant += pInstant
        }
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

  await ctx.store.save([...accountMap.values()])
  await ctx.store.save([...clusterMap.values()])
  await ctx.store.save([...workerMap.values()])
  await ctx.store.save([...contractMap.values()])
  await ctx.store.save([...contractStakeMap.values()])

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
        const cluster = assertGet(clusterMap, contractStake.contract.cluster.id)
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
    await ctx.store.save(meta)
    await ctx.store.save([...clusterMap.values()])
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
          accountId: encodeAddress(deployer),
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
    // case 'PhalaPhatTokenomic.ContractDepositChanged': {
    //   const {contract, deposit} =
    //     new PhalaPhatTokenomicContractDepositChangedEvent(ctx, event).asV1240
    //   return {
    //     name,
    //     args: {contractId: toHex(contract), deposit: deposit.toString()},
    //   }
    // }
    case 'PhalaPhatTokenomic.UserStakeChanged': {
      const {cluster, account, contract, stake} =
        new PhalaPhatTokenomicUserStakeChangedEvent(ctx, event).asV1240
      return {
        name,
        args: {
          clusterId: cluster && toHex(cluster),
          accountId: encodeAddress(account),
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
