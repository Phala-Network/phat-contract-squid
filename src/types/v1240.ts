import {sts, Result, Option, Bytes, BitSequence} from './support'

export type H256 = Bytes

export type Public = Bytes

export const H256 = sts.bytes()

export const AccountId32 = sts.bytes()

export const AttestationProvider: sts.Type<AttestationProvider> = sts.closedEnum(() => {
    return  {
        Ias: sts.unit(),
        Root: sts.unit(),
    }
})

export type AttestationProvider = AttestationProvider_Ias | AttestationProvider_Root

export interface AttestationProvider_Ias {
    __kind: 'Ias'
}

export interface AttestationProvider_Root {
    __kind: 'Root'
}

export const Public = sts.bytes()
