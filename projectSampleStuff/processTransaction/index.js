const configUtils = require("../configUtils");

module.exports = /*async*/ function (context, myQueueItem) {
    let allowance = context.bindings.userAllowance.Allowance;
    const transaction = JSON.parse(myQueueItem.Transaction);

    // Log error report
    const logError = (error) => {
        configUtils.LogBackEndError({
            "AzureFunction" : "processTransaction",
            "RowKey" : `${myQueueItem.UserId}-${transaction.Type}-${myQueueItem.TransactionId}`,
            "Info" : "",
            "Error" : error
        });
        context.log(error);
        context.done();
    };

    try {
        if (transaction.Type == "tickerSim") {

            // Chunk ticker list into batches
            let batches = [];
            let tickers = transaction.Tickers.split(" ");
            for (let a = 0; a < tickers.length; a += configUtils.SimTransactionTickerBatchSize) {
                let tmp = {};
                tmp.BuyF = transaction.BuyF;
                tmp.SellF = transaction.SellF;
                tmp.BuyInterval = transaction.BuyInterval;
                tmp.SellInterval = transaction.SellInterval;
                tmp.BlobOutputName = myQueueItem.TransactionId + "-" + (a / configUtils.SimTransactionTickerBatchSize);
                tmp.Tickers = tickers.slice(a, a + configUtils.SimTransactionTickerBatchSize);
                batches.push(tmp);
            }

            // All or nothing check for allowance
            if (allowance >= batches.length * configUtils.SimTransactionCost) {

                // Iterate through batches as long as user has allowance
                // Insert batches into tickerSim queues
                let queuePartition = Math.floor(Math.random() * configUtils.ComputeEngineQueueCount);
                for (let a = 0; a < configUtils.ComputeEngineQueueCount; a++) context.bindings["tickersimqueue" + a] = [];
                while (batches.length > 0) {
                    allowance -= configUtils.SimTransactionCost;
                    context.bindings["tickersimqueue" + (queuePartition++ % configUtils.ComputeEngineQueueCount)].push(JSON.stringify(batches.shift()));
                }

                // Upsert user allowance using storage table REST API
                configUtils.UpdateAllowance({
                    "NewAllowance" : allowance,
                    "PartitionKey" : myQueueItem.UserPartition,
                    "RowKey" : context.bindings.userAllowance[0].RowKey
                });
                
                context.done();
            } else {
                logError(configUtils.InsufficientFundsErrorMessage(configUtils.ScreenTransactionCost, allowance));
            }
        } else if (transaction.Type == "tickerScreen") {

            // Push screen to queue if user has required allowance
            if (allowance - configUtils.ScreenTransactionCost >= 0) {
                let queuePartition = Math.floor(Math.random() * configUtils.ComputeEngineQueueCount);
                transaction.BlobOutputName = myQueueItem.TransactionId;
                transaction.UserId = myQueueItem.UserId;
                transaction.UserPartition = myQueueItem.UserPartition;
                context.bindings["tickerscreenqueue" + (queuePartition % configUtils.ComputeEngineQueueCount)] = JSON.stringify(transaction);

                // Upsert user allowance using storage table REST API
                configUtils.UpdateAllowance({
                    "NewAllowance" : allowance - configUtils.ScreenTransactionCost,
                    "PartitionKey" : myQueueItem.UserPartition,
                    "RowKey" : context.bindings.userAllowance[0].RowKey
                });

                context.done();
            } else {
                logError(configUtils.InsufficientFundsErrorMessage(configUtils.ScreenTransactionCost, allowance));
            }
        } else {
            // ... other transaction types and logic
            logError(configUtils.UnrecognizedTransactionTypeErrorMessage);
        }
    } catch (error) {
        logError(error);
    }
};
