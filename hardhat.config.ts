import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-gas-reporter';

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
  gasReporter: {
    currency: 'USD',
    enabled: false, // set to true for gas reporting
    token: 'ETH'
  },
  networks: {
    hardhat: {
      forking: {
        url: "https://sepolia.infura.io/v3/ffbf8ebe228f4758ae82e175640275e0",
      }
    },
  },
};

export default config;
