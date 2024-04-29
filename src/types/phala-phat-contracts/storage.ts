import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'
import * as v1240 from '../v1240'

export const clusterWorkers =  {
    v1240: new StorageType('PhalaPhatContracts.ClusterWorkers', 'Default', [v1240.H256], sts.array(() => v1240.Public)) as ClusterWorkersV1240,
}

export interface ClusterWorkersV1240  {
    is(block: RuntimeCtx): boolean
    getDefault(block: Block): v1240.Public[]
    get(block: Block, key: v1240.H256): Promise<(v1240.Public[] | undefined)>
    getMany(block: Block, keys: v1240.H256[]): Promise<(v1240.Public[] | undefined)[]>
    getKeys(block: Block): Promise<v1240.H256[]>
    getKeys(block: Block, key: v1240.H256): Promise<v1240.H256[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<v1240.H256[]>
    getKeysPaged(pageSize: number, block: Block, key: v1240.H256): AsyncIterable<v1240.H256[]>
    getPairs(block: Block): Promise<[k: v1240.H256, v: (v1240.Public[] | undefined)][]>
    getPairs(block: Block, key: v1240.H256): Promise<[k: v1240.H256, v: (v1240.Public[] | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: v1240.H256, v: (v1240.Public[] | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: v1240.H256): AsyncIterable<[k: v1240.H256, v: (v1240.Public[] | undefined)][]>
}
