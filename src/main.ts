import {BigDecimal} from '@subsquid/big-decimal'
import {TypeormDatabase} from '@subsquid/typeorm-store'
import fetch from 'node-fetch'
import {In} from 'typeorm'
import {
  Account,
  Cluster,
  Contract,
  ContractStake,
  Meta,
  Worker,
  WorkerState,
} from './model'
import {Ctx, SubstrateBlock, processor} from './processor'
import {
  phalaComputation,
  phalaPhatContracts,
  phalaPhatTokenomic,
  phalaRegistry,
} from './types/events'
import {assertGet, encodeAddress, join, toBalance, toMap} from './utils'

interface Dump {
  workers: {
    id: string
    session?: string
    state?: WorkerState
    pInit?: number
  }[]
  clusters: {id: string; owner: string; workers: string[]}[]
}

const importDump = async (ctx: Ctx) => {
  const dump = await fetch(
    'https://raw.githubusercontent.com/Phala-Network/phat-contract-squid/main/dump_2512648.json'
  ).then(async (res) => (await res.json()) as Dump)
  const workers: Worker[] = []
  const clusters: Cluster[] = []
  const meta = new Meta({
    id: '0',
    cluster: 0,
    pInit: 0,
    worker: 0,
    idleWorker: 0,
    stake: BigDecimal(0),
    staker: 0,
    contract: 0,
  })

  for (const worker of dump.workers) {
    workers.push(
      new Worker({
        id: worker.id,
        session: worker.session,
        state: worker.state ?? WorkerState.Ready,
        pInit: worker.pInit ?? 0,
      })
    )
  }

  const workerMap = toMap(workers)

  for (const cluster of dump.clusters) {
    const c = new Cluster({
      id: cluster.id,
      pInit: 0,
      idleWorker: 0,
      worker: cluster.workers.length,
      stake: BigDecimal(0),
      staker: 0,
      contract: 0,
    })
    clusters.push(c)

    for (const workerId of cluster.workers) {
      const worker = assertGet(workerMap, workerId)
      worker.cluster = c
      meta.worker++
      if (worker.state === WorkerState.WorkerIdle) {
        c.idleWorker++
        c.pInit += worker.pInit
        meta.idleWorker++
        meta.pInit += worker.pInit
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
    if (name === phalaPhatTokenomic.userStakeChanged.name) {
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
      case phalaPhatContracts.clusterCreated.name: {
        const {clusterId} = args
        clusterMap.set(
          clusterId,
          new Cluster({
            id: clusterId,
            pInit: 0,
            worker: 0,
            idleWorker: 0,
            stake: BigDecimal(0),
            staker: 0,
          })
        )
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
  }

  await ctx.store.save(meta)
  await ctx.store.save([...clusterMap.values()])
})

const decodeEvent = (event: Ctx['blocks'][number]['events'][number]) => {
  const {name} = event
  switch (name) {
    case phalaComputation.sessionBound.name: {
      const {session, worker} =
        phalaComputation.sessionBound.v1240.decode(event)
      return {
        name,
        args: {sessionId: encodeAddress(session), workerId: worker},
      }
    }
    case phalaComputation.sessionUnbound.name: {
      const {session, worker} =
        phalaComputation.sessionUnbound.v1240.decode(event)
      return {
        name,
        args: {sessionId: encodeAddress(session), workerId: worker},
      }
    }
    case phalaComputation.workerStarted.name: {
      const {session, initP} =
        phalaComputation.workerStarted.v1240.decode(event)
      return {name, args: {sessionId: encodeAddress(session), initP}}
    }
    case phalaComputation.workerStopped.name: {
      const {session} = phalaComputation.workerStopped.v1240.decode(event)
      return {name, args: {sessionId: encodeAddress(session)}}
    }
    case phalaComputation.workerReclaimed.name: {
      const {session} = phalaComputation.workerReclaimed.v1240.decode(event)
      return {name, args: {sessionId: encodeAddress(session)}}
    }
    case phalaComputation.workerEnterUnresponsive.name: {
      const {session} =
        phalaComputation.workerEnterUnresponsive.v1240.decode(event)
      return {name, args: {sessionId: encodeAddress(session)}}
    }
    case phalaComputation.workerExitUnresponsive.name: {
      const {session} =
        phalaComputation.workerExitUnresponsive.v1240.decode(event)
      return {name, args: {sessionId: encodeAddress(session)}}
    }
    case phalaRegistry.workerAdded.name: {
      let pubkey
      try {
        pubkey = phalaRegistry.workerAdded.v1240.decode(event).pubkey
      } catch (e) {
        pubkey = phalaRegistry.workerAdded.v1260.decode(event).pubkey
      }
      return {name, args: {workerId: pubkey}}
    }

    case phalaPhatContracts.clusterCreated.name: {
      const {cluster} = phalaPhatContracts.clusterCreated.v1240.decode(event)
      return {name, args: {clusterId: cluster}}
    }
    case phalaPhatContracts.instantiated.name: {
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
    case phalaPhatContracts.workerAddedToCluster.name: {
      const {worker, cluster} =
        phalaPhatContracts.workerAddedToCluster.v1240.decode(event)
      return {
        name,
        args: {clusterId: cluster, workerId: worker},
      }
    }
    case phalaPhatContracts.workerRemovedFromCluster.name: {
      const {worker, cluster} =
        phalaPhatContracts.workerRemovedFromCluster.v1240.decode(event)
      return {
        name,
        args: {clusterId: cluster, workerId: worker},
      }
    }
    // case phalaPhatTokenomic. contractDepositChanged.name: {
    //   const {contract, deposit} =
    //     new PhalaPhatTokenomicContractDepositChangedEvent(ctx, event).asV1240
    //   return {
    //     name,
    //     args: {contractId: (contract), deposit: deposit.toString()},
    //   }
    // }
    case phalaPhatTokenomic.userStakeChanged.name: {
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
