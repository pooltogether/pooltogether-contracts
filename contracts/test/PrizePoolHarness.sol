pragma solidity 0.6.4;

import "../prize-pool/PrizePool.sol";
import "./YieldSourceStub.sol";

contract PrizePoolHarness is PrizePool {

  uint256 public currentTime;

  YieldSourceStub stubYieldSource;

  function initializeAll(
    address _trustedForwarder,
    PrizePoolTokenListenerInterface _prizeStrategy,
    ComptrollerInterface _comptroller,
    address[] memory _controlledTokens,
    uint256 _maxExitFeeMantissa,
    uint256 _maxTimelockDuration,
    YieldSourceStub _stubYieldSource
  )
    public
  {
    PrizePool.initialize(
      _trustedForwarder,
      _prizeStrategy,
      _comptroller,
      _controlledTokens,
      _maxExitFeeMantissa,
      _maxTimelockDuration
    );
    stubYieldSource = _stubYieldSource;
  }

  function supply(uint256 mintAmount) external {
    _supply(mintAmount);
  }

  function redeem(uint256 redeemAmount) external {
    _redeem(redeemAmount);
  }

  function setCurrentTime(uint256 _currentTime) external {
    currentTime = _currentTime;
  }

  function setTimelockBalance(uint256 _timelockBalance) external {
    timelockTotalSupply = _timelockBalance;
  }

  function _currentTime() internal override view returns (uint256) {
    return currentTime;
  }

  function _canAwardExternal(address _externalToken) internal override view returns (bool) {
    return stubYieldSource.canAwardExternal(_externalToken);
  }

  function _token() internal override view returns (IERC20) {
    return stubYieldSource.token();
  }

  function _balance() internal override returns (uint256) {
    return stubYieldSource.balance();
  }

  function _supply(uint256 mintAmount) internal override {
    return stubYieldSource.supply(mintAmount);
  }

  function _redeem(uint256 redeemAmount) internal override returns (uint256) {
    return stubYieldSource.redeem(redeemAmount);
  }

  function estimateAccruedInterestOverBlocks(uint256 principal, uint256 blocks) public override view returns (uint256) {
    return stubYieldSource.estimateAccruedInterestOverBlocks(principal, blocks);
  }

}