import {Worker} from '../model'
import type {Ctx} from '../processor'

export const getWorker = async (
  ctx: Ctx,
  workerMap: Map<string, Worker>,
  workerId: string,
) => {
  let worker = workerMap.get(workerId)
  if (!worker) {
    worker = await ctx.store.findOneBy(Worker, {id: workerId})
    if (worker) {
      workerMap.set(workerId, worker)
    }
  }
  return worker
}
