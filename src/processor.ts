import {lookupArchive} from '@subsquid/archive-registry'
import {
  BlockHeader,
  DataHandlerContext,
  SubstrateBatchProcessor,
  SubstrateBatchProcessorFields,
} from '@subsquid/substrate-processor'
import {Store} from '@subsquid/typeorm-store'

export const processor = new SubstrateBatchProcessor()
  .setBlockRange({from: 2512649})
  .includeAllBlocks()
  .setDataSource({
    archive: lookupArchive('phala', {release: 'ArrowSquid'}),
    chain: {url: 'wss://phala-rpc.dwellir.com', rateLimit: 10},
  })
  .addEvent({
    name: [
      'PhalaPhatContracts.ClusterCreated',
      'PhalaPhatContracts.Instantiated',
      'PhalaPhatContracts.WorkerAddedToCluster',
      'PhalaPhatContracts.WorkerRemovedFromCluster',
      'PhalaPhatTokenomic.UserStakeChanged',

      'PhalaComputation.WorkerStarted',
      'PhalaComputation.WorkerStopped',
      'PhalaComputation.WorkerReclaimed',
      'PhalaComputation.SessionBound',
      'PhalaComputation.SessionUnbound',
      'PhalaComputation.WorkerEnterUnresponsive',
      'PhalaComputation.WorkerExitUnresponsive',

      'PhalaRegistry.WorkerAdded',
    ],
  })

export type Fields = SubstrateBatchProcessorFields<typeof processor>
export type Ctx = DataHandlerContext<Store, Fields>
export type SubstrateBlock = BlockHeader<Fields>
