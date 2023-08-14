import { providers, Wallet } from "ethers"

export const constants = {
    ETH_RPC_URL: 'https://sepolia.infura.io/v3/9c3444fd560e48a8939fb881df433c64',
    BSC_RPC_URL: 'https://data-seed-prebsc-1-s3.binance.org:8545/',
}

export const getNetworkSettings = (network: string): { callService: string, networkID: string } => {
    switch (network) {
        case 'sepolia':
            return {
                callService: '0x694C1f5Fb4b81e730428490a1cE3dE6e32428637',
                networkID: '0xaa36a7.eth2',
            }
        case 'bsc_testnet':
            return {
                callService: '0x5Ebb7aCB7bCaf7C1ADeFcF9660D39AC07d432904',
                networkID: '0x61.bsc',
            }
        case 'hardhat':
            return {
                callService: '0x694C1f5Fb4b81e730428490a1cE3dE6e32428637',
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