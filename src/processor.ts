import {lookupArchive} from '@subsquid/archive-registry'
import {
  BatchContext,
  BatchProcessorCallItem,
  BatchProcessorEventItem,
  BatchProcessorItem,
  SubstrateBatchProcessor,
} from '@subsquid/substrate-processor'

export const processor = new SubstrateBatchProcessor()
  .setBlockRange({from: 2512649})
  .setDataSource({
    archive: lookupArchive('phala', {release: 'FireSquid'}),
  })
  .addEvent('PhalaPhatContracts.ClusterCreated')
  .addEvent('PhalaPhatContracts.Instantiated')
  .addEvent('PhalaPhatContracts.WorkerAddedToCluster')
  .addEvent('PhalaPhatContracts.WorkerRemovedFromCluster')
  // .addEvent('PhalaPhatTokenomic.ContractDepositChanged')
  .addEvent('PhalaPhatTokenomic.UserStakeChanged')

  .addEvent('PhalaComputation.SessionBound')
  .addEvent('PhalaComputation.SessionUnbound')
  .addEvent('PhalaComputation.WorkerStarted')
  .addEvent('PhalaComputation.WorkerStopped')
  .addEvent('PhalaComputation.WorkerReclaimed')
  .addEvent('PhalaComputation.WorkerEnterUnresponsive')
  .addEvent('PhalaComputation.WorkerExitUnresponsive')

  .addEvent('PhalaRegistry.WorkerAdded')

export type Item = BatchProcessorItem<typeof processor>
export type EventItem = BatchProcessorEventItem<typeof processor>
export type CallItem = BatchProcessorCallItem<typeof processor>
export type ProcessorContext<Store> = BatchContext<Store, Item>
