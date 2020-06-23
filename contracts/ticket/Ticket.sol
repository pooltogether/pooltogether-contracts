pragma solidity 0.6.4;

import "sortition-sum-tree-factory/contracts/SortitionSumTreeFactory.sol";
import "@pooltogether/uniform-random-number/contracts/UniformRandomNumber.sol";

import "../token/ControlledToken.sol";
import "./TicketInterface.sol";

/* solium-disable security/no-block-members */
contract Ticket is TicketInterface, ControlledToken {
  using SortitionSumTreeFactory for SortitionSumTreeFactory.SortitionSumTrees;

  SortitionSumTreeFactory.SortitionSumTrees sortitionSumTrees;

  bytes32 constant private TREE_KEY = keccak256("PoolTogether/Ticket");
  uint256 constant private MAX_TREE_LEAVES = 5;

  function initialize (
    string memory _name,
    string memory _symbol,
    address _trustedForwarder,
    TokenControllerInterface _controller
  ) public override initializer {
    ControlledToken.initialize(_name, _symbol, _trustedForwarder, _controller);
    sortitionSumTrees.createTree(TREE_KEY, MAX_TREE_LEAVES);
  }

  function _beforeTokenTransfer(address from, address to, uint256 tokenAmount) internal virtual override {
    super._beforeTokenTransfer(from, to, tokenAmount);

    if (from != address(0)) {
      uint256 fromBalance = balanceOf(from);
      sortitionSumTrees.set(TREE_KEY, fromBalance.sub(tokenAmount), bytes32(uint256(from)));
    }

    if (to != address(0)) {
      uint256 toBalance = balanceOf(to);
      sortitionSumTrees.set(TREE_KEY, toBalance.add(tokenAmount), bytes32(uint256(to)));
    }
  }

  function draw(uint256 randomNumber) public override view returns (address) {
    uint256 bound = totalSupply();
    address selected;
    if (bound == 0) {
      selected = address(0);
    } else {
      uint256 token = UniformRandomNumber.uniform(randomNumber, bound);
      selected = address(uint256(sortitionSumTrees.draw(TREE_KEY, token)));
    }
    return selected;
  }
}
