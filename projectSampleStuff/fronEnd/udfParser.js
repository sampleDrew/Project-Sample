// Summation an array's obj's attribute
const sum = (vals) => {
    let total = 0;
    for (let a = 0; a < vals.arr.length; a++) {
        total += vals.arr[a][vals.attribute];
    }
    return total;
}

// Average an array's obj's attribute
// Assume attribute is 'close' if none specified
const average = (vals) => {
    return sum({
        'arr' : vals.arr, 
        'attribute' : (vals.attribute || 'close')
    }) / vals.arr.length;
}

// Low and high of array's obj's attribute
const extremes = (vals) => {
    let low = 999999999;
    let high = -999999999;
    for (let a = 0; a < vals.arr.length; a++) {
        low = Math.min(low, vals.arr[a][vals.attribute]);
        high = Math.max(high, vals.arr[a][vals.attribute]);
    }
    return {
        "low" : low,
        "high" : high
    }
}

// Separate date into component parts
const computeDate = (vals) => {
    if (vals.arr[vals.arr.length - 1].day != undefined) 
        return vals.arr;

    for (let a = 0; a < vals.arr.length; a++) {
        let date = vals.arr[a].date.split('-');
        vals.arr[a].day = +(date[2]);
        vals.arr[a].month = +(date[1]);
        vals.arr[a].year = +(date[0]);
    }
    return vals.arr;
}

// Dollar Cost Average Strategy Results
const computeDcasr = (vals) => {
    if (vals.arr[vals.arr.length - 1][`dcasr_${vals.interval}_`] != undefined) 
        return vals.arr;

    for (let a = vals.interval; a < vals.arr.length; a++) {
        vals.arr[a][`dcasr_${vals.interval}_`] = vals.arr[a].close / average({'arr' : vals.arr.slice(a - vals.interval, a + 1)});
    }
    return vals.arr;
}

// Short Moving Average
const computeShortEma = (vals) => {
    if (vals.arr[vals.arr.length - 1].shortEma != undefined) 
        return vals.arr;

    vals.arr[0].shortEma = vals.arr[0].close;
    for (let a = 1; a < vals.arr.length; a++) {
        vals.arr[a].shortEma = 0.15 * vals.arr[a].close + 0.85 * (vals.arr[a - 1].shortEma || 0);
    }
    return vals.arr;
}

// Long Moving Average
const computeLongEma = (vals) => {
    if (vals.arr[vals.arr.length - 1].longEma != undefined) 
        return vals.arr;

    vals.arr[0].longEma = vals.arr[0].close;
    for (let a = 1; a < vals.arr.length; a++) {
        vals.arr[a].longEma = 0.075 * vals.arr[a].close + 0.925 * (vals.arr[a - 1].longEma || 0);
    }
    return vals.arr;
}

// Moving Average Convergance Divergance 
const computeMacD = (vals) => {
    if (vals.arr[vals.arr.length - 1].macd != undefined) 
        return vals.arr;

    vals.arr = computeLongEma(vals);
    vals.arr = computeShortEma(vals);
    for (let a = 0; a < vals.arr.length; a++) {
        vals.arr[a].macd = vals.arr[a].shortEma - vals.arr[a].longEma;
    }
    return vals.arr;
}

// Percentage Gain
const computePercentGain = (vals) => {
    if (vals.arr[vals.arr.length - 1].percentGain != undefined) 
        return vals.arr;
        
    vals.arr[0].percentGain = 0;
    for (let a = 1; a < vals.arr.length; a++) {
        let diff = vals.arr[a].close / vals.arr[a - 1].close - 1;
        if (diff > 0) vals.arr[a].percentGain = diff;
        else vals.arr[a].percentGain = 0;
    }
    return vals.arr;
}

// Percentage Loss
const computePercentLoss = (vals) => {
    if (vals.arr[vals.arr.length - 1].percentLoss != undefined) 
        return vals.arr;

    vals.arr[0].percentLoss = 0;
    for (let a = 1; a < vals.arr.length; a++) {
        let diff = 1 - vals.arr[a].close / vals.arr[a - 1].close;
        if (diff > 0) vals.arr[a].percentLoss = diff;
        else vals.arr[a].percentLoss = 0;
    }
    return vals.arr;
}

// Simple Moving Average
const computeSma = (vals) => {
    if (vals.arr[vals.arr.length - 1][`sma_${vals.interval}_`] != undefined) 
        return vals.arr;

    for (let a = 0; a < vals.arr.length; a++) {
        vals.arr[a][`sma_${vals.interval}_`] = average({
            'arr' : vals.arr.slice(Math.max(a - vals.interval + 1, 0), a + 1)
        });
    }
    return vals.arr;
}

// Triangular Moving Average
const computeTrima = (vals) => {
    if (vals.arr[vals.arr.length - 1][`trima_${vals.interval}_`] != undefined) 
        return vals.arr;

    vals.arr = computeSma(vals);
    for (let a = 0; a < vals.arr.length; a++) {
        if (a > vals.interval) {
            let arrSlice = vals.arr.slice(a - vals.interval + 1, a + 1);
            let trima = 0;
            for (let b = 0; b < vals.interval; b++) {
                trima += arrSlice[b][`sma_${vals.interval}_`];
            }
            vals.arr[a][`trima_${vals.interval}_`] = trima / vals.interval;
        } else {
            vals.arr[a][`trima_${vals.interval}_`] = average({'arr' : vals.arr.slice(0, a + 1)});
        }
    }
    return vals.arr;
}

// Exponential Moving Average
const computeEma = (vals) => {
    if (vals.arr[vals.arr.length - 1][`ema_${vals.interval}_`] != undefined) 
        return vals.arr;

    for (let a = 0; a < vals.arr.length; a++) {
        if (a > vals.interval) {
            vals.arr[a][`ema_${vals.interval}_`] = vals.arr[a].close * 
                (2 / (vals.interval + 1)) + 
                vals.arr[a - 1][`ema_${vals.interval}_`] * 
                (1 - 2 / (vals.interval + 1));
        } else {
            vals.arr[a][`ema_${vals.interval}_`] = average({'arr' : vals.arr.slice(0, a + 1)});
        }
    }
    return vals.arr;
}

// EMA of EMA
const computeEmaEma = (vals) => {
    if (vals.arr[vals.arr.length - 1][`emaEma_${vals.interval}_`] != undefined) 
        return vals.arr;

    vals.arr = computeEma(vals);
    for (let a = 0; a < vals.arr.length; a++) {
        if (a > vals.interval) {
            vals.arr[a][`emaEma_${vals.interval}_`] = vals.arr[a][`ema_${vals.interval}_`] *
                (2 / (vals.interval + 1)) + 
                vals.arr[a - 1][`emaEma_${vals.interval}_`] * 
                (1 - 2 / (vals.interval + 1));
        } else {
            vals.arr[a][`emaEma_${vals.interval}_`] = average({'arr' : vals.arr.slice(0, a + 1)});
        }
    }
    return vals.arr;
}

// EMA of EMA of EMA
const computeEmaEmaEma = (vals) => {
    if (vals.arr[vals.arr.length - 1][`emaEmaEma_${vals.interval}_`] != undefined) 
        return vals.arr;

    vals.arr = computeEmaEma(vals);
    for (let a = 0; a < vals.arr.length; a++) {
        if (a > vals.interval) {
            vals.arr[a][`emaEmaEma_${vals.interval}_`] = vals.arr[a][`emaEma_${vals.interval}_`] *
                (2 / (vals.interval + 1)) + 
                vals.arr[a - 1][`emaEmaEma_${vals.interval}_`] * 
                (1 - 2 / (vals.interval + 1));
        } else {
            vals.arr[a][`emaEmaEma_${vals.interval}_`] = average({'arr' : vals.arr.slice(0, a + 1)});
        }
    }
    return vals.arr;
}

// Double Exponential Moving Average
const computeDema = (vals) => {
    if (vals.arr[vals.arr.length - 1][`dema_${vals.interval}_`] != undefined) 
        return vals.arr;

    vals.arr = computeEmaEma(vals);
    for (let a = 0; a < vals.arr.length; a++) {
        if (a > vals.interval) {
            vals.arr[a][`dema_${vals.interval}_`] = 2 * 
                vals.arr[a][`ema_${vals.interval}_`] - 
                vals.arr[a][`emaEma_${vals.interval}_`];
        } else {
            vals.arr[a][`dema_${vals.interval}_`] = average({'arr' : vals.arr.slice(0, a + 1)});
        }
    }
    return vals.arr;
}

// Triple Exponential Moving Average
const computeTema = (vals) => {
    if (vals.arr[vals.arr.length - 1][`tema_${vals.interval}_`] != undefined) 
        return vals.arr;

    vals.arr = computeEmaEmaEma(vals);
    for (let a = 0; a < vals.arr.length; a++) {
        if (a > vals.interval) {
            vals.arr[a][`tema_${vals.interval}_`] = 3 * 
                vals.arr[a][`ema_${vals.interval}_`] - 
                3 * vals.arr[a][`emaEma_${vals.interval}_`] + 
                vals.arr[a][`emaEmaEma_${vals.interval}_`];
        } else {
            vals.arr[a][`tema_${vals.interval}_`] = average({'arr' : vals.arr.slice(0, a + 1)});
        }
    }
    return vals.arr;
}

// Price Volume
const computePriceVolume = (vals) => {
    if (vals.arr[vals.arr.length - 1].priceVolume != undefined) 
        return vals.arr;

    for (let a = 0; a < vals.arr.length; a++) {
        vals.arr[a].priceVolume = (vals.arr[a].high + vals.arr[a].low + vals.arr[a].close) / 
            3 * vals.arr[a].volume;
    }
    return vals.arr;
}

// Volume Weighted Average Price
const computeVwap = (vals) => {
    if (vals.arr[vals.arr.length - 1][`vwap_${vals.interval}_`] != undefined) 
        return vals.arr;

    vals.arr = computePriceVolume(vals);
    for (let a = 0; a < vals.arr.length; a++) {
        let arrSlice = vals.arr.slice(Math.max(a - vals.interval, 0), a + 1);
        vals.arr[a][`vwap_${vals.interval}_`] =
            sum({'arr' : arrSlice, 'attribute' : 'priceVolume'}) / 
            sum({'arr' : arrSlice,  'attribute' : 'volume'});
    }
    return vals.arr;
}

// Stochastic Oscillator
const computeSo = (vals) =>{
    if (vals.arr[vals.arr.length - 1][`sod_${vals.interval}_`] != undefined) 
        return vals.arr;

    for (let a = 0; a < vals.arr.length; a++) {
        let arrSlice = vals.arr.slice(Math.max(a - vals.interval, 0), a);
        let lowestLow = extremes({'arr' : arrSlice, 'attribute' : 'low'}).low;
        let highestHigh = extremes({'arr' : arrSlice, 'attribute' : 'high'}).high;
        vals.arr[a][`sok_${vals.interval}_`] =
            100 * (vals.arr[a].close - lowestLow) / (highestHigh - lowestLow);

        // Append new sod data to array slice prior to sok calculation
        arrSlice.push(vals.arr[a]);
        vals.arr[a][`sod_${vals.interval}_`] =
            average({'arr' : arrSlice, 'attribute' : `sok_${vals.interval}_`});
    }
    return vals.arr;
}

// Williams %R
const computeWillr = (vals) => {
    if (vals.arr[vals.arr.length - 1][`willr_${vals.interval}_`] != undefined) 
        return vals.arr;

    for (let a = 0; a < vals.arr.length; a++) {
        let arrSlice = vals.arr.slice(Math.max(a - vals.interval + 1, 0), a + 1);
        let lowestLow = extremes({'arr' : arrSlice, 'attribute' : 'low'}).low;
        let highestHigh = extremes({'arr' : arrSlice, 'attribute' : 'high'}).high;
        vals.arr[a][`willr_${vals.interval}_`] = 100 * (highestHigh - vals.arr[a].close) / 
            (highestHigh - lowestLow); 
    }
    return vals.arr;
}

// Kaufman Adaptive Moving Average (10, 2, 30) 
// https://school.stockcharts.com/doku.php?id=technical_indicators:kaufman_s_adaptive_moving_average
const computeKama = (vals) => {
    if (vals.arr[vals.arr.length - 1].kama != undefined) 
        return vals.arr;

    for (let a = 0; a < Math.min(vals.arr.length, 9); a++) {
        vals.arr[a].kama = average({'arr' : vals.arr.slice(0, a + 1)});
    }
    for (let a = 9; a < vals.arr.length; a++) {
        let arrSlice = vals.arr.slice(a - 9, a + 1);

        // Compute sum of differences between objects in most recent time period
        let volatility = 0;
        for (let b = 1; b < arrSlice.length; b++) {
            volatility += Math.abs(arrSlice[b].close - arrSlice[b - 1].close);
        }

        // Compute smoothing constant 
        let change = Math.abs(vals.arr[a].close - vals.arr[a - 9].close);
        let effiencyRatio = change / volatility;
        let smoothingConstant = Math.pow(effiencyRatio * (2 / 3 - 2 / 31) + 2 / 31, 2);

        // Compute kama
        vals.arr[a].kama = vals.arr[a - 1].kama + smoothingConstant * 
            (vals.arr[a].close - vals.arr[a - 1].kama);
    }
    return vals.arr;
}

// Relative Strength Index 
const computeRsi = (vals) => {
    if (vals.arr[vals.arr.length - 1][`rsi_${vals.interval}_`] != undefined) 
        return vals.arr;

    vals.arr = computePercentGain(vals);
    vals.arr = computePercentLoss(vals);
    for (let a = 0; a < vals.arr.length; a++) {
        let arrSlice = vals.arr.slice(Math.max(a - vals.interval + 1, 0), a + 1);
        vals.arr[a][`averagePercentGain_${vals.interval}_`] = average({
            'arr' : arrSlice,
            'attribute' : 'percentGain'
        });
        vals.arr[a][`averagePercentLoss_${vals.interval}_`] = average({
            'arr' : arrSlice,
            'attribute' : 'percentLoss'
        });
        if (a > vals.interval) {
            vals.arr[a][`rsi_${vals.interval}_`] = 100 - (100 / (1 + ((vals.interval - 1) * 
                vals.arr[a - 1][`averagePercentGain_${vals.interval}_`] + 
                vals.arr[a].percentGain) / ((vals.interval - 1) * 
                vals.arr[a - 1][`averagePercentLoss_${vals.interval}_`] + 
                vals.arr[a].percentLoss)));
        } else {
            vals.arr[a][`rsi_${vals.interval}_`] = 100 - 
                (100 / (1 + vals.arr[a][`averagePercentGain_${vals.interval}_`] /
                vals.arr[a][`averagePercentLoss_${vals.interval}_`]));
        }
    }
    return vals.arr;
}

// Percent of All Time High
const computePath = (vals) => {
    if (vals.arr[vals.arr.length - 1].path != undefined) 
        return vals.arr;

    let ath = 0;
    for (let a = 0; a < vals.arr.length; a++) {
        ath = Math.max(ath, vals.arr[a].close);
        vals.arr[a].path = vals.arr[a].close / ath;
    }
    return vals.arr;
}
   
// Volatility (as a percentage of current value)
const computePercentVolatility = (vals) => {
    if (vals.arr[vals.arr.length - 1][`percentVolatility_${vals.interval}_`] != undefined) 
        return vals.arr;

    for (let a = vals.interval; a < vals.arr.length; a++) {
        let arrSlice = vals.arr.slice(Math.max(a - vals.interval + 1, 0), a + 1);
        let mean = average({'arr' : arrSlice});
        let variance = 0;
        for (let b = 0; b < arrSlice.length; b++) {
            variance += Math.pow(arrSlice[b].close - mean, 2)
        }
        variance /= vals.interval;
        vals.arr[a][`percentVolatility_${vals.interval}_`] = Math.sqrt(variance) / vals.arr[a].close;
    }
    return vals.arr;
}

// Sharpe ratio (risk free rate = 0)
const computeSharpe = (vals) => {
    if (vals.arr[vals.arr.length - 1][`sharpe_${vals.interval}_`] != undefined) 
        return vals.arr;
        
    for (let a = 0; a < vals.arr.length; a++) {
        let arrSlice = vals.arr.slice(Math.max(a - vals.interval + 1, 0), a + 1);
        let mean = average({'arr' : arrSlice});
        let variance = 0;
        for (let b = 0; b < arrSlice.length; b++) {
            variance += Math.pow(arrSlice[b].close - mean, 2);
        }
        vals.arr[a][`sharpe_${vals.interval}_`] = (arrSlice[arrSlice.length - 1].close - 
            arrSlice[0].close) / Math.sqrt(variance / arrSlice.length);
        if (isNaN(vals.arr[a][`sharpe_${vals.interval}_`])) vals.arr[a][`sharpe_${vals.interval}_`] = 0;
    }
    return vals.arr;
}

// Sortino ratio (risk free rate = 0)
const computeSortino = (vals) => {
    if (vals.arr[vals.arr.length - 1][`sortino_${vals.interval}_`] != undefined) 
        return vals.arr;
        
    for (let a = 0; a < vals.arr.length; a++) {

        // Slice array for interval but only keep negative candles
        let arrSliceTmp = vals.arr.slice(Math.max(a - vals.interval + 1, 0), a + 1);
        let arrSlice = [];
        for (let b = 1; b < arrSliceTmp.length; b++) {
            if (arrSliceTmp[b].close < arrSliceTmp[b - 1].close) arrSlice.push(arrSliceTmp[b]);
        }

        // If length is 1 or 0, denominator becomes 0
        if (arrSlice.length > 1) {
            let mean = average({'arr' : arrSlice});
            let variance = 0;
            for (let b = 0; b < arrSlice.length; b++) {
                variance += Math.pow(arrSlice[b].close - mean, 2);
            }
            vals.arr[a][`sortino_${vals.interval}_`] = (arrSlice[arrSlice.length - 1].close -
                arrSlice[0].close) / Math.sqrt(variance / arrSlice.length);
            if (isNaN(vals.arr[a][`sortino_${vals.interval}_`])) vals.arr[a][`sortino_${vals.interval}_`] = 0;
        } else {
            vals.arr[a][`sortino_${vals.interval}_`] = 0;
        }
    }
    return vals.arr;
}

// Average True Range
const computeAtr = (vals) => {
    if (vals.arr[vals.arr.length - 1][`atr_${vals.interval}_`] != undefined) 
        return vals.arr;

    for (let a = vals.interval; a < vals.arr.length; a++) {
        let tr = 0;
        let arrSlice = vals.arr.slice(Math.max(a - vals.interval, 0), a + 1);
        for (let b = 1; b < arrSlice.length; b++) {
            tr += Math.max(
                +((arrSlice[b].high - arrSlice[b].low).toFixed(2)),
                +((Math.abs(arrSlice[b].high - arrSlice[b - 1].close)).toFixed(2)),
                +((Math.abs(arrSlice[b].low - arrSlice[b - 1].close)).toFixed(2))
            );
        }
        vals.arr[a][`atr_${vals.interval}_`] = +((tr / (arrSlice.length - 1))).toFixed(2); 
    }
    return vals.arr;
}

// Positive Directional Movement
const computePdm = (vals) => {
    if (vals.arr[vals.arr.length - 1][`pdm`] != undefined) 
        return vals.arr;

    for (let a = 1; a < vals.arr.length; a++) {
        let dm = vals.arr[a].high - vals.arr[a - 1].high;
        if (dm > 0 && dm > vals.arr[a - 1].low - vals.arr[a].low)
            vals.arr[a][`pdm`] = +(dm.toFixed(2));
        else vals.arr[a][`pdm`] = 0;
    }
    return vals.arr;
}

// Positive Directional Index
const computePdi = (vals) => {
    if (vals.arr[vals.arr.length - 1][`pdi_${vals.interval}_`] != undefined) 
        return vals.arr;

    vals.arr = computeAtr(vals);
    vals.arr = computePdm(vals);
    for (let a = vals.interval; a < vals.arr.length; a++) {
        let sum = 0;
        let arrSlice = vals.arr.slice(Math.max(a - vals.interval + 1, 0), a + 1);
        for (let b = 0; b < arrSlice.length; b++) sum += arrSlice[b][`pdm`];
        vals.arr[a][`pdi_${vals.interval}_`] = 100 * (sum / arrSlice.length)
            / vals.arr[a][`atr_${vals.interval}_`];
    }
    return vals.arr;
}

// Negative Directional Movement
const computeNdm = (vals) => {
    if (vals.arr[vals.arr.length - 1][`ndm`] != undefined) 
        return vals.arr;

    for (let a = 1; a < vals.arr.length; a++) {
        let dm = +(vals.arr[a - 1].low - vals.arr[a].low.toFixed(2));
        if (dm > 0 && dm > +(vals.arr[a].high - vals.arr[a - 1].high.toFixed(2))) 
            vals.arr[a][`ndm`] = dm;
        else vals.arr[a][`ndm`] = 0;
    }
    return vals.arr;
}

// Negative Directional Index
const computeNdi = (vals) => {
    if (vals.arr[vals.arr.length - 1][`ndi_${vals.interval}_`] != undefined) 
        return vals.arr;

    vals.arr = computeAtr(vals);
    vals.arr = computeNdm(vals);
    for (let a = vals.interval; a < vals.arr.length; a++) {
        let sum = 0;
        let arrSlice = vals.arr.slice(Math.max(a - vals.interval + 1, 0), a + 1);
        for (let b = 0; b < arrSlice.length; b++) sum += arrSlice[b][`ndm`];
        vals.arr[a][`ndi_${vals.interval}_`] = 100 * +((sum / arrSlice.length).toFixed(2))
            / vals.arr[a][`atr_${vals.interval}_`];
    }
    return vals.arr;
}

// Average Directional Index
const computeAdx = (vals) => {
    if (vals.arr[vals.arr.length - 1][`adx_${vals.interval}_`] != undefined) 
        return vals.arr;

    vals.arr = computePdi(vals);
    vals.arr = computeNdi(vals);
    for (let a = vals.interval; a < vals.arr.length; a++) {
        let sum = 0;
        let arrSlice = vals.arr.slice(Math.max(a - vals.interval + 1, 0), a + 1);
        for (let b = 0; b < arrSlice.length; b++) {
            sum += +((Math.abs(arrSlice[b][`pdi_${vals.interval}_`] - 
                arrSlice[b][`ndi_${vals.interval}_`]) / (arrSlice[b][`pdi_${vals.interval}_`] 
                + arrSlice[b][`ndi_${vals.interval}_`])).toFixed(2))
        }
        vals.arr[a][`adx_${vals.interval}_`] = 100 * sum / arrSlice.length;
    }
    return vals.arr;
}

// Average Directional Index Rating
const computeAdxr = (vals) => {
    if (vals.arr[vals.arr.length - 1][`adxr_${vals.interval}_`] != undefined) 
        return vals.arr;

    vals.arr = computeAdx(vals);
    for (let a = vals.interval; a < vals.arr.length; a++) {
        vals.arr[a][`adxr_${vals.interval}_`] = (vals.arr[a][`adx_${vals.interval}_`] + 
            vals.arr[a - vals.interval][`adx_${vals.interval}_`]) / 2
    }
    return vals.arr;
}

// Percentage Price Oscillator
const computePpo = (vals) => {
    if (vals.arr[vals.arr.length - 1][`ppo`] != undefined) 
        return vals.arr;

    vals.arr = computeEma({"arr" : vals.arr, "interval" : 9});
    vals.arr = computeEma({"arr" : vals.arr, "interval" : 26});
    for (let a = 0; a < vals.arr.length; a++) {
        vals.arr[a].ppo = (vals.arr[a]["ema_9_"] - vals.arr[a]["ema_26_"]) 
            / vals.arr[a]["ema_26_"];
    }
    return vals.arr;
}

// Balance of Power
const computeBop = (vals) => {
    if (vals.arr[vals.arr.length - 1][`bop_${vals.interval}_`] != undefined) 
        return vals.arr;

    for (let a = vals.interval; a < vals.arr.length; a++) {
        let sum = 0;
        let arrSlice = vals.arr.slice(Math.max(a - vals.interval, 0), a + 1);
        for (let b = 0; b < arrSlice.length; b++) {
            sum += (arrSlice[b].close - arrSlice[b].open) 
                / (arrSlice[b].high - arrSlice[b].low);
        }
        vals.arr[a][`bop_${vals.interval}_`] = +((sum / arrSlice.length).toFixed(2));
    }
    return vals.arr;
}

// Price Rate of Change
const computeProc = (vals) => {
    if (vals.arr[vals.arr.length - 1][`proc_${vals.interval}_`] != undefined) 
        return vals.arr;

    for (let a = vals.interval; a < vals.arr.length; a++) {
        vals.arr[a][`proc_${vals.interval}_`] = 100 * 
            (vals.arr[a].close - vals.arr[a - vals.interval].close) 
            / vals.arr[a - vals.interval].close;
    }
    return vals.arr;
}

// Volume Rate of Change
const computeVroc = (vals) => {
    if (vals.arr[vals.arr.length - 1][`vroc_${vals.interval}_`] != undefined) 
        return vals.arr;

    for (let a = vals.interval; a < vals.arr.length; a++) {
        vals.arr[a][`vroc_${vals.interval}_`] = 100 * 
            (vals.arr[a].volume - vals.arr[a - vals.interval].volume) 
            / vals.arr[a - vals.interval].volume;
    }
    return vals.arr;
}

// Chande Momentum Oscillator
const computeCmo = (vals) => {
    if (vals.arr[vals.arr.length - 1][`cmo_${vals.interval}_`] != undefined) 
        return vals.arr;

    for (let a = vals.interval; a < vals.arr.length; a++) {
        let ups = 0;
        let downs = 0;
        let arrSlice = vals.arr.slice(Math.max(a - vals.interval + 1, 0), a + 1);
        for (let b = 1; b < arrSlice.length; b++) {
            let change = arrSlice[b].close - arrSlice[b - 1].close;
            if (change > 0) ups += change;
            else downs += Math.abs(change);
        }
        vals.arr[a][`cmo_${vals.interval}_`] = 100 * (ups - downs) / (ups + downs);
    }
    return vals.arr;
}

// Aroon Up Indicator
const computeAroonUp = (vals) => {
    if (vals.arr[vals.arr.length - 1][`aroonup_${vals.interval}_`] != undefined) 
        return vals.arr;

    for (let a = vals.interval; a < vals.arr.length; a++) {
        maxPos = 0;
        let arrSlice = vals.arr.slice(Math.max(a - vals.interval + 1, 0), a + 1);
        for (let b = 1; b < arrSlice.length; b++) 
            if (arrSlice[b].high >= arrSlice[maxPos].high) maxPos = b;
        vals.arr[a][`aroonup_${vals.interval}_`] = maxPos / (arrSlice.length - 1) * 100;
    }
    return vals.arr;
}

// Aroon Down Indicator
const computeAroonDown = (vals) => {
    if (vals.arr[vals.arr.length - 1][`aroondown_${vals.interval}_`] != undefined) 
        return vals.arr;

    for (let a = vals.interval; a < vals.arr.length; a++) {
        maxPos = 0;
        let arrSlice = vals.arr.slice(Math.max(a - vals.interval + 1, 0), a + 1);
        for (let b = 1; b < arrSlice.length; b++) 
            if (arrSlice[b].low <= arrSlice[maxPos].low) maxPos = b;
        vals.arr[a][`aroondown_${vals.interval}_`] = maxPos / (arrSlice.length - 1) * 100;
    }
    return vals.arr;
}

// Aroon Oscilator
const computeAroonOsc = (vals) => {
    if (vals.arr[vals.arr.length - 1][`aroonosc_${vals.interval}_`] != undefined) 
        return vals.arr;

    vals.arr = computeAroonUp(vals);
    vals.arr = computeAroonDown(vals);
    for (let a = vals.interval; a < vals.arr.length; a++) {
        vals.arr[a][`aroonosc_${vals.interval}_`] = vals.arr[a][`aroonup_${vals.interval}_`] 
        - vals.arr[a][`aroondown_${vals.interval}_`];
    }
    return vals.arr;
}

// Triple Exponential Moving Average Index
const computeTrix = (vals) => {
    if (vals.arr[vals.arr.length - 1][`trix_${vals.interval}_`] != undefined) 
        return vals.arr;

    vals.arr = computeEmaEmaEma(vals);
    for (let a = vals.interval; a < vals.arr.length; a++) {
        vals.arr[a][`trix_${vals.interval}_`] = 100 * 
            (vals.arr[a][`emaEmaEma_${vals.interval}_`] - 
            vals.arr[a - 1][`emaEmaEma_${vals.interval}_`]) / 
            vals.arr[a][`emaEmaEma_${vals.interval}_`]
    }
    return vals.arr;
}

// Change Location Value
const computeClv = (vals) => {
    if (vals.arr[vals.arr.length - 1].clv != undefined) 
        return vals.arr;

    for (let a = 0; a < vals.arr.length; a++) {
        if (vals.arr[a].low == vals.arr[a].high) vals.arr[a].clv = 0;
        else vals.arr[a].clv = ((vals.arr[a].close - vals.arr[a].low) 
            - (vals.arr[a].high - vals.arr[a].close)) / 
            (vals.arr[a].high - vals.arr[a].low);
    }
    return vals.arr;
}

// Chaikin Accumulation/Distribution Line
const computeAdl = (vals) => {
    if (vals.arr[vals.arr.length - 1].adl != undefined) 
        return vals.arr;

    vals.arr = computeClv(vals);
    vals.arr[0].adl = vals.arr[0].clv * vals.arr[0].volume;
    for (let a = 1; a < vals.arr.length; a++) {
        vals.arr[a].adl = vals.arr[a - 1].adl + vals.arr[a].clv * vals.arr[a].volume;
    }
    return vals.arr;
}

// Chaikin Oscilator for Accumulation/Distribution Line
const computeAdosc = (vals) => {
    if (vals.arr[vals.arr.length - 1][`adosc`] != undefined) 
        return vals.arr;

    vals.arr = computeAdl(vals);
    tmpArr = vals.arr.slice();

    // Chaikan Short Moving Average
    tmpArr[0].shortEma = tmpArr[0].ad;
    for (let a = 1; a < tmpArr.length; a++) 
        tmpArr[a].chaikanShortEma = 0.15 * tmpArr[a].adl + 0.85 * (tmpArr[a - 1].chaikanShortEma || 0);
    
    // Chaikan Long Moving Average
    tmpArr[0].longEma = tmpArr[0].ad;
    for (let a = 1; a < tmpArr.length; a++) 
        tmpArr[a].chaikanLongEma = 0.075 * tmpArr[a].adl + 0.925 * (tmpArr[a - 1].chaikanLongEma || 0);
        
    for (let a = 0; a < vals.arr.length; a++)
        vals.arr[a].adosc = tmpArr[a].chaikanShortEma - tmpArr[a].chaikanLongEma;
    return vals.arr;
}

// On Balance Volume
const computeObv = (vals) => {
    if (vals.arr[vals.arr.length - 1][`obv`] != undefined) 
        return vals.arr;

    vals.arr[0].obv = vals.arr[0].volume;
    for (let a = 1; a < vals.arr.length; a++) {
        if (vals.arr[a].close > vals.arr[a - 1].close) 
            vals.arr[a].obv = vals.arr[a - 1].obv + vals.arr[a].volume;
        else if (vals.arr[a].close < vals.arr[a - 1].close) 
            vals.arr[a].obv = vals.arr[a - 1].obv - vals.arr[a].volume;
        else vals.arr[a].obv = vals.arr[a - 1].obv;
    }
    return vals.arr;
}

// Ultimate Oscillator (x, x*2, x*4)
const computeUltosc = (vals) => {
    if (vals.arr[vals.arr.length - 1][`ultosc_${vals.interval}_`] != undefined) 
        return vals.arr;

    const x = vals.interval;
    const y = x * 2;
    const z = y * 2;

    for (let a = z; a < vals.arr.length; a++) {
        let arrSlice1 = vals.arr.slice(Math.max(a - x + 1, 0), a + 1);
        let arrSlice2 = vals.arr.slice(Math.max(a - y + 1, 0), a + 1);
        let arrSlice3 = vals.arr.slice(Math.max(a - z + 1, 0), a + 1);

        let a1 = a2 = a3 = 0;
        for (let b = 0; b < arrSlice1.length; b++) a1 += arrSlice1[b].close - arrSlice1[b].low;
        for (let b = 0; b < arrSlice2.length; b++) a2 += arrSlice2[b].close - arrSlice2[b].low;
        for (let b = 0; b < arrSlice3.length; b++) a3 += arrSlice3[b].close - arrSlice3[b].low;

        let b1 = b2 = b3 = 0;
        for (let b = 1; b < arrSlice1.length; b++) {
            b1 += Math.max(
                arrSlice1[b].high - arrSlice1[b].low,
                Math.abs(arrSlice1[b].high - arrSlice1[b - 1].close),
                Math.abs(arrSlice1[b].low - arrSlice1[b - 1].close)
            );
        }
        for (let b = 1; b < arrSlice2.length; b++) {
            b2 += Math.max(
                arrSlice2[b].high - arrSlice2[b].low,
                Math.abs(arrSlice2[b].high - arrSlice2[b - 1].close),
                Math.abs(arrSlice2[b].low - arrSlice2[b - 1].close)
            );
        }
        for (let b = 1; b < arrSlice3.length; b++) {
            b3 += Math.max(
                arrSlice3[b].high - arrSlice3[b].low,
                Math.abs(arrSlice3[b].high - arrSlice3[b - 1].close),
                Math.abs(arrSlice3[b].low - arrSlice3[b - 1].close)
            );
        }

        vals.arr[a][`ultosc_${vals.interval}_`] = +((((a1 / b1) * 4 + (a2 / b2) * 2 + (a3 / b3)) / 7 * 100).toFixed(2));
    }
    return vals.arr;
}

// Bollinger Bands
const computeBbands = (vals) => {
    if (vals.arr[vals.arr.length - 1][`midbband_${vals.interval}_`] != undefined) 
        return vals.arr;

    for (let a = vals.interval; a < vals.arr.length; a++) {
        let arrSlice = vals.arr.slice(Math.max(a - vals.interval + 1, 0), a + 1);

        // Compute mean of arrSlice
        let midBand = 0;
        for (let b = 0; b < arrSlice.length; b++) 
            midBand += (arrSlice[b].close + arrSlice[b].high + arrSlice[b].low);
        midBand /= (vals.interval * 3);

        // Compute 2nd standard deviation of arrSlice
        let stddev = 0;
        for (let b = 0; b < arrSlice.length; b++) 
            stddev += Math.pow((arrSlice[b].close + arrSlice[b].high + arrSlice[b].low) / 3 - midBand, 2);
        stddev = 2 * Math.sqrt(stddev / vals.interval);

        vals.arr[a][`midbband_${vals.interval}_`] = midBand;
        vals.arr[a][`upbband_${vals.interval}_`] = midBand + stddev;
        vals.arr[a][`lowbband_${vals.interval}_`] = midBand - stddev;
    }
    return vals.arr;
}

// Commodity Channel Index
const computeCci = (vals) => {
    if (vals.arr[vals.arr.length - 1][`cci_${vals.interval}_`] != undefined) 
        return vals.arr;

    tmpArr = vals.arr.slice();
    for (let a = 1; a < tmpArr.length; a++) {
        let arrSlice = tmpArr.slice(Math.max(a - vals.interval + 1, 0), a + 1);

        // Typical Price of current obj
        tmpArr[a].tp = (tmpArr[a].high + tmpArr[a].low + tmpArr[a].close) / 3;
        arrSlice[arrSlice.length - 1].tp = tmpArr[a].tp;

        // Mean tp of slice of objs
        let mean = 0;
        for (let b = 0; b < arrSlice.length; b++) mean += arrSlice[b].tp;
        mean = mean / arrSlice.length;

        // Mean deviation of tp of slice of objs
        let meanDev = 0;
        for (let b = 0; b < arrSlice.length; b++) 
            meanDev += Math.abs(arrSlice[b].tp - mean);
        meanDev /= arrSlice.length;

        vals.arr[a][`cci_${vals.interval}_`] = (tmpArr[a].tp - mean) / (.015 * meanDev);
    }
    return vals.arr;
}

// Money Flow Index
const computeMfi = (vals) => {
    if (vals.arr[vals.arr.length - 1][`mfi_${vals.interval}_`] != undefined) 
        return vals.arr;

    for (let a = vals.interval; a < vals.arr.length; a++) {

        // Typical price and money flow of current obj
        let tp = (vals.arr[a].close + vals.arr[a].high + vals.arr[a].low) / 3;
        let mf = tp * vals.arr[a].volume;

        // Compute positive and negative money flows
        if (tp > (vals.arr[a - 1].close + vals.arr[a - 1].high + vals.arr[a - 1].low) / 3) {
            vals.arr[a].pmf = vals.arr[a - 1].pmf + mf;
            vals.arr[a].nmf = 0;
        } else {
            vals.arr[a].nmf = vals.arr[a - 1].nmf + mf;
            vals.arr[a].pmf = 0;
        }

        // Compute money flow index
        let sumPmf = sumNmf = 0;
        let arrSlice = vals.arr.slice(Math.max(a - vals.interval + 1, 0), a + 1);
        for (let b = 0; b < arrSlice.length; b++) {
            sumPmf += arrSlice[b].pmf;
            sumNmf += arrSlice[b].nmf;
        } 

        vals.arr[a][`mfi_${vals.interval}_`] = 100 - (100 / (1 + sumPmf / sumNmf));
    }
    return vals.arr;
}

/////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////

// List of key words to detect in UDF and their corresponding compute function
const keyWords = {
    'sok' : computeSo,
    'sod' : computeSo,
    'bop' : computeBop,
    'sma' : computeSma,
    'ema' : computeEma,
    'rsi' : computeRsi,
    'ppo' : computePpo,
    'atr' : computeAtr,
    'pdm' : computePdm,
    'ndm' : computeNdm,
    'pdi' : computePdi,
    'ndi' : computeNdi,
    'adx' : computeAdx,
    'adxr' : computeAdxr,
    'day' : computeDate,
    'year' : computeDate,
    'path' : computePath,
    'macd' : computeMacD,
    'kama' : computeKama,
    'dema' : computeDema,
    'tema' : computeTema,
    'vwap' : computeVwap,
    'month' : computeDate,
    'dcasr' : computeDcasr,
    'trima' : computeTrima,
    'willr' : computeWillr,
    "sharpe" : computeSharpe,
    "sortino" : computeSortino,
    'emaEma' : computeEmaEma,
    'longEma' : computeLongEma,
    'shortEma' : computeShortEma,
    'emaEmaEma' : computeEmaEmaEma,
    'priceVolume' : computePriceVolume,
    'percentGain' : computePercentGain,
    'percentLoss' : computePercentLoss,
    'percentVolatility' : computePercentVolatility,
    'proc' : computeProc, 
    'vroc' : computeVroc, 
    'cmo' : computeCmo, 
    'aroonup' : computeAroonUp, 
    'aroondown' : computeAroonDown, 
    'aroonosc' : computeAroonOsc, 
    'trix' : computeTrix, 
    'clv' : computeClv, 
    'adl' : computeAdl, 
    'adosc' : computeAdosc, 
    'ultosc' : computeUltosc, 
    'obv' : computeObv, 
    'midbband' : computeBbands, 
    'upbband' : computeBbands, 
    'lowbband' : computeBbands, 
    'cci' : computeCci, 
    'mfi' : computeMfi 
};

// Input: vals.arr as array, vals.f as string
// Output: vals.arr with added fields
const udfParser = (vals) => {
    let arr = vals.arr.slice();
    for (const a in keyWords) {
        if (vals.f.includes(`.${a}`)) {

            // If the computeFunction is interval dependent
            if (vals.f.includes(`.${a}_`)) {
                for (const str of vals.f.split(`.${a}_`).slice(1)) {

                    // Only compute values if they do not already exist
                    if (arr[arr.length - 1][`${a}_${str.split('_')[0]}_`] == undefined) {
                        const interval = Number(str.split('_')[0]);
                        if (interval < 3 || interval > 120) {
                            return 'Error: Input out of range [3, 120] for ' + `${a}_${str.split('_')[0]}_.`;
                        }
                        arr = keyWords[a]({
                            'arr' : arr, 
                            'interval' : interval
                        });
                    }
                }

            // Only compute values if they do not already exist
            } else if (arr[arr.length - 1][a] == undefined)
                arr = keyWords[a]({
                    'arr' : arr
                });
        }
    }
    return arr;
};