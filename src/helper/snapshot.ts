import {assertNotNull} from '@subsquid/substrate-processor'
import {addDays, isAfter, isBefore} from 'date-fns'
import {type Meta, MetaSnapshot} from '../model'
import type {Ctx, SubstrateBlock} from '../processor'
import {save} from '../utils'

export const createMetaSnapshot = (
  meta: Meta,
  updatedTime: Date,
): MetaSnapshot => {
  return new MetaSnapshot({
    id: updatedTime.toISOString(),
    updatedTime,
    height: meta.height,
    cluster: meta.cluster,
    pInit: meta.pInit,
    worker: meta.worker,
    idleWorker: meta.idleWorker,
    stake: meta.stake,
    staker: meta.staker,
    contract: meta.contract,
  })
}

export const getSnapshotUpdatedTime = (timestamp: number): Date => {
  const updatedTime = new Date(timestamp)
  updatedTime.setUTCHours(0, 0, 0, 0)
  return updatedTime
}

export const isSnapshotUpdateNeeded = (
  block: SubstrateBlock,
  meta: Meta,
): boolean => {
  const updatedTime = getSnapshotUpdatedTime(assertNotNull(block.timestamp))
  return isAfter(updatedTime, meta.snapshotUpdatedTime)
}

export const takeSnapshot = async (
  ctx: Ctx,
  block: SubstrateBlock,
  meta: Meta,
) => {
  const updatedTime = getSnapshotUpdatedTime(assertNotNull(block.timestamp))
  const updatedTimeStr = updatedTime.toISOString()
  ctx.log.info(`Saving snapshots ${block.height} ${updatedTimeStr}`)
  const metaSnapshots: MetaSnapshot[] = []
  const latestMetaSnapshot = await ctx.store
    .find(MetaSnapshot, {
      order: {updatedTime: 'DESC'},
      take: 1,
    })
    .then((arr) => arr.at(0))

  meta.snapshotUpdatedTime = addDays(meta.snapshotUpdatedTime, 1)

  while (
    latestMetaSnapshot != null &&
    isBefore(meta.snapshotUpdatedTime, updatedTime)
  ) {
    const updatedTime = meta.snapshotUpdatedTime
    metaSnapshots.push(
      new MetaSnapshot({
        ...latestMetaSnapshot,
        id: updatedTime.toISOString(),
        updatedTime,
      }),
    )
    meta.snapshotUpdatedTime = addDays(meta.snapshotUpdatedTime, 1)
  }
  metaSnapshots.push(createMetaSnapshot(meta, updatedTime))

  await save(ctx, [meta, metaSnapshots])

  ctx.log.info(`Snapshots saved ${block.height} ${updatedTimeStr}`)
}
