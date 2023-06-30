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

export const join = (...args: Array<string | number | bigint>): string =>
  args.map((x) => x.toString()).join('-')

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

export function sum(...args: BigDecimal[]): BigDecimal
export function sum(...args: number[]): number
export function sum(...args: BigDecimal[] | number[]): BigDecimal | number {
  function isNumbers(array: number[] | BigDecimal[]): array is number[] {
    return typeof array[0] === 'number'
  }
  if (isNumbers(args)) {
    return args.reduce((a, b) => a + b, 0)
  } else {
    return args.reduce((a, b) => a.plus(b), BigDecimal(0))
  }
}
