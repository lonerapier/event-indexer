# ERC20 event indexer

This is an ERC20 event indexer that indexes all past `Transfer` event emitted by the contract and listens for new events.
Chain re-org possibility is considered through `changed` and events are marked `removed` in the db.

Uses **mongodb** as the prefered choice due to its flexibility and easy setup.

## Steps

- run script in a terminal
- indexes all past events of the contracts list supplied
- listens for new event emitted
- listens for deletion of event due to chain re-orgs and add flag to db document

## Sample Addresses

- `0x532B02398ceBB887b7ED5Ea87C50657b2cE1f3dC`
- `0xb91ed7E04Bd21383FA3270bEe8081fb06a5277C5`
- `0xb08aa0e20a4aebc8e2b99d3247975d1c02959cfd`
- `0x85086C563CD761Bc6E506bDABd309714316eF60f`
- `0xaD6D458402F60fD3Bd25163575031ACDce07538D`

## Setup

```shell
npx hardhat run scripts/indexer.js --network ropsten
```

## Acknowledgements

- [3 ways to subscribe to events](https://www.coinclarified.com/p/3-ways-to-subscribe-to-events-with-web3-js/)
- [Web3.js documentation](https://web3js.readthedocs.io/en/v1.2.11/web3-eth.html)
