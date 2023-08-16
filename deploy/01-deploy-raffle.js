const { network, ethers } = require("hardhat");
const {
    networkConfig,
    developmentChains,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainID = network.config.chainId;

    let vrfCoordinatorV2Address, subscriptionId;

    //* If we are on local network, "get" the address of already deployed VRFCoordinator mock contract
    if (developmentChains.includes(network.name)) {
        // Need to use ethers.getContract to create an contract instance
        // deployments.get doesn't give you contract instance, it contains address, abi, bytecode and other stuff related to contract.
        const vrfCoordinatorV2Mock = await ethers.getContract(
            "VRFCoordinatorV2Mock"
        );
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;

        //* Get the subscription ID
        const transactionResponse =
            await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait(1);
        subscriptionId = transactionReceipt.events[0].args.subId;

        //* Fund the subscription (on real network, you need LINK token to fund, but local network don't)
        await vrfCoordinatorV2Mock.fundSubscription(
            subscriptionId,
            VRF_SUB_FUND_AMOUNT
        );
    } else {
        //* For subscription ID in testnet, we will interact with UI for now
        vrfCoordinatorV2Address = networkConfig[chainID]["vrfCoordinatorV2"];
        subscriptionId = networkConfig[chainID]["subscriptionId"];
    }

    const entranceFee = networkConfig[chainID]["entranceFee"];
    const gasLane = networkConfig[chainID]["gasLane"];
    const callBackGasLimit = networkConfig[chainID]["callBackGasLimit"];
    const interval = networkConfig[chainID]["interval"];

    const args = [
        vrfCoordinatorV2Address,
        entranceFee,
        gasLane,
        subscriptionId,
        callBackGasLimit,
        interval,
    ];

    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("Verifing...");
        await verify(raffle.address, args);
    }
    log("--------------------------------------------------");
};

module.exports.tags = ["all", "raffle"];
