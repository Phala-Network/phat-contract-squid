module.exports = class Data1715599969489 {
    name = 'Data1715599969489'

    async up(db) {
        await db.query(`CREATE TABLE "code_hash" ("id" character varying NOT NULL, "name" text, CONSTRAINT "PK_361961121bb861dfbb948d78c6c" PRIMARY KEY ("id"))`)
        await db.query(`ALTER TABLE "contract" ADD "code_hash_id" character varying`)
        await db.query(`CREATE INDEX "IDX_bd49b6e83b40a5a047f84f7b58" ON "contract" ("code_hash_id") `)
        await db.query(`ALTER TABLE "contract" ADD CONSTRAINT "FK_bd49b6e83b40a5a047f84f7b58d" FOREIGN KEY ("code_hash_id") REFERENCES "code_hash"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
    }

    async down(db) {
        await db.query(`DROP TABLE "code_hash"`)
        await db.query(`ALTER TABLE "contract" DROP COLUMN "code_hash_id"`)
        await db.query(`DROP INDEX "public"."IDX_bd49b6e83b40a5a047f84f7b58"`)
        await db.query(`ALTER TABLE "contract" DROP CONSTRAINT "FK_bd49b6e83b40a5a047f84f7b58d"`)
    }
}
