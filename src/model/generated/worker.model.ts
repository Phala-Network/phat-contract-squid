import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, StringColumn as StringColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Cluster} from "./cluster.model"
import {WorkerState} from "./_workerState"

@Entity_()
export class Worker {
    constructor(props?: Partial<Worker>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Cluster, {nullable: true})
    cluster!: Cluster | undefined | null

    @StringColumn_({nullable: true})
    session!: string | undefined | null

    @Column_("varchar", {length: 18, nullable: false})
    state!: WorkerState

    @IntColumn_({nullable: false})
    pInit!: number
}
