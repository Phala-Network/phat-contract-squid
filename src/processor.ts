import {
  type BlockHeader,
  type DataHandlerContext,
  SubstrateBatchProcessor,
  type SubstrateBatchProcessorFields,
} from '@subsquid/substrate-processor'
import type {Store} from '@subsquid/typeorm-store'
import {INITIAL_BLOCK, RPC_ENDPOINT, TO_BLOCK} from './constants'
import {
  phalaComputation,
  phalaPhatContracts,
  phalaPhatTokenomic,
  phalaRegistry,
} from './types/events'

export const processor = new SubstrateBatchProcessor()
  .setGateway('https://v2.archive.subsquid.io/network/phala')
  .setRpcEndpoint(RPC_ENDPOINT)
  .setBlockRange({
    from: INITIAL_BLOCK + 1,
    to: TO_BLOCK,
  })
  .addEvent({
    name: [
      phalaPhatContracts.clusterCreated.name,
      phalaPhatContracts.instantiated.name,
      phalaPhatContracts.workerAddedToCluster.name,
      phalaPhatContracts.workerRemovedFromCluster.name,
      phalaPhatTokenomic.userStakeChanged.name,

      phalaComputation.workerStarted.name,
      phalaComputation.workerStopped.name,
      phalaComputation.workerReclaimed.name,
      phalaComputation.sessionBound.name,
      phalaComputation.sessionUnbound.name,
      phalaComputation.workerEnterUnresponsive.name,
      phalaComputation.workerExitUnresponsive.name,

      phalaRegistry.workerAdded.name,
    ],
  })
  .setFields({
    block: {timestamp: true},
    event: {name: true, args: true},
  })

export type Fields = SubstrateBatchProcessorFields<typeof processor>
export type Ctx = DataHandlerContext<Store, Fields>
export type SubstrateBlock = BlockHeader<Fields>
