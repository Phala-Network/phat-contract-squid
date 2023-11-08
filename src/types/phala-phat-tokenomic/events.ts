import {sts, Block, Bytes, Option, Result, EventType, RuntimeCtx} from '../support'
import * as v1240 from '../v1240'

export const userStakeChanged =  {
    name: 'PhalaPhatTokenomic.UserStakeChanged' as const,
    v1240: new EventType(
        'PhalaPhatTokenomic.UserStakeChanged',
        sts.struct({
            cluster: sts.option(() => v1240.H256),
            account: v1240.AccountId32,
            contract: v1240.H256,
            stake: sts.bigint(),
        })
    ),
}
