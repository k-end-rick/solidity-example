const hre = require('hardhat');
require('dotenv').config();
async function main() {
    const networkName = hre.network.name;
    const networkUrl = hre.network.config.url;
    console.log('Deploying to network', networkName, networkUrl);

    let DAITokenAddress = process.env[`${networkName.toUpperCase()}_NETWORK_DAI_TOKEN_ADDRESS`];
    // If deploying to localhost, (for dev/testing purposes) need to deploy own ERC20
    if (networkName == 'localhost') {
      const ERC20Contract = await hre.ethers.getContractFactory("MockDaiToken");
      erc20 = await ERC20Contract.deploy();
      await erc20.deployed()
      DAITokenAddress = erc20.address
    }

    const EscrowContract = await hre.ethers.getContractFactory("Escrow");
    const escrowContract = await EscrowContract.deploy(DAITokenAddress)
    await escrowContract.deployed();
    console.log('Contracts deployed!');
    if (networkName == 'localhost') {
      console.log('Deployed ERC20 contract address', erc20.address)
    }
    console.log('Deployed Escrow Contract address', escrowContract.address);
}
// We recommend this pattern to be able to use
// async/await everywhere and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });