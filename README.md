# DecentralVows Smart Contracts 📜💍

This repository contains the Solidity smart contracts for DecentralVows, a blockchain-based application designed to strengthen marriage commitments through smart contracts and financial incentives.

## 📖 Overview

The DecentralVows smart contracts form the backbone of our decentralized marriage commitment system. They handle the core functionalities of vow submissions, reward distributions, and the divorce process.

## 🧠 Smart Contracts

1. **Marriage.sol**: Manages marriage commitments and couple details.
2. **Jury.sol**: Handles the jury system for dispute resolution.
3. **Rewards.sol**: Manages the reward system and distribution of funds.

## 🛠 Key Features

- 💑 **Marriage Registration**: Couples can register their marriage by depositing ETH.
- 💰 **Reward System**: Manages the distribution of rewards to committed couples.
- ⚖️ **Divorce Process**: Handles the reporting and resolution of divorces.
- 👥 **Jury Voting**: Implements a jury system for dispute resolution.

## 🚀 Getting Started

This project was bootstrapped with [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2).

1. Clone the repository
2. Install dependencies: `npm install`
3. Compile contracts: `npx hardhat compile`
4. Run tests: `npx hardhat test`

## 📚 Contract Details

### Marriage.sol
- Manages couple registrations
- Tracks marriage statuses
- Handles the initial ETH deposits

### Jury.sol
- Implements jury selection process
- Manages voting on disputed divorces
- Determines divorce outcomes based on jury decisions

### Rewards.sol
- Tracks reward details for each divorce case
- Calculates rewards per eligible address
- Distributes rewards to committed couples

## 🔗 Integration with Frontend

These smart contracts work in tandem with the DecentralVows frontend. For the frontend repository and more details on the full application, visit:

[DecentralVows Frontend](https://github.com/kellynwong/decentralvows_client)

## 🛠 Development and Testing

We use Hardhat for development and testing. To run the test suite:
- bash
- npx hardhat test

For deploying to a testnet:

1. Set up your environment variables in a `.env` file:
   ```
   PRIVATE_KEY=your_private_key
   INFURA_PROJECT_ID=your_infura_project_id
   ```

2. Run the deployment script:
   ```bash
   npx hardhat run scripts/deploy.js --network rinkeby
   ```

## 🤝 Contributing

Contributions are welcome! 

## 📄 License

This project is licensed under the MIT License. 

## ⚠️ Disclaimer

These smart contracts are part of a concept application and should not be used in production without thorough auditing and legal consultation. They do not substitute for legal marriage processes.

