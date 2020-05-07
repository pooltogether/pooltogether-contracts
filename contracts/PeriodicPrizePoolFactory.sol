pragma solidity ^0.6.4;

import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "./PeriodicPrizePool.sol";
import "./YieldServiceInterface.sol";
import "./ControlledToken.sol";
import "./ProxyFactory.sol";

contract PeriodicPrizePoolFactory is Initializable, ProxyFactory {

  event PeriodicPrizePoolCreated(address indexed prizePool);

  PeriodicPrizePool public instance;

  function initialize () public initializer {
    instance = new PeriodicPrizePool();
  }

  function createPeriodicPrizePool() external returns (PeriodicPrizePool) {
    PeriodicPrizePool prizePool = PeriodicPrizePool(deployMinimal(address(instance), ""));
    emit PeriodicPrizePoolCreated(address(prizePool));
    return prizePool;
  }
}