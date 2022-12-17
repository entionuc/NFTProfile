const { OpenSeaPort, Network, WyvernProtocol } = require('opensea-js')
const { signTypedData } = require('@metamask/eth-sig-util')
const _ = require('lodash')
const { OpenSeaStreamClient } = require('@opensea/stream-js')
const { WebSocket } = require('ws')

const { logger } = require('../logger')

class OpenseaSdkService {
    init(apiKey, web3, privateKey, usePrivateKey = true) {
        this.openseaPort = new OpenSeaPort(web3.currentProvider, {
            networkName: Network.Main,
            useReadOnlyProvider: false,
            ...(usePrivateKey && {
                apiKey: apiKey || process.env.OPENSEA_API_KEY,
            }),
        })

        this.privateKey = privateKey
    }

    initWebsocketsClient() {
        this.wsClient = new OpenSeaStreamClient({
            token: process.env.OPENSEA_API_KEY,
            connectOptions: {
                transport: WebSocket,
            },
        })
        this.wsClient.connect()
    }

    async getUserAssets(ownerAddress) {
        try {
            return (
                await this.openseaPort.api.getAssets({
                    owner: ownerAddress,
                })
            ).assets
        } catch (err) {
            logger.error(err)
            return null
        }
    }

    async getOrders(params = {}) {
        try {
            return (
                await this.openseaPort.api.getOrders({
                    protocol: 'seaport',
                    side: 'ask',
                    paymentTokenAddress:
                        '0x0000000000000000000000000000000000000000',
                    includeBundled: false,
                    bundled: false,
                    limit: 1,
                    orderBy: 'eth_price',
                    orderDirection: 'asc',
                    ...params,
                })
            ).orders
        } catch (err) {
            logger.error(err)
            await new Promise((res) => setTimeout(res, 5000))
            return this.getOrders(params)
        }
    }

    async getBundle(bundleSlug) {
        try {
            return await this.openseaPort.api.getBundle({ slug: bundleSlug })
        } catch (err) {
            logger.error(err)
            return null
        }
    }

    async getBundles(params = {}, page = 1) {
        console.log('getting bundles...')
        try {
            return await this.openseaPort.api.getBundles(
                {
                    ...params,
                },
                page
            )
        } catch (err) {
            logger.error(err)
            if (err.message.startsWith('API Error 504')) {
                throw err
            }
            await new Promise((res) => setTimeout(res, 10000))
            return this.getBundles(params, page)
        }
    }

    async getAsset(tokenAddress, tokenId) {
        try {
            return await this.openseaPort.api.getAsset({
                tokenAddress,
                tokenId,
            })
        } catch (err) {
            logger.error(err)
            return null
        }
    }

    async getAssets(assetContractAddress, tokenIds) {
        const allAssets = []
        const idsChunks = _.chunk(tokenIds, 30)
        try {
            for (let idsChunk of idsChunks) {
                let assets
                while (true) {
                    try {
                        assets = (
                            await this.openseaPort.api.getAssets({
                                asset_contract_address: assetContractAddress,
                                token_ids: idsChunk,
                            })
                        ).assets
                    } catch (err) {
                        logger.error(err)
                    }

                    if (assets) {
                        break
                    }
                    await new Promise((res) => setTimeout(res, 1000))
                }
                allAssets.push(...assets)
                await new Promise((res) => setTimeout(res, 500))
            }
            return allAssets
        } catch (err) {
            logger.error(err)
            return null
        }
    }

    signTypedDataV4(message) {
        const ecSignature = signTypedData({
            privateKey: Buffer.from(this.privateKey.slice(2), 'hex'),
            data: message,
            version: 'V4',
        })
        return ecSignature
    }
}

exports.openseaSdkService = new OpenseaSdkService()
