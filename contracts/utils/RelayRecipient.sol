pragma solidity ^0.6.12;

import "@opengsn/gsn/contracts/BaseRelayRecipient.sol";

contract RelayRecipient is BaseRelayRecipient {
  function versionRecipient() external override view returns (string memory) {
    return "2.0.0-beta.1+pooltogether.relay.recipient";
  }

  function getTrustedForwarder() external view returns (address) {
    return trustedForwarder;
  }
}