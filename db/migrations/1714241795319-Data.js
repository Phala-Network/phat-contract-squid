module.exports = class Data1714241795319 {
    name = 'Data1714241795319'

    async up(db) {
        await db.query(`CREATE TABLE "meta" ("id" character varying NOT NULL, "cluster" integer NOT NULL, "p_init" integer NOT NULL, "worker" integer NOT NULL, "idle_worker" integer NOT NULL, "stake" numeric NOT NULL, "staker" integer NOT NULL, "contract" integer NOT NULL, "height" integer NOT NULL, "snapshot_updated_time" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_c4c17a6c2bd7651338b60fc590b" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "meta_snapshot" ("id" character varying NOT NULL, "cluster" integer NOT NULL, "p_init" integer NOT NULL, "worker" integer NOT NULL, "idle_worker" integer NOT NULL, "stake" numeric NOT NULL, "staker" integer NOT NULL, "contract" integer NOT NULL, "updated_time" TIMESTAMP WITH TIME ZONE NOT NULL, "height" integer NOT NULL, CONSTRAINT "PK_24bcb53f370000bc98615bd85a3" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "account" ("id" character varying NOT NULL, CONSTRAINT "PK_54115ee388cdb6d86bb4bf5b2ea" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "cluster" ("id" character varying NOT NULL, "p_init" integer NOT NULL, "worker" integer NOT NULL, "idle_worker" integer NOT NULL, "stake" numeric NOT NULL, "staker" integer NOT NULL, "contract" integer NOT NULL, CONSTRAINT "PK_b09d39b9491ce5cb1e8407761fd" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "worker" ("id" character varying NOT NULL, "session" text, "state" character varying(18) NOT NULL, "p_init" integer NOT NULL, "cluster_id" character varying, CONSTRAINT "PK_dc8175fa0e34ce7a39e4ec73b94" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_4e7653385d7c08643bb581e961" ON "worker" ("cluster_id") `)
        await db.query(`CREATE TABLE "contract" ("id" character varying NOT NULL, "stake" numeric NOT NULL, "staker" integer NOT NULL, "deployer_id" character varying, "cluster_id" character varying, CONSTRAINT "PK_17c3a89f58a2997276084e706e8" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_a1418e8b9ab0b912c96a75314e" ON "contract" ("deployer_id") `)
        await db.query(`CREATE INDEX "IDX_fc90f056cd6a668277d9754d11" ON "contract" ("cluster_id") `)
        await db.query(`CREATE TABLE "contract_stake" ("id" character varying NOT NULL, "amount" numeric NOT NULL, "contract_id" character varying, "account_id" character varying, CONSTRAINT "PK_b5b9f91bb2b7a7b8a7cd97dab4e" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_0bb8e49417466be2ad57aa8487" ON "contract_stake" ("contract_id") `)
        await db.query(`CREATE INDEX "IDX_5611f1aeb6e3e26547841c5b09" ON "contract_stake" ("account_id") `)
        await db.query(`ALTER TABLE "worker" ADD CONSTRAINT "FK_4e7653385d7c08643bb581e9614" FOREIGN KEY ("cluster_id") REFERENCES "cluster"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await db.query(`ALTER TABLE "contract" ADD CONSTRAINT "FK_a1418e8b9ab0b912c96a75314ea" FOREIGN KEY ("deployer_id") REFERENCES "account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await db.query(`ALTER TABLE "contract" ADD CONSTRAINT "FK_fc90f056cd6a668277d9754d11b" FOREIGN KEY ("cluster_id") REFERENCES "cluster"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await db.query(`ALTER TABLE "contract_stake" ADD CONSTRAINT "FK_0bb8e49417466be2ad57aa8487b" FOREIGN KEY ("contract_id") REFERENCES "contract"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await db.query(`ALTER TABLE "contract_stake" ADD CONSTRAINT "FK_5611f1aeb6e3e26547841c5b09a" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
    }

    async down(db) {
        await db.query(`DROP TABLE "meta"`)
        await db.query(`DROP TABLE "meta_snapshot"`)
        await db.query(`DROP TABLE "account"`)
        await db.query(`DROP TABLE "cluster"`)
        await db.query(`DROP TABLE "worker"`)
        await db.query(`DROP INDEX "public"."IDX_4e7653385d7c08643bb581e961"`)
        await db.query(`DROP TABLE "contract"`)
        await db.query(`DROP INDEX "public"."IDX_a1418e8b9ab0b912c96a75314e"`)
        await db.query(`DROP INDEX "public"."IDX_fc90f056cd6a668277d9754d11"`)
        await db.query(`DROP TABLE "contract_stake"`)
        await db.query(`DROP INDEX "public"."IDX_0bb8e49417466be2ad57aa8487"`)
        await db.query(`DROP INDEX "public"."IDX_5611f1aeb6e3e26547841c5b09"`)
        await db.query(`ALTER TABLE "worker" DROP CONSTRAINT "FK_4e7653385d7c08643bb581e9614"`)
        await db.query(`ALTER TABLE "contract" DROP CONSTRAINT "FK_a1418e8b9ab0b912c96a75314ea"`)
        await db.query(`ALTER TABLE "contract" DROP CONSTRAINT "FK_fc90f056cd6a668277d9754d11b"`)
        await db.query(`ALTER TABLE "contract_stake" DROP CONSTRAINT "FK_0bb8e49417466be2ad57aa8487b"`)
        await db.query(`ALTER TABLE "contract_stake" DROP CONSTRAINT "FK_5611f1aeb6e3e26547841c5b09a"`)
    }
}
