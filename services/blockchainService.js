const dotenv = require("dotenv");

const { logger } = require("../logger");

dotenv.config();

const osTokenTransferProxyAddress =
  "0xe5c783ee536cf5e63e792988335c4255169be4e1";
const WETH_TOKEN_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

const erc20Abi = require("../data/abi/erc20.json");
const erc721Abi = require("../data/abi/erc721.json");

const erc20Contracts = {
  ETHEREUM: {},
  MATIC: {},
};

class Blockchain {
  init(w3, privateKey) {
    this.w3 = w3;
    if (privateKey) {
      this.privateKey = privateKey;
    }
    erc20Contracts[WETH_TOKEN_ADDRESS] = new this.w3.eth.Contract(
      erc20Abi,
      WETH_TOKEN_ADDRESS
    );
  }

  async getRawTransaction(transaction, options = {}) {
    options = {
      to: transaction && transaction._parent._address,
      data: transaction && transaction.encodeABI(),
      chainId: 1,
      networkId: 1,
      type: "0x2",
      chain: 1,
      hardfork: "london",
      ...options,
    };
    const initial = Date.now();
    const signed = await this.w3.eth.accounts.signTransaction(
      options,
      this.privateKey
    );
    logger.info(`time to sign tx: ${Date.now() - initial}`);
    return signed.rawTransaction;
  }

  async sendSignedTransaction(transaction, options = {}) {
    const rawTransaction = this.getRawTransaction(transaction, options);
    return await this.w3.eth.sendSignedTransaction(rawTransaction);
  }

  async getTokenBalance(address, tokenAddress, chain) {
    if (!erc20Contracts[chain][tokenAddress]) {
      logger.debug(
        `No cache match, create new contract for ${tokenAddress} token`
      );
      erc20Contracts[chain][tokenAddress] = new this.w3.eth.Contract(
        erc20Abi,
        tokenAddress
      );
    } else {
      logger.debug(`Take ${tokenAddress} contract from cache`);
    }
    return await erc20Contracts[chain][tokenAddress].methods
      .balanceOf(address)
      .call();
  }

  async getApprovedAmount(address, tokenAddress, chain) {
    if (!erc20Contracts[chain][tokenAddress]) {
      logger.debug(
        `No cache match, create new contract for ${tokenAddress} token`
      );
      erc20Contracts[chain][tokenAddress] = new this.w3.eth.Contract(
        erc20Abi,
        tokenAddress
      );
    } else {
      logger.debug(`Take ${tokenAddress} contract from cache`);
    }
    return await erc20Contracts[chain][tokenAddress].methods
      .allowance(address, osTokenTransferProxyAddress)
      .call();
  }

  async getGasPrice(attempt = 0) {
    try {
      attempt++;
      return await this.w3.eth.getGasPrice();
    } catch (err) {
      logger.error(err);
      if (attempt > 3) {
        throw err;
      }
      return await this.getGasPrice(attempt);
    }
  }

  async getERC721TokenOwner(assetContractAddress, tokenId) {
    const contract = new this.w3.eth.Contract(erc721Abi, assetContractAddress);

    return await contract.methods.ownerOf(tokenId).call();
  }
}

exports.blockchainService = new Blockchain();
