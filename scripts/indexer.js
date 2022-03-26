require("dotenv").config();
const { getDb, eventModel } = require("../db/conn");
const Web3 = require("web3");
const web3ws = new Web3(
    new Web3.providers.WebsocketProvider(process.env.ROPSTEN_WEBSOCKET_URL)
);
const web3http = new Web3(
    new Web3.providers.HttpProvider(process.env.ROPSTEN_HTTP_URL)
);

const transfer = web3http.utils.keccak256("Transfer(address,address,uint256)");

const erc20Addresses = [
    "0x532B02398ceBB887b7ED5Ea87C50657b2cE1f3dC",
    "0xc778417E063141139Fce010982780140Aa0cD5Ab",
    "0xb08aa0e20a4aebc8e2b99d3247975d1c02959cfd",
    "0x31F42841c2db5173425b5223809CF3A38FEde360",
    "0xaD6D458402F60fD3Bd25163575031ACDce07538D",
    "0xC01D99D33b96e904aCA9B76aa71442eCCf496d82",
];

// For better error handling
// https://community.infura.io/t/invalid-json-rpc-response-error/1281
const XHR = require("xhr2-cookies").XMLHttpRequest;
XHR.prototype._onHttpRequestError = function (request, error) {
    if (this._request !== request) {
        return;
    }
    // A new line
    console.log(error, "request");
    this._setError();
    request.abort();
    this._setReadyState(XHR.DONE);
    this._dispatchProgress("error");
    this._dispatchProgress("loadend");
};

function getLogs(logs) {
    return {
        _id: logs.id,
        address: logs.address,
        blockNumber: logs.blockNumber,
        blockHash: logs.blockHash,
        transactionHash: logs.transactionHash,
        transactionIndex: logs.transactionIndex,
        from: logs.topics[1],
        to: logs.topics[2],
        value: web3http.utils.hexToNumberString(logs.data),
        removed: logs.removed,
    };
}

/**
 * @summary get past events
 * @description get past events of all addresses paginated by block number
 * Uses Divide & Conquer algo to divide blocks if there are too many events, saves JSON-RPC api calls
 * @param {number} fromBlock
 * @param {number} toBlock
 */
async function getPastContractEvents(fromBlock, toBlock) {
    try {
        if (fromBlock <= toBlock) {
            console.log(fromBlock, toBlock);
            await web3http.eth
                .getPastLogs({
                    address: erc20Addresses,
                    fromBlock: fromBlock,
                    toBlock: toBlock,
                    topics: [transfer],
                })
                .then((logs) => {
                    const insertLogs = [];
                    logs.forEach((log) => {
                        insertLogs.push(getLogs(log));
                    });
                    if (insertLogs.length > 0) {
                        console.log("inserting", insertLogs.length, "logs");
                        eventModel.bulkWrite(
                            insertLogs.map((log) => ({
                                updateOne: {
                                    filter: { _id: log._id },
                                    update: { $set: log },
                                    upsert: true,
                                },
                            }))
                        );
                    }
                });
        }
    } catch (error) {
        // console.log(error);

        // Use Divide & Conquer to get past events
        const midBlock = (fromBlock + toBlock) >> 1;
        await getPastContractEvents(fromBlock, midBlock);
        await getPastContractEvents(midBlock + 1, toBlock);
    }
}

/**
 * @summary listen for new events
 * @dev looks for chain re-orgs with `changed`
 */
async function listenForNewEvents() {
    try {
        web3ws.eth
            .subscribe("logs", {
                fromBlock: "latest",
                address: erc20Addresses,
                topics: [transfer],
            })
            .on("data", (log) => {
                eventModel.updateOne(
                    { _id: log.id },
                    { $set: getLogs(log) },
                    { upsert: true }
                );
            })
            .on("changed", (log) => {
                console.log("reorged event", log.id);
                eventModel.updateOne(
                    { _id: log.id },
                    { $set: getLogs(log) },
                    { upsert: true }
                );
            });
    } catch (error) {
        console.log(error);

        const currBlock = web3http.eth.getBlockNumber();
        getPastContractEvents(currBlock - 100, currBlock);
        listenForNewEvents();
    }
}

/**
 * @summary listen for past and new events
 * @param {object} collection
 */
async function listen() {
    try {
        // get block number
        const blockNumber = await web3http.eth.getBlockNumber();
        console.log("blockNumber:", blockNumber);

        // get past events
        console.log("indexing past Transfer events");
        getPastContractEvents(0, blockNumber);

        // listen for new events
        console.log("listening for new Transfer events");
        listenForNewEvents();
    } catch (error) {
        console.log(error);
    }
}

async function main() {
    try {
        const db = getDb();
        db.once("open", async function () {
            await listen();
        });
    } catch (error) {
        console.log(error);
    }
}

main().catch(console.error);
