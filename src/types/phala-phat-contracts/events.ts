import {sts, Block, Bytes, Option, Result, EventType, RuntimeCtx} from '../support'
import * as v1240 from '../v1240'

export const clusterCreated =  {
    name: 'PhalaPhatContracts.ClusterCreated' as const,
    v1240: new EventType(
        'PhalaPhatContracts.ClusterCreated',
        sts.struct({
            cluster: v1240.H256,
            systemContract: v1240.H256,
        })
    ),
}

export const instantiated =  {
    name: 'PhalaPhatContracts.Instantiated' as const,
    v1240: new EventType(
        'PhalaPhatContracts.Instantiated',
        sts.struct({
            contract: v1240.H256,
            cluster: v1240.H256,
            deployer: v1240.H256,
        })
    ),
}

export const workerAddedToCluster =  {
    name: 'PhalaPhatContracts.WorkerAddedToCluster' as const,
    v1240: new EventType(
        'PhalaPhatContracts.WorkerAddedToCluster',
        sts.struct({
            worker: v1240.Public,
            cluster: v1240.H256,
        })
    ),
}

export const workerRemovedFromCluster =  {
    name: 'PhalaPhatContracts.WorkerRemovedFromCluster' as const,
    v1240: new EventType(
        'PhalaPhatContracts.WorkerRemovedFromCluster',
        sts.struct({
            worker: v1240.Public,
            cluster: v1240.H256,
        })
    ),
}
