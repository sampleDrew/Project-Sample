const https = require("https");
const config = require('../config');

module.exports = /*async*/ function (context, myTimer) {
    context.bindings.stockUpdateQueue = [];

    // For each letter of the alphabet, get all tickers starting with that letter
    let counter = 0; 
    const alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    for (const letter of alphabet) {
        const url = `https://api.tdameritrade.com/v1/instruments?apikey=${config.ameritradeApiKey}&symbol=${letter}.*&projection=symbol-regex`;
        
        // Get Ameritrade list of tickers
        https.get(url, (res) => {

            // Coalesce data into string
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                data = JSON.parse(data);

                // Record errors with Ameritrade returned values
                if (data.error || data.empty) {
                    context.log(data.error);
                } else {

                    // For each ticker returned that meets filter criteria, push ticker to ticker update queue
                    for (ticker in data) {
                        if ((data[ticker]['exchange'] == 'NYSE' || data[ticker]['exchange'] == 'NASDAQ') && 
                        data[ticker]['assetType'] == 'EQUITY' && /^[A-Z]+$/.test(data[ticker]['symbol']) && 
                        data[ticker]['description'] != "Symbol not found") {
                            context.bindings.stockUpdateQueue.push({
                                "ticker" : data[ticker]['symbol']
                            });
                        }
                    }
                }

                counter++;
                if (counter == alphabet.length) {
                    context.bindings.stockUpdateQueue.push({
                        "ticker" : config.queueTail
                    });
                    context.done();
                }
            });
        }).on('error', (error) => {
            context.log(errer);
            context.done();
        });
    }
};
