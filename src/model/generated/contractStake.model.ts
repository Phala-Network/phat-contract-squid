import {BigDecimal} from "@subsquid/big-decimal"
import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, BigDecimalColumn as BigDecimalColumn_} from "@subsquid/typeorm-store"
import {Contract} from "./contract.model"
import {Account} from "./account.model"

@Entity_()
export class ContractStake {
    constructor(props?: Partial<ContractStake>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Contract, {nullable: true})
    contract!: Contract

    @Index_()
    @ManyToOne_(() => Account, {nullable: true})
    account!: Account

    @BigDecimalColumn_({nullable: false})
    amount!: BigDecimal
}
