// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";

error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();

contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    //* Type declarations
    enum RaffleState {
        OPEN,
        CALCUlATING
    }

    //* State variable
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionID;
    uint32 private immutable i_callBackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    address private s_recentWinner;
    RaffleState private s_raffleState;

    //* Event
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestID);
    event WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionID,
        uint32 callBackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_entranceFee = entranceFee;
        i_gasLane = gasLane;
        i_subscriptionID = subscriptionID;
        i_callBackGasLimit = callBackGasLimit;
        s_raffleState = RaffleState.OPEN;
    }

    //* First task: Let user enter raffle
    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughETHEntered();
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender));

        emit RaffleEnter(msg.sender);
    }

    /*** @dev This is the function that the Chainlink Keeper nodes call
     * they look for the 'upkeepNeeded'to return true.
     * The following should be true in order to return true:
     * 1. Our time interval should have passed
     * 2. The lottery should have at least 1 player, annd have some ETH
     * 3. Our subscription is funded with LINK
     * 4. The lottery should be in "open" state (when we request random number, other player can not enter our raffle)
     */

    function checkUpkeep(
        bytes calldata /* checkData */
    ) external returns (bool upkeepNeeded, bytes memory /* performData */) {}

    function performUpkeep(bytes calldata performData) external {}

    function pickRandomWinner() external {
        //TODO: Request the random number
        uint256 requestID = i_vrfCoordinator.requestRandomWords(
            i_gasLane, //maximum gas we will pay in each request
            i_subscriptionID,
            REQUEST_CONFIRMATIONS,
            i_callBackGasLimit, //block fulfillRandomWords function if it's take too much gas
            NUM_WORDS //how many random number we want to get
        );
        emit RequestedRaffleWinner(requestID);
    }

    // We will override this function from VRFConsumerBaseV2 contract
    function fulfillRandomWords(
        uint256 /* requestID */,
        uint256[] memory randomWords
    ) internal override {
        // get the winner address
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];

        // save that address to state variable
        s_recentWinner = recentWinner;

        // withdraw fund from contract to this address
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__TransferFailed();
        }

        // emit event
        emit WinnerPicked(recentWinner);
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }
}
