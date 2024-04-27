import {BigDecimal} from "@subsquid/big-decimal"
import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, IntColumn as IntColumn_, BigDecimalColumn as BigDecimalColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class Cluster {
    constructor(props?: Partial<Cluster>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @IntColumn_({nullable: false})
    pInit!: number

    @IntColumn_({nullable: false})
    worker!: number

    @IntColumn_({nullable: false})
    idleWorker!: number

    @BigDecimalColumn_({nullable: false})
    stake!: BigDecimal

    @IntColumn_({nullable: false})
    staker!: number

    @IntColumn_({nullable: false})
    contract!: number
}
