const { run } = require("hardhat");

//* This function receive a contract address and constructor arguments as parameters
async function verify(contractAddress, args) {
    console.log("Verifing contract...");
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        });
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already verified contract");
        } else console.log(e);
    }
}

module.exports = { verify };
