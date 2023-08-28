const { network, ethers } = require("hardhat");

//* The aim of this script is to calling the fulFillRandomWords function to get the winner

// mockKeepers (call checkUpkeep to return upkeepNeeded?) --true--->  performUpkeep (emit event with requestId)
// --> catch the requestId --> mockVrf (call fulfillRandomWord(requestId, contract address) from vrf mock contract)

async function mockKeepers() {
    const raffle = await ethers.getContract("Raffle");
    const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));
    const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(checkData);
    if (upkeepNeeded) {
        const txResponse = await raffle.performUpkeep(checkData);
        const txReceipt = await txResponse.wait(1);
        const requestId = txReceipt.events[1].args.requestId;
        console.log(`Perform upkeep with requestId: ${requestId}`);
        // only mocking vrf if we are on hardhat network
        if (network.config.chainId == 31337) {
            console.log("We are on local network, let's mocking VRF ver2");
            await mockVrf(requestId, raffle);
        }
    } else {
        console.log("upKeep not needed");
    }
}

async function mockVrf(requestId, raffle) {
    const vrfCoordinatorV2Mock = await ethers.getContract(
        "VRFCoordinatorV2Mock"
    );
    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.address);
    console.log("Responded!");
    console.log(`The winner address is: ${await raffle.getRecentWinner()}`);
}

mockKeepers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error);
        process.exit(1);
    });
