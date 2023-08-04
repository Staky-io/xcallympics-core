import { providers, Wallet } from "ethers"

export const constants = {
    ETH_RPC_URL: 'https://sepolia.infura.io/v3/9c3444fd560e48a8939fb881df433c64',
    BSC_RPC_URL: 'https://data-seed-prebsc-1-s3.binance.org:8545/',
}

export const getNetworkSettings = (network: string): { callService: string, networkID: string } => {
    switch (network) {
        case 'sepolia':
            return {
                callService: '0x9B68bd3a04Ff138CaFfFe6D96Bc330c699F34901',
                networkID: '0xaa36a7.eth2',
            }
        case 'bsc_testnet':
            return {
                callService: '0x6193c0b12116c4963594761d859571b9950a8686',
                networkID: '0x61.bsc',
            }
        case 'hardhat':
            return {
                callService: '0x9B68bd3a04Ff138CaFfFe6D96Bc330c699F34901',
                networkID: '0xaa36a7.eth2',
            }
        default:
            throw new Error('Invalid network')
    }
}

export const getETHNetworkSettings = (): { callService: string, networkID: string } => {
    return getNetworkSettings('sepolia')
}

export const getBSCNetworkSettings = (): { callService: string, networkID: string } => {
    return getNetworkSettings('bsc_testnet')
}

export const getETHSigner = (privateKey: string): Wallet => {
    const provider = new providers.JsonRpcProvider(constants.ETH_RPC_URL)
    return new Wallet(privateKey, provider)
}

export const getBSCSigner = (privateKey: string): Wallet => {
    const provider = new providers.JsonRpcProvider(constants.BSC_RPC_URL)
    return new Wallet(privateKey, provider)
}