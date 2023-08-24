const { ethers, network } = require("hardhat");
const fs = require("fs");

const FRONT_END_ADDRESSES_FILE =
    "../nextjs-lottery/constants/contractAddresses.json";
const FRONT_END_ABI_FILE = "../nextjs-lottery/constants/abi.json";

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating front end ...");
        await updateContractAddresses();
        await updateAbi();
        console.log("Written to file");
    }
};

//* This function will read info from contractAddresses.json (frontend), after updating, it will write back
async function updateContractAddresses() {
    const raffle = await ethers.getContract("Raffle");
    // get addresses (JSON string) and convert into JS object
    const contractAddresses = JSON.parse(
        fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8")
    );
    const chainId = network.config.chainId;

    // after deploying, we need to push the contract address to contractAddresses object
    // Remember, contractAddresses[chainId] is Array contains every deployed addresses on that chain
    if (chainId in contractAddresses) {
        // if we already have this chain on our file, no need to create another property for chainId
        if (!contractAddresses[chainId].includes(raffle.address)) {
            // if the address have never been written => new address, need to keep track
            contractAddresses[chainId.push(raffle.address)];
        }
    } else {
        // if it's the first time we use this chain, just extend the object by an array contains contract address
        contractAddresses[chainId] = [raffle.address];
    }

    // write back to file with converted to string from object
    fs.writeFileSync(
        FRONT_END_ADDRESSES_FILE,
        JSON.stringify(contractAddresses)
    );
}

async function updateAbi() {
    const raffle = await ethers.getContract("Raffle");
    fs.writeFileSync(
        FRONT_END_ABI_FILE,
        raffle.interface.format(ethers.utils.FormatTypes.json) // this is ethers interface, diff with solidity interface
    );
}

module.exports.tags = ["all", "frontend"];
