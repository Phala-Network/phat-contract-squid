import {BigDecimal} from "@subsquid/big-decimal"
import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, BigDecimalColumn as BigDecimalColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"
import {Cluster} from "./cluster.model"

@Entity_()
export class Contract {
    constructor(props?: Partial<Contract>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Account, {nullable: true})
    deployer!: Account

    @Index_()
    @ManyToOne_(() => Cluster, {nullable: true})
    cluster!: Cluster

    @BigDecimalColumn_({nullable: false})
    stake!: BigDecimal

    @IntColumn_({nullable: false})
    staker!: number
}
