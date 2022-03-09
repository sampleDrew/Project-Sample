// Round simulation calculations to 2 decimal points
const maxDecimalPlace = 2;

// Copy object with no dependencies or refferences
const cloneObj = (obj) => 
    JSON.parse(JSON.stringify(obj));

// Round number to 'grainularity' decimal points.
const round = (num, grainularity) => 
    parseFloat(num.toFixed(grainularity));

// Return history with most influential differences between consecutive elements removed
const removeExtremesFromTimeSeries = (history, lower, upper) => {

    // If difference between consecutive elements is outside lower or upper bound, remove its influence from all future historical values
    let modifier = 1;
    return history.map((obj, a) => {
        if (a > 0 && (obj[1] / history[a - 1][1] > upper || obj[1] / history[a - 1][1] < lower))
            modifier /= obj[1] / history[a - 1][1];
        return [...obj, obj[1] * modifier];
    });
}

// Input object array sorted date asc, startMoney, buy/sell percentage, interval of buy/sell pattern, and buy/sell udf.
// Return simulated history array: account value at close of each day
const simulateStratagies = (vals) => {
    const minVal = .001;
    let maxDatapoints = 1000;
    let startStockValue = 0;
    let start = false;
    let numStock = 0;
    let diffArr = [];
    let currentMoney = vals.startMoney;
    let tradeHistory = [];
    let buySellHistory = [];
    let riskArray = [];
    let outputTableArray = [];
    let lastActiveDay = "";

    // Required for risk assesment visualization
    vals.arr = computeSharpe({'arr' : vals.arr, 'interval' : 90});
    vals.arr = computeSortino({'arr' : vals.arr, 'interval' : 90});

    // Used for Azure function call to generate simulation field
    let simFieldInput = [['Date', 'Value']];

    // For each epoch, determin if buy or sell pattern occures and simulate results
    vals.arr.forEach((obj, a) => {
        const buyEpoch = vals.arr.slice(a + 1 - vals.buyInterval, a + 1);
        const sellEpoch = vals.arr.slice(a + 1 - vals.sellInterval, a + 1);
        let simFieldObj = {
            'close' : obj.close,
            'buyFlag' : false,
            'sellFlag' : false
        };

        // Run udf for current epoch
        let buy = a >= vals.buyInterval ? vals.buyF(cloneObj(buyEpoch)) : false;
        let sell = a >= vals.sellInterval ? vals.sellF(cloneObj(sellEpoch)) : false;

        // If a buy and sell occurs, skip math all together
        // If a buy has not occured yet, skip sell
        if ((buy || (sell && start)) && !(buy && sell)) {
            if (!start) startStockValue = obj.close;
            start = true;

            // If buy pattern occures, simulate buy
            if (buy && currentMoney > minVal) {
                numStock += (currentMoney * buy) / obj.close;
                currentMoney *= (1 - buy);
                simFieldObj.buyFlag = true;
                buySellHistory.push(['', new Date(obj.date), obj.close, 'Buy']);
            }

            // If sell pattern occures, simulate sell
            if (sell && numStock > minVal) {
                currentMoney += (numStock * sell) * obj.close;
                numStock *= (1 - sell);
                simFieldObj.sellFlag = true;
                buySellHistory.push(['', new Date(obj.date), obj.close, 'Sell']);
            }
        }

        if (start) {
            let currentValue = round(currentMoney + round(numStock * obj.close, maxDecimalPlace), maxDecimalPlace);

            // Build risk measure array
            riskArray.push([
                new Date(obj.date), 
                round(obj.sharpe_90_, maxDecimalPlace),
                round(obj.sortino_90_, maxDecimalPlace)
            ]);

            // Track simulated account value
            tradeHistory.push([
                new Date(obj.date), 
                currentValue, 
                round(100 * obj.close / startStockValue, maxDecimalPlace)
            ]);
            simFieldInput.push(simFieldObj);

            // Build difference array for stddev calculations
            if (tradeHistory.length > 1) 
                diffArr.push(currentValue / tradeHistory[tradeHistory.length - 2][1]); 
            else diffArr.push(1);
        }

        // Record last day stock is owned in order to "clamp" history
        if (numStock > minVal) lastActiveDay = new Date(obj.date);
    });

    if (tradeHistory.length > 0) {
        let stddevPrecentage = .0015;
        let lower = diffArr.sort()[Math.floor(diffArr.length * stddevPrecentage)];
        let upper = diffArr.sort((a, b) => b - a)[Math.floor(diffArr.length * stddevPrecentage)];
        tradeHistory = removeExtremesFromTimeSeries(tradeHistory, lower, upper);

        stddevPrecentage = .021;
        lower = diffArr.sort()[Math.floor(diffArr.length * stddevPrecentage)];
        upper = diffArr.sort((a, b) => b - a)[Math.floor(diffArr.length * stddevPrecentage)];
        tradeHistory = removeExtremesFromTimeSeries(tradeHistory, lower, upper);

        // Compute Sharpe and Sortino ratios for strategy itself and add to riskArray
        const stratSharpe = computeSharpe({'arr' : tradeHistory.map((obj) => {
            return {"date" : obj[0], "close" : obj[1]};
        }), 'interval' : 90});
        const stratSortino = computeSortino({'arr' : tradeHistory.map((obj) => {
            return {"date" : obj[0], "close" : obj[1]};
        }), 'interval' : 90});
        riskArray = riskArray.map((arr, a) => {
            arr.push(stratSharpe[a].sharpe_90_);
            arr.push(stratSortino[a].sortino_90_);
            return arr;
        });

        // Build output table array
        let riskArraySet = {};
        let tradeHistorySet = {};
        let buySellHistorySet = {};
        riskArray.slice().forEach((obj) => riskArraySet[obj[0]] = obj.slice());
        tradeHistory.slice().forEach((obj, i) => {
            tradeHistorySet[obj[0].toString()] = obj.slice();
            tradeHistorySet[obj[0].toString()].push(i); // Allows for index lookup in price outcomes loop
        });
        buySellHistory.slice().forEach((obj) => buySellHistorySet[obj[1]] = obj.slice());
        for (obj in tradeHistorySet) {
            let newObj = [...tradeHistorySet[obj].slice(0, tradeHistorySet[obj].length - 1)];
            if (buySellHistorySet[obj]) {
                newObj.push(buySellHistorySet[obj][3]);
            } else {
                newObj.push(...[null]);
            }
            if (riskArraySet[obj]) {
                newObj.push(...riskArraySet[obj].slice(1));
            } else {
                newObj.push(...[null, null, null, null]);
            }
            outputTableArray.push(newObj);
        }

        // "Clamp" arrays to only dates where account is active...
        buySellHistory = buySellHistory.filter((day) => day[1] <= lastActiveDay);
        riskArray = riskArray.filter((day) => day[0] >= buySellHistory[0][1] && day[0] <= lastActiveDay);
        tradeHistory = tradeHistory.filter((day) => day[0] >= buySellHistory[0][1] && day[0] <= lastActiveDay);

        // Build array for ticker price outcomes near actions
        tradeHistory = tradeHistory.reverse();
        const periodsOut = 120;
        let buyOutcomes = [];
        let sellOutcomes = [];
        const actionOutcomeResults = [];
        for (action of buySellHistory) {
            const i = tradeHistorySet[action[1].toString()][5];
            if (i + 120 <= tradeHistory.length) {
                const tmp = [];
                for (let a = 0; a < periodsOut; a++) tmp.push((tradeHistory[i][2] - tradeHistory[i + a][2]) / tradeHistory[i][2]);
                if (action[3] == "Buy") buyOutcomes.push(tmp);
                else if (action[3] == "Sell") sellOutcomes.push(tmp);
            }
        }
        for (let a = 0; a < periodsOut; a++) actionOutcomeResults.push([a, 0, 0]);
        for (let a = 0; a < buyOutcomes.length; a++) 
            for (let b = 0; b < actionOutcomeResults.length; b++) 
                actionOutcomeResults[b][1] += buyOutcomes[a][b];
        for (let a = 0; a < sellOutcomes.length; a++) 
            for (let b = 0; b < actionOutcomeResults.length; b++) 
                    actionOutcomeResults[b][2] += sellOutcomes[a][b];
        for (let a = 0; a < actionOutcomeResults.length; a++) {
            actionOutcomeResults[a][1] /= (buyOutcomes.length / 100);
            actionOutcomeResults[a][2] /= (sellOutcomes.length / 100);
        }
        
        // Evenly reduce size of history array
        if (tradeHistory.length > maxDatapoints)
            tradeHistory = tradeHistory.filter((obj, a) => a % Math.floor(tradeHistory.length / maxDatapoints) == 0);
        
        if (riskArray.length > maxDatapoints)
            riskArray = riskArray.reverse().filter((obj, a) => a % Math.floor(riskArray.length / maxDatapoints) == 0);

        return {
            'numBuys' : buySellHistory.filter((action) => action[3] == "Buy").length,
            'numSells' : buySellHistory.filter((action) => action[3] == "Sell").length,
            'tradeHistory' : [['Date', '% Change', 'Stock % Change', 'Stddev3 % Change', 'Stddev2 % Change'], ...tradeHistory],
            'simFieldInput' : simFieldInput,
            'buySellHistory' : [['ID', 'Date', 'Close', 'Action'], ...buySellHistory],
            'riskArray' : [['Date', 'Stock Sharpe', 'Stock Sortino', "Strategy Sharpe", "Strategy Sortino"], ...riskArray],
            'outputTable' : [['Date', '% Change', 'Stock % Change', 'Stddev3 % Change', 'Stddev2 % Change', 'Action', 'Stock Sharpe', 'Stock Sortino', "Strategy Sharpe", "Strategy Sortino"], ...outputTableArray],
            'actionOutcomes' : [['Periods Since Action', 'Buy Action', 'Sell Action'], ...actionOutcomeResults]
        };
    } else {
        return {
            'numBuys' : 0,
            'numSells' : 0,
            'tradeHistory' : [['Date', '% Change', 'Stock % Change', 'Stddev3 % Change', 'Stddev2 % Change', ]],
            'simFieldInput' : simFieldInput,
            'buySellHistory' : [['ID', 'Date', 'Close', 'Action']],
            'riskArray' : [['Date', 'Stock Sharpe', 'Stock Sortino', "Strategy Sharpe", "Strategy Sortino"]],
            'outputTable' : [['Date', '% Change', 'Stock % Change', 'Stddev3 % Change', 'Stddev2 % Change', 'Action', 'Stock Sharpe', 'Stock Sortino', "Strategy Sharpe", "Strategy Sortino"]]
        }
    }
}

// Generate a field of outcommes resulting from UDFs and possible buy/sell percentages
const generateSimField = (vals) => {
    const field = [];
    const  startMoney = 100;

    // Generate field start state
    for (let a = vals.resolution; a < 1; a += vals.resolution) {
        for (let b = vals.resolution; b < 1; b += vals.resolution) {
            field.push({
                'buyPercentage' : a, 
                'sellPercentage' : b, 
                'currentMoney' : startMoney, 
                'numStock' : 0
            });
        }
    }

    // For each epoch, determin if buy or sell pattern occures and simulate results
    vals.arr.forEach((obj) => {

        // Due to floating point math: if a buy and sell occures, skip math all together
        if ((obj.buyFlag || obj.sellFlag) && !(obj.buyFlag && obj.sellFlag)) {

            // If buy pattern occures, simulate buy
            if (obj.buyFlag) {
                field.forEach((strat) => {
                    strat.numStock += (strat.currentMoney * strat.buyPercentage) / obj.close;
                    strat.currentMoney *= (1 - strat.buyPercentage);
                });
            }

            // If sell pattern occures, simulate sell
            if (obj.sellFlag) {
                field.forEach((strat) => {
                    strat.currentMoney += (strat.numStock * strat.sellPercentage) * obj.close;
                    strat.numStock *= (1 - strat.sellPercentage);
                });
            }
        }
    });

    // Simulate sell of all remaining stock at end of history
    field.forEach((strat) => {
        strat.currentMoney += (strat.numStock * vals.arr[vals.arr.length - 1].close);
    });

    // Return results field, sorted desc
    return field.sort((a, b) => b.currentMoney > a.currentMoney);
}

// Generate google line chart input for epochs
const generateGoogleLineChartInputForEpochs = (epochs) =>
    (new Array(epochs[0].length)).fill([])
    .map((row, a) => 
        epochs.slice(0, 10).reduce((accumulator, epoch) => {
            accumulator.push(epoch[a].close);
            return accumulator;
        }, [a + 1])
    );

// Generate google candlestick chart input
const generateGoogleCandleChartInput = (vals) => {
    let result = [];
    const chunk = Math.max(Math.floor(vals.arr.length / vals.numCandles), 1);
    for (let a = 0; a < vals.arr.length; a += chunk) {
        const tmpArr = vals.arr.slice(a, a + chunk);
        result.push([
            tmpArr[0].date != tmpArr[tmpArr.length - 1].date ? 
                `${tmpArr[0].date} - ${tmpArr[tmpArr.length - 1].date}`
            : tmpArr[0].date,
            tmpArr.reduce((accumulator, a) => Math.min(accumulator, a.low), Infinity),
            tmpArr[0].open,
            tmpArr[tmpArr.length - 1].close,
            tmpArr.reduce((accumulator, a) => Math.max(accumulator, a.high), 0)
        ]);
    }
    return result;
}

// Generate heat map of ticker differentials for chart input
const generateGoogleBubbleHeatMap = (arr, udf, udfInterval, attribute, length, clamp) => {
    const token = "_";
    const bucketSize = 2;
    const heatMap = {};

    // Bucket percent differences 
    for (let a = udfInterval; a < arr.length; a++) {
        const epoch = arr.slice(a + 1 - udfInterval, a + 1);
        const action = udf(cloneObj(epoch));
        if (action) {
            for (let b = 1; b < length && a + b < arr.length; b++) {
                const key = b + token + (Math.round((arr[a + b][attribute] - arr[a][attribute]) / 
                    arr[a][attribute] * 100 * bucketSize * action) / bucketSize).toFixed(2);
                if (heatMap.hasOwnProperty(key)) heatMap[key]++;
                else heatMap[key] = 1;
            }
        }
    }

    // Group bands
    const bandSums = {};
    for (let key in heatMap) {
        if (bandSums.hasOwnProperty(key.split(token)[0]))
            bandSums[key.split(token)[0]] += heatMap[key];
        else bandSums[key.split(token)[0]] = heatMap[key];
    }

    // Compute band sub heatMap
    for (let key in heatMap) heatMap[key] = heatMap[key] / bandSums[key.split(token)[0]] * 100;

    // Format final array
    const result = [];
    result.push(["", "Candles Out", "Percent Difference", "Occurance Rate"]);
    for (let key in heatMap) {
        coordinates = key.split(token);
        if (coordinates[1] <= clamp && coordinates[1] >= -clamp) result.push([
            "", parseInt(coordinates[0]), parseFloat(coordinates[1]), parseFloat(heatMap[key])
        ]);
    }
    result.sort((a, b) => a[3] - b[3] > 0);
    return result;
}

// Generate simulation statistics and visualizations
const runSimulation = (vals) => {
    const resolution = .025;
    const buyCode = validateUdf(vals.buyCode);
    const sellCode = validateUdf(vals.sellCode);

    // Simulate strategy
    if(buyCode && sellCode) {
        const simulatedStrategies = simulateStratagies({
            'arr' : vals.arr,
            'startMoney' : vals.startMoney,
            'buyInterval' : vals.buyInterval,
            'sellInterval' : vals.sellInterval,
            'buyF' : new Function('arr', buyCode),
            'sellF' : new Function('arr', sellCode)
        });

        // Generate simulation results for various buy/sell ratios given user's strategy
        let simFieldArray = [['ID', 'Buy Percentage', 'Sell Percentage', 'Account % Value']];
        generateSimField({
            'resolution' : resolution,
            'arr' : simulatedStrategies.simFieldInput
        }).forEach((obj) => {
            simFieldArray.push([
                '',
                obj.buyPercentage,
                obj.sellPercentage,
                obj.currentMoney
            ]);
        });

        return {
            'simField' : simFieldArray,
            'riskArray' : simulatedStrategies.riskArray,
            'buySellHistory' : simulatedStrategies.buySellHistory,
            'tradeHistory' : simulatedStrategies.tradeHistory,
            'numSells' : simulatedStrategies.numSells,
            'numBuys' : simulatedStrategies.numBuys,
            'outputTable' : simulatedStrategies.outputTable,
            'simField' : simFieldArray,
            'actionOutcomes' : simulatedStrategies.actionOutcomes
        }
    } else {
        return false;
    }    
}

// Determin if user submitted function meets requirments and filter unallowed tokens
const validateUdf = (udfString) => {
    if (udfString.length > 2048) return false;
    try {
        // Tokenize udf string
        let udfTokens = udfString.replace( /\n\t/g, " ").replace(/\s+/g, " ").split(" ");

        // Filter out illegal tokens from udf
        udfTokens = udfTokens.filter((token) => 

            // Key word blacklist
            ["abstract","arguments","await","boolean","byte","case",
            "catch","char","class","const","continue","debugger",
            "default","delete","do","double","enum","eval","export",
            "extends","final","finally","float","for","function","goto",
            "implements","import","in","instanceof","int","interface",
            "let","long","native","new","null","package","private",
            "protected","public","short","static","super","switch",
            "synchronized","this","throw","throws","transient","try",
            "typeof","var","void","volatile","while","with","yield"]
            .indexOf(token) < 0 && (

                // Valid operator / key tokens 
                ["+", "-", "*", "/", "%", "||", "&&", ">", "<", ">=", "<=", 
                "==", "!=", ")", "(", "=>", "true", "false", "return", ",", 
                "?", ":", ";", "if", "else", "...", ""].indexOf(token) > -1 ||
                
                // Valid numbers, variable names, and date strings
                (!isNaN(token) && !isNaN(parseFloat(token))) ||
                /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(token) ||
                /^"\d{4}-\d{2}-\d{2}"$/.test(token) ||

                // Valid array functions
                token == ".map(" || token == ").map(" || token == "arr.map(" ||
                token == ".reduce(" || token == ").reduce(" || token == "arr.reduce(" ||
                token == ".filter(" || token == ").filter(" || token == "arr.filter(" ||
                token == ".slice(" || token == ").slice(" || token == "arr.slice(" ||
                token == ".length" || token == ").length" || token == "arr.length" ||

                // Valid math functions
                token == "Math.abs(" ||
                token == "Math.ceil(" ||
                token == "Math.floor(" ||
                token == "Math.log(" ||
                token == "Math.max(" ||
                token == "Math.min(" ||
                token == "Math.pow(" ||
                token == "Math.random(" ||
                token == "Math.round(" ||
                token == "Math.sqrt(" ||

                // Check for key words of candle object
                /^arr\[[0-9]+\]([.])(\b(sok_[0-9]+_)\b|\b(sod_[0-9]+_)\b|\b(sma_[0-9]+_)\b|\b(ema_[0-9]+_)\b|\b(rsi_[0-9]+_)\b|\b(emaEma_[0-9]+_)\b|\b(emaEmaEma_[0-9]+_)\b|\b(dema_[0-9]+_)\b|\b(tema_[0-9]+_)\b|\b(trima_[0-9]+_)\b|\b(willr_[0-9]+_)\b|\b(sharpe_[0-9]+_)\b|\b(sortino_[0-9]+_)\b|\b(vwap_[0-9]+_)\b|\b(pdm_[0-9]+_)\b|\b(ndm_[0-9]+_)\b|\b(ndi_[0-9]+_)\b|\b(pdi_[0-9]+_)\b|\b(adx_[0-9]+_)\b|\b(adxr_[0-9]+_)\b|\b(atr_[0-9]+_)\b|\b(bop_[0-9]+_)\b|\b(proc_[0-9]+_)\b|\b(vroc_[0-9]+_)\b|\b(cmo_[0-9]+_)\b|\b(aroonup_[0-9]+_)\b|\b(aroondown_[0-9]+_)\b|\b(aroonosc_[0-9]+_)\b|\b(trix_[0-9]+_)\b|\b(ultosc_[0-9]+_)\b|\b(midbband_[0-9]+_)\b|\b(upbband_[0-9]+_)\b|\b(lowbband_[0-9]+_)\b|\b(cci_[0-9]+_)\b|\b(mfi_[0-9]+_)\b|\b(dcasr_[0-9]+_)\b|path|longEma|shortEma|adl|adosc|obv|clv|macd|ppo|open|close|high|low|volume|avg|kama|priceVolume|percentGain|percentLoss|date|day|month|year)\b$/.test(token) ||
                /^[a-zA-Z_$][0-9a-zA-Z_$]*([.])(\b(sok_[0-9]+_)\b|\b(sod_[0-9]+_)\b|\b(sma_[0-9]+_)\b|\b(ema_[0-9]+_)\b|\b(rsi_[0-9]+_)\b|\b(emaEma_[0-9]+_)\b|\b(emaEmaEma_[0-9]+_)\b|\b(dema_[0-9]+_)\b|\b(tema_[0-9]+_)\b|\b(trima_[0-9]+_)\b|\b(willr_[0-9]+_)\b|\b(sharpe_[0-9]+_)\b|\b(sortino_[0-9]+_)\b|\b(vwap_[0-9]+_)\b|\b(pdm_[0-9]+_)\b|\b(ndm_[0-9]+_)\b|\b(ndi_[0-9]+_)\b|\b(pdi_[0-9]+_)\b|\b(adx_[0-9]+_)\b|\b(adxr_[0-9]+_)\b|\b(atr_[0-9]+_)\b|\b(bop_[0-9]+_)\b|\b(proc_[0-9]+_)\b|\b(vroc_[0-9]+_)\b|\b(cmo_[0-9]+_)\b|\b(aroonup_[0-9]+_)\b|\b(aroondown_[0-9]+_)\b|\b(aroonosc_[0-9]+_)\b|\b(trix_[0-9]+_)\b|\b(ultosc_[0-9]+_)\b|\b(midbband_[0-9]+_)\b|\b(upbband_[0-9]+_)\b|\b(lowbband_[0-9]+_)\b|\b(cci_[0-9]+_)\b|\b(mfi_[0-9]+_)\b|\b(dcasr_[0-9]+_)\b|path|longEma|shortEma|adl|adosc|obv|clv|macd|ppo|open|close|high|low|volume|avg|kama|priceVolume|percentGain|percentLoss|date|day|month|year)\b$/.test(token)
            )
        );

        // Collapse tokens into valid udf string
        return udfTokens.join(" ");
    } catch (error) {
        return false;
    }
}

// Submit a post request to server
const submitPost = (vals) => {
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = () => {
        if (xhttp.readyState == 4 && xhttp.status == 200 && vals.f != undefined){
            try {
                vals.f(JSON.parse(xhttp.responseText));
            } catch (error) {
                vals.f(xhttp.responseText);
            }
        } else if (xhttp.status == 500) {
            vals.errorF("500 Internal server error.");
        }
    }
    xhttp.open("POST", vals.url, true);
    xhttp.send(JSON.stringify(vals.obj));
}