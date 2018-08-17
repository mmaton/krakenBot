const config       = require('./secrets');
const KrakenClient = require('kraken-api');
const CronJob      = require('cron').CronJob;
const kraken       = new KrakenClient(config.key, config.secret)
const basePair     = 'XRPEUR'

var last_trade_price
var errored = false

main = (async () => {
    // Get Ticker Info
    result = await kraken.api('Ticker', { pair : basePair });
    if(result.error.length > 0) {
        console.log(`Error! ${result.error}`)
        errored = true
        return;
    }

    let key = Object.keys(result.result)[0]
    result = result.result[key]
    last_traded = parseFloat(result.c[0])
    last_traded = last_traded.toFixed(4)

    var catch_price = parseFloat(last_traded * 1.4).toFixed(4)

    console.log(`Last Trade price: ${last_traded}, catch price is: ${catch_price}`)

    open_orders = await kraken.api('OpenOrders');

    if(open_orders.error.length > 0) {
        console.log(`Error! ${open_orders.error}`)
        errored = true
        return;
    }

    open_orders = open_orders.result.open
    let keys = Object.keys(open_orders)

    keys.forEach(async (orderID) => {
        order = open_orders[orderID]
        console.log(order)
        if (order.descr.pair == basePair && last_trade_price !== last_traded) {
            // Cancel open order
            cancel_order = await kraken.api('CancelOrder', { txid: orderID })
            if(cancel_order.error.length > 0) {
                console.log(`Error! ${cancel_order.error}`)
                errored = true
                return;
            }

            cancel_order = cancel_order.result
            console.log(cancel_order)
        }
    })

    xrp_balance = await kraken.api('Balance')
    if(xrp_balance.error.length > 0) {
        console.log(`Error! ${xrp_balance.error}`)
        errored = true
        return;
    }

    xrp_balance = parseInt(xrp_balance.result.XXRP)

    create_new_order = await kraken.api('AddOrder', {
        pair: basePair,
        type: 'sell',
        ordertype: 'limit',
        price: catch_price,
        volume: xrp_balance
    })

    if(create_new_order.error.length > 0) {
        console.log(`Error! ${create_new_order.error}`)
        errored = true
        return;
    }

    console.log(create_new_order.result)

    last_trade_price = last_traded
});

new CronJob('0 */5 * * * *', function() {
    if (!errored) {
        main()
    }
}, null, true, 'Europe/London');