const configUtils = require("../configUtils");

module.exports = async function (context, req) {
    try {
        // Verify jwt and that user is fetching their data only
        const jwt = req.body.Jwt.split(".").map((str64) => JSON.parse(Buffer.from(str64, "base64").toString('utf-8')));
        if (configUtils.VerifyJwt(jwt, configUtils.JwtSecret)) {

            // Filter user requests based on their recent traffic
            const headerId = ((req.headers["x-forwarded-for"] || "").split(',')[0] || req.connection.remoteAddress).replace(/[^\w\s\.:]/gi, "");
            if (await configUtils.UserRequestFilter(headerId, "verify account")) {

                // Generate random transactionId
                const transactionId = ((+new Date).toString(36) + Math.random().toString(36).slice(0, 8)).replace(/[^0-9a-z]/gi, '');

                // Determine queue used for function output
                const queuePartition = configUtils.PartitionHash(jwt[1].userId, configUtils.TransactionQueueCount);

                // Output to storage queue
                context.bindings["outputSubmitTransactionQueue" + queuePartition] = [{
                    "UserId" : jwt[1].userId,
                    "UserPartition" : configUtils.PartitionHash(jwt[1].userId, configUtils.UserPartitions),
                    "TransactionId" : transactionId,
                    "Transaction" : JSON.stringify(req.body.Transaction)
                }];

                // Output to storage table
                context.bindings["outputUserTransaction"] = [{
                    "PartitionKey" : jwt[1].userId + "-" + req.body.Transaction.Type.replace(/\W/g, ''),
                    "RowKey" : transactionId,
                    "Transaction" : JSON.stringify(req.body.Transaction),
                    "Deleted" : 0
                }];

                // Output to client
                context.res = {
                    "body" : {
                        "TransactionId" : transactionId, 
                        "Jwt" : configUtils.ConstructJwt(jwt[1].userId, configUtils.JwtSecret)
                    }
                };
                
            } else {
                context.res = { 
                    "body" : {
                        "Jwt" : configUtils.ConstructJwt(jwt[1].userId, configUtils.JwtSecret),
                        "Error" : configUtils.TooManyRequestsMessage 
                    }
                };
            }
        } else {
            context.res = { 
                "body" : {
                    "Error" : configUtils.JwtPermissionDeniedMessage 
                }
            };
        }
    } catch (error) {
        context.log(error);
        context.res = { 
            "body" : {
                "Error" : configUtils.TransactionGatewayErrorMessage 
            }
        };
    } 
}

