const hre = require("hardhat");

const { expect } = require('chai');

describe('Escrow', function () {
  let contract;
  let erc20;
  
  let happyPathAccount;
  let unhappyPathAccount; // No Token
  let unhappyPathAccount2;

  const seed = hre.ethers.utils.parseUnits("500");
  const amount = hre.ethers.utils.parseUnits("100");
  const amount2 = hre.ethers.utils.parseUnits("200");

  before(async function () {

    const ERC20Contract = await hre.ethers.getContractFactory("MockDaiToken");
    erc20 = await ERC20Contract.deploy();
    await erc20.deployed()

    const accounts = await hre.ethers.getSigners();
    deployer = accounts[0];
    happyPathAccount = accounts[1];
    unhappyPathAccount = accounts[2];
    unhappyPathAccount2 = accounts[3];

    const EscrowContract = await hre.ethers.getContractFactory("Escrow");
    contract = await EscrowContract.deploy(erc20.address);
    await contract.deployed();

    // Transfer to Contract
    const transferTx = await erc20.transfer(contract.address, seed);
    await transferTx.wait();

    // Transfer to happyPathAccount
    const transferTx2 = await erc20.transfer(happyPathAccount.address, amount2);
    await transferTx2.wait();

    const erc20WithSigner = erc20.connect(happyPathAccount);
    const approveTx = await erc20WithSigner.approve(contract.address, amount);
    await approveTx.wait();

    // Transfer to unhappyPathAccount2
    const transferTx3 = await erc20.transfer(unhappyPathAccount2.address, amount2);
    await transferTx3.wait();
    
    const erc20WithSigner2 = erc20.connect(unhappyPathAccount2);
    const approveTx2 = await erc20WithSigner2.approve(contract.address, amount2);
    await approveTx2.wait();
  });

  it("Happy Path: invest - Success", async function () {
    const contractWithSigner = contract.connect(happyPathAccount);

    const submitEscrowTx = await contractWithSigner.invest(amount);
    await submitEscrowTx.wait();

    expect(
        (await erc20.balanceOf(happyPathAccount.address)).toString()
    ).to.equal(amount.toString());
  });

  it("Happy Path: claimBalance - Success", async function () {
    const contractWithSigner = contract.connect(happyPathAccount);

    const submitEscrowTx = await contractWithSigner.claimBalance();
    const receipt = await submitEscrowTx.wait();

    const events = receipt.events.filter((x) => x.event == "InvestorClaimed");
    expect(events.length > 0).to.equal(true);
    
    const req = events[0].args[0]
    expect(req.investorAddress).to.equal(happyPathAccount.address);

    const expectedBalance = hre.ethers.utils.parseUnits("100");
    const expectedClaimable = hre.ethers.utils.parseUnits("1");
    expect(req.currentBalance).to.equal(expectedBalance);
    expect(req.claimableBalance).to.equal(expectedClaimable);
  });

  it("Happy Path: compoundBalance - Success", async function () {
    const contractWithSigner = contract.connect(happyPathAccount);

    const submitEscrowTx = await contractWithSigner.compoundBalance();
    const receipt = await submitEscrowTx.wait();

    const events = receipt.events.filter((x) => x.event == "InvestorCompounded");
    expect(events.length > 0).to.equal(true);
    
    const req = events[0].args[0]
    expect(req.investorAddress).to.equal(happyPathAccount.address);

    const expectedBalance = hre.ethers.utils.parseUnits("101");
    const expectedClaimable = hre.ethers.utils.parseUnits("1");
    expect(req.currentBalance).to.equal(expectedBalance);
    expect(req.claimableBalance).to.equal(expectedClaimable);
  });

  it("Happy Path: withdraw - Success", async function () {
    const contractWithSigner = contract.connect(happyPathAccount);

    const expectedTotal = hre.ethers.utils.parseUnits("102");

    await expect(contractWithSigner.withdraw())
      .to.emit(contractWithSigner, "InvestorWithdrawn")
      .withArgs(happyPathAccount.address, expectedTotal)

  });

  it("Unhappy Path: invest - Amount must be greater than 0", async function () {
    const contractWithSigner = contract.connect(unhappyPathAccount);

    let err = "";

    try {
        await contractWithSigner.invest(0)
    }
    catch(e) {
        err = e.message;
    }

    expect(err).to.equal("VM Exception while processing transaction: reverted with reason string 'Amount must be greater than 0'");
  });

  it("Unhappy Path: compoundBalance - This address have no investment", async function () {
    const contractWithSigner = contract.connect(unhappyPathAccount);

    let err = "";

    try {
        await contractWithSigner.compoundBalance()
    }
    catch(e) {
        err = e.message;
    }

    expect(err).to.equal("VM Exception while processing transaction: reverted with reason string 'This address have no investment'");
  });

  it("Unhappy Path: claimBalance - This address have no investment", async function () {
    const contractWithSigner = contract.connect(unhappyPathAccount);

    let err = "";

    try {
        await contractWithSigner.claimBalance()
    }
    catch(e) {
        err = e.message;
    }

    expect(err).to.equal("VM Exception while processing transaction: reverted with reason string 'This address have no investment'");
  });

  it("Unhappy Path: withdraw - This address have no investment", async function () {
    const contractWithSigner = contract.connect(unhappyPathAccount);

    let err = "";

    try {
        await contractWithSigner.withdraw()
    }
    catch(e) {
        err = e.message;
    }

    expect(err).to.equal("VM Exception while processing transaction: reverted with reason string 'This address have no investment'");
  });

  it("Unhappy Path: invest - This address already invested", async function () {
    const contractWithSigner = contract.connect(unhappyPathAccount2);

    let err = "";

    try {
        await contractWithSigner.invest(amount)
        await contractWithSigner.invest(amount);
    }
    catch(e) {
        err = e.message;
    }

    expect(err).to.equal("VM Exception while processing transaction: reverted with reason string 'This address already invested'");
  });

})