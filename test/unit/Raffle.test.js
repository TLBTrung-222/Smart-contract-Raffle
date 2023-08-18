const { network, deployments, getNamedAccounts, ethers } = require("hardhat");
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, vrfCoordinatorV2, entranceFee, deployer, interval;
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
              interval = await raffle.getInterval();
          });

          describe("constructor", function () {
              it("Should initialized raffle correctly", async function () {
                  // Raffle should be open state
                  const raffleState = await raffle.getRaffleState();
                  assert.equal(raffleState.toString(), "0");
                  // Interval should equal as we specified in each chain
                  assert.equal(
                      interval.toString(),
                      networkConfig[chainID]["interval"]
                  );
              });
          });

          describe("enterRaffle", function () {
              it("revert when you don't pay enough", async function () {
                  await expect(raffle.enterRaffle()).to.be.reverted;
              });
              it("records player when they enter", async function () {
                  await raffle.enterRaffle({ value: entranceFee });
                  const playerFromContract = await raffle.getPlayerWithIndex(0);
                  assert.equal(playerFromContract, deployer);
              });
              it("emits event when player enter raffle", async function () {
                  await expect(
                      raffle.enterRaffle({ value: entranceFee })
                  ).to.emit(raffle, "RaffleEnter");
              });
              it("doesn't allow player to enter when raffle in CALCULATING state", async function () {
                  await raffle.enterRaffle({ value: entranceFee });
                  // for a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  });
                  // we pretend to be a keeper for a second
                  await raffle.performUpkeep([]); // changes the state to calculating for our comparison below
                  await expect(
                      raffle.enterRaffle({ value: entranceFee })
                  ).to.be.revertedWith(
                      // is reverted as raffle is calculating
                      "Raffle__NotOpen"
                  );
              });
          });

          describe("checkUpkeep", function () {
              it("return false if people haven't send any ether", async function () {
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(
                      []
                  );
                  assert(!upkeepNeeded);
              });
              it("upkeepNeeded will return fail if raffle is not in OPEN state", async function () {
                  await raffle.enterRaffle({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  await raffle.performUpkeep([]);
                  // At this time, our contract is in CALCULATING state
                  // => raffleState = 1 and upkeepNeeded = false
                  const raffleState = await raffle.getRaffleState();
                  assert.equal(raffleState.toString(), "1");
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(
                      []
                  );
                  assert(!upkeepNeeded);
              });
          });

          describe("performUpkeep", function () {
              it("can only be run when checkUpkeep return true", async function () {
                  await raffle.enterRaffle({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  // assign the result of performUpkeep to a variable
                  // if performUpkeep not works -> tx receive error -> assert(tx) will fail
                  const tx = await raffle.performUpkeep([]);
                  assert(tx);
              });
              it("revert error if checkUpkeep is fail", async function () {
                  await expect(raffle.performUpkeep([])).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded"
                  );
              });
              it("update raffle state, emits an event and calls the vrf coordinator", async function () {
                  //make checkUpkeep true
                  await raffle.enterRaffle({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  // call performUpkeep
                  const txResponse = await raffle.performUpkeep([]);
                  const txReceipt = await txResponse.wait(1);
                  // get the requestID from event in Raflle contract
                  // note that calling requestRandomWord already emmitted an event, so we need to check the second event (our event) in 1 index
                  const requestId = txReceipt.events[1].args.requestI;
                  assert(requestId.toNumber() > 0);

                  const raffleState = await raffle.getRaffleState();
                  assert.equal(raffleState.toString(), "1");
              });
          });
      });
