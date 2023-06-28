import * as ss58 from '@subsquid/ss58'
import {BigDecimal} from '@subsquid/big-decimal'
import {isHex} from '@subsquid/util-internal-hex'
import assert from 'assert'

export const toMap = <T extends {id: string}>(
  a: T[],
  fn: (a: T) => string = (a) => a.id
): Map<string, T> => new Map(a.map((a) => [fn(a), a]))

export const assertGet = <T, U>(map: Map<U, T>, key: U): T => {
  const value = map.get(key)
  assert(value)
  return value
}

export const toBigDecimal = (value: string | number | bigint): BigDecimal => {
  if (isHex(value)) {
    value = BigInt(value)
  }
  return BigDecimal(value)
}

export const toBalance = (value: bigint): BigDecimal =>
  toBigDecimal(value).div(1e12)

export const encodeAddress = (bytes: Uint8Array): string =>
  ss58.codec('phala').encode(bytes)

export const decodeAddress = (address: string): Uint8Array =>
  ss58.codec('phala').decode(address)
