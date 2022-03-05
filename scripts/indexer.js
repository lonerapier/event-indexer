require("dotenv").config();
const { MongoClient } = require("mongodb");
const Web3 = require("web3");
const abi =
    require("../artifacts/contracts/SampleToken.sol/SampleToken.json").abi;
const web3ws = new Web3(
    new Web3.providers.WebsocketProvider(process.env.ROPSTEN_WEBSOCKET_URL)
);
const web3http = new Web3(
    new Web3.providers.HttpProvider(process.env.ROPSTEN_HTTP_URL)
);

const client = new MongoClient(process.env.MONGO_URL);

const transfer = web3http.utils.keccak256("Transfer(address,address,uint256)");

async function getDb() {
    return client.db(process.env.DB_NAME);
}

/**
 * @summary get past events
 * @description get past events of all addresses paginated by block number
 * @param {array} erc20Addresses
 * @param {number} blockNumber
 */
async function getPastContractEvents(erc20Addresses, blockNumber) {
    try {
        const db = await getDb();

        const pageEvents = 5000;
        let startBlock = 10000000;

        console.log("indexing past Transfer events");
        while (startBlock < blockNumber) {
            // console.log(startBlock, blockNumber);
            web3http.eth
                .getPastLogs({
                    address: erc20Addresses,
                    fromBlock: startBlock,
                    toBlock: startBlock + pageEvents,
                    topics: [transfer],
                })
                .then((logs) => {
                    const insertLogs = [];
                    logs.forEach((log) => {
                        insertLogs.push({
                            _id: log.id,
                            address: log.address,
                            blockNumber: log.blockNumber,
                            blockHash: log.blockHash,
                            transactionHash: log.transactionHash,
                            transactionIndex: log.transactionIndex,
                            from: log.topics[1],
                            to: log.topics[2],
                            value: web3http.utils.hexToNumberString(log.data),
                            removed: log.removed,
                        });
                    });
                    // console.log("inserting", insertLogs.length, "logs");
                    if (insertLogs.length > 0)
                        db.collection("events")
                            .insertMany(insertLogs, { ordered: false })
                            .catch(() => {});
                });
            startBlock += pageEvents;
        }
    } catch (error) {
        console.log(error);
    }
}

/**
 * @summary listen for new events
 * @dev looks for chain re-orgs with `changed`
 * @param {string} contractAddress
 */
async function listenForNewEvents(contractAddress) {
    try {
        const contract = new web3ws.eth.Contract(abi, contractAddress);
        const db = await getDb();

        contract.events
            .Transfer({
                fromBlock: "latest",
            })
            .on("data", (event) => {
                console.log(event);
                db.collection("events").insertOne({
                    _id: event.id,
                    address: contractAddress,
                    transactionIndex: event.transactionIndex,
                    transactionHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    blockHash: event.blockHash,
                    from: event.returnValues.from,
                    to: event.returnValues.to,
                    value: event.returnValues.value,
                    removed: false,
                });
            })
            .on("changed", (changed) => {
                console.log(changed);
                db.collection("events").updateOne(
                    { _id: changed.id },
                    { $set: { removed: true } }
                );
            })
            .on("error", (error) => {
                console.log(error);
            });
    } catch (error) {
        console.log(error);
    }
}

/**
 * @summary listen for past and new events
 * @param {array} erc20Addresses
 */
async function listen(erc20Addresses) {
    try {
        await client.connect();

        // get block number
        const blockNumber = await web3http.eth.getBlockNumber();
        console.log("blockNumber:", blockNumber);

        // get past events
        getPastContractEvents(erc20Addresses, blockNumber);

        // listen for new events for all addresses
        for (let i = 0; i < erc20Addresses.length; i++) {
            console.log(
                "listening for events on contract",
                i,
                erc20Addresses[i]
            );

            listenForNewEvents(erc20Addresses[i]);
        }
    } catch (error) {
        console.log(error);
    }
}

async function main() {
    const erc20Addresses = [
        "0x532B02398ceBB887b7ED5Ea87C50657b2cE1f3dC",
        "0xb91ed7E04Bd21383FA3270bEe8081fb06a5277C5",
        "0xb08aa0e20a4aebc8e2b99d3247975d1c02959cfd",
        "0x85086C563CD761Bc6E506bDABd309714316eF60f",
        "0xaD6D458402F60fD3Bd25163575031ACDce07538D",
    ];

    await listen(erc20Addresses);
}

main();
