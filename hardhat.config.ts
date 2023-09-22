import 'dotenv/config';
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-gas-reporter';
import { constants } from './scripts/utils';

const privateKey = process.env.EVM_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.18',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || '',
      bscTestnet: process.env.BSCSCAN_API_KEY || '',
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: constants.ETH_RPC_URL,
      }
    },
    sepolia: {
      url: constants.ETH_RPC_URL,
      accounts: [privateKey],
      chainId: 11155111,
    },
    bsc_testnet: {
      url: constants.BSC_RPC_URL,
      accounts: [privateKey],
      chainId: 97,
    }
  },
};

export default config;
