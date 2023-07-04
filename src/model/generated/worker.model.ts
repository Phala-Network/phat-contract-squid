import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
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

    @Column_("text", {nullable: true})
    session!: string | undefined | null

    @Column_("varchar", {length: 18, nullable: false})
    state!: WorkerState

    @Column_("int4", {nullable: false})
    pInit!: number
}
