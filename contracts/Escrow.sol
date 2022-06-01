//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract Escrow is Context{
  IERC20 public _token;

  struct Investor {
    address investorAddress;
    uint currentBalance;
    uint claimableBalance;
  }

  constructor(address ERC20Address) {
    _token = IERC20(ERC20Address);
  }

  mapping(address => Investor) public investorByAddress;

  event InvestorInvested(Investor investor);
  event InvestorCompounded(Investor investor);
  event InvestorClaimed(Investor investor);
  event InvestorWithdrawn(address investorAddress, uint total);

  function invest(uint amount) external {
    require(amount > 0, "Amount must be greater than 0");

    address investorAddress = _msgSender();
    require(investorByAddress[investorAddress].investorAddress == address(0), "This address already invested");
    require(_token.transferFrom(investorAddress, address(this), amount), "Transfer failed");
    Investor memory investor  = Investor(
      investorAddress,
      amount,
      0
    );
    investorByAddress[investorAddress] = investor;

    emit InvestorInvested(investor);
  }

  function compoundBalance() external {
    address investorAddress = _msgSender();
    require(investorByAddress[investorAddress].investorAddress != address(0), "This address have no investment");
    uint increment =  investorByAddress[investorAddress].currentBalance / 100;
    investorByAddress[investorAddress].currentBalance += increment;

    emit InvestorCompounded(investorByAddress[investorAddress]);
  }

  function claimBalance() external {
    address investorAddress = _msgSender();
    require(investorByAddress[investorAddress].investorAddress != address(0), "This address have no investment");
    
    uint increment =  investorByAddress[investorAddress].currentBalance / 100;
    investorByAddress[investorAddress].claimableBalance += increment;

    emit InvestorClaimed(investorByAddress[investorAddress]);
  }

  function withdraw() external {
    address investorAddress = _msgSender();
    require(investorByAddress[investorAddress].investorAddress != address(0), "This address have no investment");
    
    Investor memory investor = investorByAddress[investorAddress];
    uint total = investor.currentBalance + investor.claimableBalance;
    require(_token.transfer(investorAddress, total), "Transfer failed");

    delete investorByAddress[investorAddress];
    emit InvestorWithdrawn(investorAddress, total);
  }
}

