import {BigDecimal} from "@subsquid/big-decimal"
import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_} from "typeorm"
import * as marshal from "./marshal"

@Entity_()
export class Cluster {
    constructor(props?: Partial<Cluster>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Column_("int4", {nullable: false})
    pInit!: number

    @Column_("int4", {nullable: false})
    worker!: number

    @Column_("int4", {nullable: false})
    idleWorker!: number

    @Column_("numeric", {transformer: marshal.bigdecimalTransformer, nullable: false})
    stake!: BigDecimal

    @Column_("int4", {nullable: false})
    staker!: number

    @Column_("int4", {nullable: false})
    contract!: number
}
