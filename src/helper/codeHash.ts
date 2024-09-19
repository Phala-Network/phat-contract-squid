import { IsNull} from 'typeorm'
import {CodeHash, Contract} from '../model'
import type {Ctx} from '../processor'
import {save, toMap} from '../utils'

interface ContractInfo {
  id: string
  code_hash: string
  weight: number
  sidevm: null
}

const codeHashName: {[hash in string]: string} = {}

export const updateCodeHash = async (ctx: Ctx) => {
  const contractInfo = (await fetch(
    'https://phat-cluster-de.phala.network/pruntime-01/PhactoryAPI.GetContractInfo',
  ).then((res) => res.json())) as {contracts: ContractInfo[]}
  const contractMap = await ctx.store
    .find(Contract, {
      where: {codeHash: IsNull()},
      relations: {cluster: true, deployer: true, codeHash: true},
    })
    .then(toMap)
  const codeHashMap = await ctx.store.find(CodeHash).then(toMap)

  for (const info of contractInfo.contracts) {
    const contract = contractMap.get(info.id)
    if (contract == null) {
      continue
    }
    const codeHash = codeHashMap.get(info.code_hash)
    if (codeHash == null) {
      codeHashMap.set(info.code_hash, new CodeHash({id: info.code_hash}))
    }
    contract.codeHash = codeHash
  }

  for (const [hash, name] of Object.entries(codeHashName)) {
    const codeHash = codeHashMap.get(hash)
    if (codeHash != null) {
      codeHash.name = name
    }
  }
  await save(ctx, [codeHashMap, contractMap])
}
