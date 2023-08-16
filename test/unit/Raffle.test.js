const { network, deployments, getNamedAccounts, ethers } = require("hardhat");
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, vrfCoordinatorV2, entranceFee, deployer;
          const chainID = network.config.chainId;

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture(["all"]);
              raffle = await ethers.getContract("Raffle", deployer);
              vrfCoordinatorV2 = await ethers.getContract(
                  "VRFCoordinatorV2Mock",
                  deployer
              );
              entranceFee = await raffle.getEntranceFee();
          });

          describe("constructor", function () {
              it("Should initialized raffle correctly", async function () {
                  // Raffle should be open state
                  const raffleState = await raffle.getRaffleState();
                  assert.equal(raffleState.toString(), "0");
                  // Interval should equal as we specified in each chain
                  const interval = await raffle.getInterval();
                  assert.equal(
                      interval.toString(),
                      networkConfig[chainID]["interval"]
                  );
              });

              describe("enterRaffle", function () {
                  it("revert when you don't pay enough", async function () {
                      expect(raffle.enterRaffle()).to.be.reverted;
                  });
                  it("records player when they enter", async function () {
                      await raffle.enterRaffle({ value: entranceFee });
                      const playerFromContract =
                          await raffle.getPlayerWithIndex(0);
                      assert.equal(playerFromContract, deployer);
                  });
              });
          });
      });
