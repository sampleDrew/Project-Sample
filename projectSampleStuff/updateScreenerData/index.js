module.exports = async function (context, myQueueItem) {
    const screenerOutput = {};
    let inputQueries = Object.keys(context.bindings);
    inputQueries.shift();

    // Coalesce individual ticker recent histories
    for (let query of inputQueries) {
        for (let ticker of context.bindings[query]) {
            screenerOutput[ticker.RowKey] = JSON.parse(ticker.History);
        }
    }

    // Output coalesced data to file
    context.bindings.scrennerData = screenerOutput;

    // Push empty object to queue that triggers screener ETL
    context.bindings.screenEtlQueue = [{}];
};