const dotenv = require('dotenv')
const https = require('https')

dotenv.config()

const options = {
    host: process.env.BOT_HOSTNAME,
    port: parseInt(process.env.BOT_PORT),
    method: 'POST',
    path: '/',
    rejectUnauthorized: false,
    headers: {
        'Content-Type': 'application/json',
    },
}

async function notifyUser(msg) {
    try {
        if (process.env.TEST_MODE === 'true') {
            return
        }
        return await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                if (res.statusCode === 200) {
                    resolve()
                } else {
                    reject()
                }
                res.on('data', () => {
                    resolve()
                })
            })

            req.on('error', (err) => {
                console.error(err)
                reject(err)
            })
            req.write(JSON.stringify({ msg, apiKey: process.env.BOT_API_KEY }))
            req.end()
        })
    } catch (err) {
        console.log(err.message)
        console.log('Unable to send msg to bot')
    }
}

async function promptUser(msg, inlineKeyboard) {
    try {
        return await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let body = ''
                res.on('data', (chunk) => {
                    body += chunk
                })
                res.on('end', () => {
                    resolve(JSON.parse(body).callbackData)
                })
            })

            req.on('error', (err) => {
                console.error(err)
                reject(err)
            })
            req.write(
                JSON.stringify({
                    msg,
                    isPrompt: true,
                    inlineKeyboard,
                    apiKey: process.env.BOT_API_KEY,
                })
            )
            req.end()
        })
    } catch (err) {
        console.log(err.message)
        console.log('Some prompt error')
    }
}

async function promptContinue(msg) {
    return await promptUser(msg, [
        [
            {
                text: 'CONTINUE',
                callback_data: 'continue',
            },
            {
                text: 'STOP',
                callback_data: 'stop',
            },
        ],
    ])
}

exports.notifyUser = notifyUser
exports.promptContinue = promptContinue
