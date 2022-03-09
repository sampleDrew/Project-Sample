const decimalPrecision = 2;
const startDate = 19950101;
const constReduction = 100;
const minHistoryLength = 90;
const https = require("https");
const config = require('../config');
const timeDelay = 1000;
const partitionKey = new Date().toJSON().slice(0,10).replace(/-/g,'');

// For a given ticker ingested from queue, fetch TD data and overwrite history file for ticker
module.exports = function (context, myQueueItem) {

    // Delay operateion to allow for queue message spacing (due to TD Ameritrade API call limits)
    setTimeout(function() {
        context.log(myQueueItem);

        // If all queued tickers have been processed, call coalesce function by placing object with table partition in queue
        if (myQueueItem.ticker == config.queueTail) {
            context.bindings.coalesceHistoriesQueue = [{'partitionKey' : partitionKey}]
            context.done();
        } else {

            // Get Ameritrade data
            https.get(config.stockDataUrl(myQueueItem.ticker), (res) => {

                // Coalesce data into string
                let data = '';
                res.on('data', d => data += d);
                res.on('end', () => {
                    data = JSON.parse(data);

                    // Record errors with Ameritrade returned values
                    if (data.error || data.empty) {
                        context.log("error for " + myQueueItem.ticker + ": " + data.error);
                        context.done();
                    } else {
                        try {
                            if (data.candles.length > minHistoryLength) {

                                // Format ticker history data for compact storage
                                data = data.candles.map((candle) => [
                                    Math.round((new Date(candle.datetime)).toISOString().split('T')[0].split('-').join('') - startDate),
                                    Math.round(parseFloat(candle.open.toFixed(decimalPrecision)) * constReduction),
                                    Math.round(parseFloat(candle.low.toFixed(decimalPrecision)) * constReduction),
                                    Math.round(parseFloat(candle.high.toFixed(decimalPrecision)) * constReduction),
                                    Math.round(parseFloat(candle.close.toFixed(decimalPrecision)) * constReduction),
                                    Math.round(candle.volume / constReduction),
                                ]);
                                data = {"history" : JSON.stringify(data).split('[').join('').split(']').join('').split(',')};
                                data.history = data.history.map(a => parseInt(a));

                                // Only update history data if it is valid
                                // If history contains any negative values, the history is invalid
                                if (!data.history.some(a => a < 0)) {

                                    // Store new history file
                                    context.bindings.outputBlob = data;

                                    // Update mini history table
                                    context.bindings.miniHistories = [{
                                        PartitionKey : partitionKey + myQueueItem.ticker.charAt(0),
                                        RowKey : myQueueItem.ticker,
                                        History : data.history.slice(data.history.length - (6 * minHistoryLength), data.history.length)
                                    }];
                                } else {
                                    context.log("error for " + myQueueItem.ticker + ": negative history value.");
                                }
                            } else {
                                context.log("error for " + myQueueItem.ticker + ": history too short.");
                            }
                        } catch (e) { context.log(e); }

                        // End context
                        context.done();
                    }
                });
            }).on('error', (error) => {
                context.log("error for " + myQueueItem.ticker + ": " + JSON.stringify(error));
                context.done();
            });
        }
    }, timeDelay);
};

