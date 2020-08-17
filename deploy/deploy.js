const ProxyAdmin = require('@openzeppelin/upgrades/build/contracts/ProxyAdmin.json')
const ProxyFactory = require('@openzeppelin/upgrades/build/contracts/ProxyFactory.json')
const { deploy1820 } = require('deploy-eip-1820')
const ERC20Mintable = require('../build/ERC20Mintable.json')
const Comptroller = require("../build/Comptroller.json")
const CTokenMock = require('../build/CTokenMock.json')

// const solcOutput = require('../cache/solc-output.json')

// function findMetadata(contractName) {
//   const contractNames = Object.keys(solcOutput.contracts)
//   const contractPath = contractNames.find(name => name.search(contractName) > -1)
//   return solcOutput.contracts[contractPath].metadata
// }

const chainName = (chainId) => {
  switch(parseInt(chainId, 10)) {
    case 1: return 'Mainnet';
    case 3: return 'Ropsten';
    case 4: return 'Rinkeby';
    case 5: return 'Goerli';
    case 42: return 'Kovan';
    case 31337: return 'BuidlerEVM';
    default: return 'Unknown';
  }
}

module.exports = async (buidler) => {
  const { getNamedAccounts, deployments, getChainId, ethers } = buidler
  const { deploy, getOrNull, save, log } = deployments
  let {
    deployer,
    rng,
    trustedForwarder,
    adminAccount
  } = await getNamedAccounts()
  const chainId = await getChainId()
  const isLocal = [1, 3, 4, 42].indexOf(chainId) == -1
  let usingSignerAsAdmin = false
  const signer = await ethers.provider.getSigner(deployer)

  // Run with CLI flag --silent to suppress log output

  log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
  log("PoolTogether Pool Contracts - Deploy Script")
  log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")

  log("  Deploying to Network: ", chainName(chainId))

  if (!adminAccount) {
    log("  Using deployer as adminAccount;")
    adminAccount = signer._address
    usingSignerAsAdmin = true
  }
  log("\n  adminAccount:  ", adminAccount)

  await deploy1820(signer)

  log("\n  Deploying ProxyAdmin...")
  const proxyAdminResult = await deploy("ProxyAdmin", {
    contract: ProxyAdmin,
    from: deployer,
    skipIfAlreadyDeployed: true
  });

  const proxyAdmin = new ethers.Contract(proxyAdminResult.address, ProxyAdmin.abi, signer)
  if (await proxyAdmin.isOwner() && !usingSignerAsAdmin) {
    log(`Transferring ProxyAdmin ownership to ${adminAccount}...`)
    await proxyAdmin.transferOwnership(adminAccount)
  }

  log("\n  Deploying ProxyFactory...")
  const proxyFactoryResult = await deploy("ProxyFactory", {
    contract: ProxyFactory,
    from: deployer,
    skipIfAlreadyDeployed: true
  });
  const proxyFactory = new ethers.Contract(proxyFactoryResult.address, ProxyFactory.abi, signer)

  if (isLocal) {
    log("\n  Deploying TrustedForwarder...")
    const deployResult = await deploy("TrustedForwarder", {
      from: deployer,
      skipIfAlreadyDeployed: true
    });
    trustedForwarder = deployResult.address

    log("\n  Deploying RNGService...")
    const rngServiceMockResult = await deploy("RNGServiceMock", {
      from: deployer,
      skipIfAlreadyDeployed: true
    })
    rng = rngServiceMockResult.address

    log("\n  Deploying Dai...")
    const daiResult = await deploy("Dai", {
      contract: ERC20Mintable,
      from: deployer,
      skipIfAlreadyDeployed: true
    })

    log("\n  Deploying cDai...")
    // should be about 20% APR
    let supplyRate = '8888888888888'
    await deploy("cDai", {
      args: [
        daiResult.address,
        supplyRate
      ],
      contract: CTokenMock,
      from: deployer,
      skipIfAlreadyDeployed: true
    })

    // Display Contract Addresses
    log("\n  Local Contract Deployments;\n")
    log("  - TrustedForwarder: ", trustedForwarder)
    log("  - RNGService:       ", rng)
    log("  - Dai:              ", daiResult.address)
  }

  const comptrollerImplementationResult = await deploy("ComptrollerImplementation", {
    contract: Comptroller,
    from: deployer,
    skipIfAlreadyDeployed: true
  })

  let comptrollerAddress
  const comptrollerDeployment = await getOrNull("Comptroller")
  if (!comptrollerDeployment) {
    log("\n  Deploying new Comptroller Proxy...")
    const salt = ethers.utils.hexlify(ethers.utils.randomBytes(32))

    // form initialize() data
    const comptrollerImpl = new ethers.Contract(comptrollerImplementationResult.address, Comptroller.abi, signer)
    const initTx = await comptrollerImpl.populateTransaction.initialize(adminAccount)

    // calculate the address
    comptrollerAddress = await proxyFactory.getDeploymentAddress(salt, signer._address)

    // deploy the proxy
    await proxyFactory.deploy(salt, comptrollerImplementationResult.address, proxyAdmin.address, initTx.data)

    await save("Comptroller", {
      ...comptrollerImplementationResult,
      address: comptrollerAddress
    })
  } else {
    comptrollerAddress = comptrollerDeployment.address
  }

  log("\n  Deploying CompoundPrizePoolProxyFactory...")
  const compoundPrizePoolProxyFactoryResult = await deploy("CompoundPrizePoolProxyFactory", {
    from: deployer,
    skipIfAlreadyDeployed: true
  })

  log("\n  Deploying ControlledTokenProxyFactory...")
  const controlledTokenProxyFactoryResult = await deploy("ControlledTokenProxyFactory", {
    from: deployer,
    skipIfAlreadyDeployed: true
  })

  log("\n  Deploying PrizeStrategyProxyFactory...")
  const prizeStrategyProxyFactoryResult = await deploy("PrizeStrategyProxyFactory", {
    from: deployer,
    skipIfAlreadyDeployed: true
  })

  log("\n  Deploying CompoundPrizePoolBuilder...")
  const compoundPrizePoolBuilderResult = await deploy("CompoundPrizePoolBuilder", {
    args: [
      comptrollerAddress,
      prizeStrategyProxyFactoryResult.address,
      trustedForwarder,
      compoundPrizePoolProxyFactoryResult.address,
      controlledTokenProxyFactoryResult.address,
      rng,
      proxyFactoryResult.address
    ],
    from: deployer,
    skipIfAlreadyDeployed: true
  })

  // Display Contract Addresses
  log("\n  Contract Deployments Complete!\n")
  log("  - ProxyFactory:                  ", proxyFactoryResult.address)
  log("  - ComptrollerImplementation:     ", comptrollerImplementationResult.address)
  log("  - Comptroller:                   ", comptrollerAddress)
  log("  - CompoundPrizePoolProxyFactory: ", compoundPrizePoolProxyFactoryResult.address)
  log("  - ControlledTokenProxyFactory:   ", controlledTokenProxyFactoryResult.address)
  log("  - PrizeStrategyProxyFactory:     ", prizeStrategyProxyFactoryResult.address)
  log("  - CompoundPrizePoolBuilder:      ", compoundPrizePoolBuilderResult.address)

  log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")
};
