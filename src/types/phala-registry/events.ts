import {sts, Block, Bytes, Option, Result, EventType, RuntimeCtx} from '../support'
import * as v1240 from '../v1240'

export const workerAdded =  {
    name: 'PhalaRegistry.WorkerAdded' as const,
    v1240: new EventType(
        'PhalaRegistry.WorkerAdded',
        sts.struct({
            pubkey: v1240.Public,
            attestationProvider: sts.option(() => v1240.AttestationProvider),
            confidenceLevel: sts.number(),
        })
    ),
}
