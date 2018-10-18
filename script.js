/**
 * Cloud script game
 * For lancelot game
 */

/**
 * Register player
 * @param args
 * @param context
 * @returns {*}
 */
handlers.registerPlayer = function (args, context) {

    var playerStructure = {
        data: {
            phone: null,
            color: 1,
            helmet: 1,
            tutorial: true
        },
        readOnly: {
            level: 0,
            exp: 0
        },
        internal: {
            code: null,
            phone_verified_timestamp: null,
            phone_verified: false
        }
    };

    // server.AddUserVirtualCurrency({
    //     PlayFabId: currentPlayerId,
    //     VirtualCurrency: "CO",
    //     Amount: 1000
    // });

    server.UpdateUserData({
        PlayFabId: currentPlayerId,
        Data: playerStructure.data
    });

    server.UpdateUserReadOnlyData({
        PlayFabId: currentPlayerId,
        Data: playerStructure.readOnly
    });

    server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: playerStructure.internal
    });

    return {code: 200, text: "Register user"};
};

/**
 * Start match
 * @param args
 * @param context
 * @returns {*}
 */
handlers.MatchCanFind = function (args, context) {

    log.debug("arg:", args);

    log.debug("type:", typeof(args));

    var betId = args.betId;
    if (!args || (args && typeof betId == "undefined")) {
        return {code: 400, text: "Not valid params"};
    }

    var titleData = server.GetTitleData({
        "Keys": [
            "bet"
        ]
    });

    var bet = JSON.parse(titleData.Data.bet);

    log.debug("bet", betId);

    for (var i = 0; i < bet.length; i++) {

        if (bet[i].id == betId) {

            log.debug("bet find ", bet[i].id);

            var investoryData = server.GetUserInventory({
                PlayFabId: currentPlayerId
            });

            var coins = investoryData.VirtualCurrency.CO;

            if (coins > bet[i].coins) {
                return {code: 200, text: "User can match find"};
            }

            return {code: 400, text: "Not enough money"};
        }
    }

    return {code: 400, text: "Not find bet"};
};


/**
 * Match created
 * @param args
 * @param context
 * @returns {*}
 */
handlers.MatchCreated = function (args, context) {

    log.debug("arg:", args);

    log.debug("type:", typeof(args));

    var betId = args.betId;
    var matchId = args.matchId;
    if (!args || (args && (typeof betId == "undefined" || typeof matchId == "undefined"))) {


        log.debug("arg1:", betId);
        log.debug("arg2:", matchId);

        return {code: 400, text: "Not valid params"};
    }

    server.CreateSharedGroup({
        SharedGroupId: matchId
    });

    server.UpdateSharedGroupData({
        SharedGroupId: matchId,
        Data: {
            betId: betId
        },
        Permission: "Public"
    });

    log.debug("Match Created: " + matchId);

    return {code: 200, text: "Match start " + matchId, data: {matchId: matchId}};
};

/**
 *
 * @param args
 * @constructor
 */
handlers.MatchStart = function (args) {

    log.debug("arg:", args);

    log.debug("type:", typeof(args));

    var matchId = args.matchId;
    var p1 = args.p1;
    var p2 = args.p2;
    if (!args || (args && (
            typeof matchId == "undefined"
            || typeof p1 == "undefined"
            || typeof p2 == "undefined"
        ))) {
        return {code: 400, text: "Not valid params"};
    }

    var sharedData = server.GetSharedGroupData({
        SharedGroupId: matchId,
        Keys: [
            "betId"
        ]
    });

    log.debug("data: ", sharedData);

    var betId = sharedData.Data.betId.Value;

    var players = [p1];
    if(p2 != null){
        players.push(p2)
    }

    server.AddSharedGroupMembers({
        SharedGroupId: matchId,
        PlayFabIds: players
    });

    log.debug("bet", betId);

    var titleData = server.GetTitleData({
        "Keys": [
            "bet"
        ]
    });

    var bet = JSON.parse(titleData.Data.bet);

    for (var i = 0; i < bet.length; i++) {

        if (bet[i].id == betId) {

            var coins = bet[i].coins;

            log.debug("bet find ", coins);

            if(getCoins(p1) < coins || (players.length > 1 && getCoins(p2) < coins)){
                return {code: 400, text: "Not enough money"};
            }

            withdrawCoins(p1, coins);

            if(p2 != null){
                withdrawCoins(p2, coins);
            }

            return {code: 200, text: "Ok"};
        }
    }
};

function getCoins(playFabId) {

    var investoryData = server.GetUserInventory({
        PlayFabId: playFabId
    });

    return investoryData.VirtualCurrency.CO;
}

function withdrawCoins(playFabId, amount) {

    server.SubtractUserVirtualCurrency({
        PlayFabId: playFabId,
        VirtualCurrency: "CO",
        Amount: amount
    });

    log.debug("spent ", amount);
}

/**
 *
 * @param args
 * @constructor
 */
handlers.MatchClosed = function (args) {
    log.debug("Match Closed - Game: " + args.GameId);
};

/**
 * Match End
 * @param args
 * @param context
 * @returns {*}
 */
handlers.MatchEnd = function (args, context) {

    log.debug("arg:", args);

    log.debug("type:", typeof(args));

    var status = args.status;
    var matchId = args.matchId;

    if (!args || (args && (typeof status == "undefined" || typeof matchId == "undefined"))) {
        return {code: 400, text: "Not valid params"};
    }

    var sharedData = server.GetSharedGroupData({
        SharedGroupId: matchId,
        Keys: [
            "betId"
        ]
    });

    log.debug("data: ", sharedData);

    var betId = sharedData.Data.betId.Value;

    var titleData = server.GetTitleData({
        "Keys": [
            "bet",
            "levels"
        ]
    });

    var bet = JSON.parse(titleData.Data.bet);
    var levels = JSON.parse(titleData.Data.levels);

    for (var i = 0; i < bet.length; i++) {

        if (bet[i].id == betId) {

            log.debug("bet find ", bet[i].id);

            var coins = (status == true)? bet[i].win.coins: bet[i].lose.coins;
            var exp = (status == true)? bet[i].win.exp: bet[i].lose.exp;

            var readOnlyData = server.GetUserReadOnlyData({
                PlayFabId: currentPlayerId,
                "Keys": [
                    "level",
                    "exp"
                ]
            });

            exp = (typeof readOnlyData.Data.exp.Value != "undefined")? parseInt(readOnlyData.Data.exp.Value) + exp: exp;

            var level = 0;
            for (var j = 0; j < levels.length; j++) {
                if (exp > levels[j].exp) {
                    level = levels[j].lvl;
                }
            }

            log.debug("level ", level);

            server.UpdateUserReadOnlyData({
                PlayFabId: currentPlayerId,
                Data: {
                    exp: exp,
                    level: level
                }
            });

            server.AddUserVirtualCurrency({
                PlayFabId: currentPlayerId,
                VirtualCurrency: "CO",
                Amount: coins
            });

            return {code: 200, text: "Ok"};
        }
    }
};

/**
 * Send code to player
 * @param args
 * @param context
 * @returns {*}
 */
handlers.Payment = function (args, context) {

    log.debug("arg:", args);

    log.debug("type:", typeof(args));

    var id = args.id;
    var sn = args.sn;
    var amount = args.amount;

    if (!args || (args && (

        typeof id == "undefined"
        || typeof sn == "undefined"
        || typeof amount == "undefined"

        ))) {
        return {code: 400, text: "Not valid params"};
    }

    var titleData = server.GetTitleData({
        "Keys": [
            "tariff"
        ]
    });

    var tariff = JSON.parse(titleData.Data.tariff);

    for (var i = 0; i < tariff.length; i++) {

        if (tariff[i].amount == amount) {

            var res = server.AddUserVirtualCurrency({
                PlayFabId: currentPlayerId,
                VirtualCurrency: "CO",
                Amount: tariff[i].coins
            });

            return {code: 200, text: "Ok", data: {
                amount: amount,
                coins: res.data.Balance,
                change: res.data.BalanceChange
            }};
        }
    }


    return {code: 400, text: "Not find tariff"};
};

/**
 * Send code to player
 * @param args
 * @param context
 * @returns {*}
 */
handlers.sendCode = function (args, context) {

    log.debug("arg:", args);

    log.debug("type:", typeof(args));

    var phone = args.phone;

    if (!args || (args && typeof phone == "undefined")) {
        return {code: 400, text: "Not valid params"};
    }

    var code = Math.floor(Math.random() * 90000) + 10000;

    var headers = {};

    var body = {
        "sn": "330",
        "msisdn": phone,
        "message": "Your activation code: " + code,
        "uid": code
    };

    var url = "http://lancelot.nmi.com.ua:8080/sms/";
    var content = JSON.stringify(body);
    var httpMethod = "post";
    var contentType = "application/json";

    // The pre-defined http object makes synchronous HTTP requests
    var response = http.request(url, httpMethod, content, contentType, headers);

    log.debug("response:", response);

    log.debug("type:", typeof(response));

    if (response) {
        var result = JSON.parse(response);
        if (result.status == "ok") {

            // server.UpdatePlayerStatistics({
            //     PlayFabId: currentPlayerId,
            //     Statistics: [{
            //         StatisticName: "sendCode",
            //         Value: true
            //     }]
            // });

            server.UpdateUserInternalData({
                PlayFabId: currentPlayerId,
                Data: {
                    "phone": phone,
                    "code": code
                }
            });

            return {code: 200, text: "Sms send", temp: code};
        }
    }

    return {code: 400, text: "Not send sms"};
};

/**
 * Check code
 * @param args
 * @param context
 * @returns {*}
 */
handlers.checkCode = function (args, context) {

    log.debug("arg:", args);

    log.debug("type:", typeof(args));

    var code = args.code;

    if (!args || (args && typeof code == "undefined")) {
        return {code: 400, text: "Not valid params"};
    }

    var playerData = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: ["code"]
    });

    var sendCode = playerData.Data["code"];

    log.debug("sendCode:", sendCode);

    if (!sendCode) {
        return {code: 400, text: "Not found validate code"};
    }

    if (code != sendCode['Value']) {
        return {code: 400, text: "Not valid code"};
    }

    // server.UpdatePlayerStatistics({
    //     PlayFabId: currentPlayerId,
    //     Statistics: [{
    //         StatisticName: "checkCode",
    //         Value: true
    //     }]
    // });

    server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: {
            phone_verified_timestamp: new Date().toUTCString(),
            phone_verified: true
        }
    });

    return {code: 200};
};

/**
 * Register player
 * @param args
 * @param context
 * @returns {*}
 */
handlers.forMatch = function (args, context) {

    var phone = args.phone;
    var password = args.password;
    var displayName = args.displayName;

    if (!args
        || (args && (typeof phone == "undefined" || typeof password == "undefined" || typeof displayName == "undefined"))) {
        return {code: 400, text: "Not valid params"};
    }

    var playerData = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: ["phone", "phone_verified"]
    });

    //log.debug("playerData:", playerData);

    var currentPhone = playerData.Data["phone"];
    if (!currentPhone || !currentPhone['Value']) {
        return {code: 400, text: "Phone not found"};
    }

    if (phone != currentPhone['Value']) {
        return {code: 400, text: "Phone does not match"};
    }

    var phoneVerified = playerData.Data["phone_verified"];
    if (!phoneVerified || !phoneVerified['Value']) {
        return {code: 400, text: "Phone not verified"};
    }

    // var result = client.AddUsernamePassword({
    //     Username: args.phone,
    //     Email: currentPlayerId + '' + 'playfab.com',
    //     Password: args.password
    // });
    //
    // log.debug("result:", result);
    //
    // client.UpdateUserTitleDisplayName({
    //     DisplayName: args.displayName
    // });

    return {code: 200};
};


// This is a Cloud Script function. "args" is set to the value of the "FunctionParameter"
// parameter of the ExecuteCloudScript API.
// (https://api.playfab.com/Documentation/Client/method/ExecuteCloudScript)
// "context" contains additional information when the Cloud Script function is called from a PlayStream action.
handlers.helloWorld = function (args, context) {

    // The pre-defined "currentPlayerId" variable is initialized to the PlayFab ID of the player logged-in on the game client.
    // Cloud Script handles authenticating the player automatically.
    var message = "Hello " + currentPlayerId + "!";

    // You can use the "log" object to write out debugging statements. It has
    // three functions corresponding to logging level: debug, info, and error. These functions
    // take a message string and an optional object.
    //log.info(message);
    var inputValue = null;
    if (args && args.inputValue)
        inputValue = args.inputValue;
    //log.debug("helloWorld:", { input: args.inputValue });


    log.debug('test');


    // The value you return from a Cloud Script function is passed back
    // to the game client in the ExecuteCloudScript API response, along with any log statements
    // and additional diagnostic information, such as any errors returned by API calls or external HTTP
    // requests. They are also included in the optional player_executed_cloudscript PlayStream event
    // generated by the function execution.
    // (https://api.playfab.com/playstream/docs/PlayStreamEventModels/player/player_executed_cloudscript)
    return {messageValue: 'test'};
};

// This is a simple example of making a PlayFab server API call
handlers.makeAPICall = function (args, context) {
    var request = {
        PlayFabId: currentPlayerId, Statistics: [{
            StatisticName: "Level",
            Value: 2
        }]
    };
    // The pre-defined "server" object has functions corresponding to each PlayFab server API
    // (https://api.playfab.com/Documentation/Server). It is automatically
    // authenticated as your title and handles all communication with
    // the PlayFab API, so you don't have to write extra code to issue HTTP requests.
    var playerStatResult = server.UpdatePlayerStatistics(request);
};

// This is a simple example of making a web request to an external HTTP API.
handlers.makeHTTPRequest = function (args, context) {
    var headers = {
        "X-MyCustomHeader": "Some Value"
    };

    var body = {
        input: args,
        userId: currentPlayerId,
        mode: "foobar"
    };

    var url = "http://httpbin.org/status/200";
    var content = JSON.stringify(body);
    var httpMethod = "post";
    var contentType = "application/json";

    // The pre-defined http object makes synchronous HTTP requests
    var response = http.request(url, httpMethod, content, contentType, headers);
    return {responseContent: response};
};

// This is a simple example of a function that is called from a
// PlayStream event action. (https://playfab.com/introducing-playstream/)
handlers.handlePlayStreamEventAndProfile = function (args, context) {

    // The event that triggered the action
    // (https://api.playfab.com/playstream/docs/PlayStreamEventModels)
    var psEvent = context.playStreamEvent;

    // The profile data of the player associated with the event
    // (https://api.playfab.com/playstream/docs/PlayStreamProfileModels)
    var profile = context.playerProfile;

    // Post data about the event to an external API
    var content = JSON.stringify({user: profile.PlayerId, event: psEvent.EventName});
    var response = http.request('https://httpbin.org/status/200', 'post', content, 'application/json', null);

    return {externalAPIResponse: response};
};


// Below are some examples of using Cloud Script in slightly more realistic scenarios

// This is a function that the game client would call whenever a player completes
// a level. It updates a setting in the player's data that only game server
// code can write - it is read-only on the client - and it updates a player
// statistic that can be used for leaderboards.
//
// A funtion like this could be extended to perform validation on the
// level completion data to detect cheating. It could also do things like
// award the player items from the game catalog based on their performance.
handlers.completedLevel = function (args, context) {
    var level = args.levelName;
    var monstersKilled = args.monstersKilled;

    var updateUserDataResult = server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: {
            lastLevelCompleted: level
        }
    });

    log.debug("Set lastLevelCompleted for player " + currentPlayerId + " to " + level);
    var request = {
        PlayFabId: currentPlayerId, Statistics: [{
            StatisticName: "level_monster_kills",
            Value: monstersKilled
        }]
    };
    server.UpdatePlayerStatistics(request);
    log.debug("Updated level_monster_kills stat for player " + currentPlayerId + " to " + monstersKilled);
};


// In addition to the Cloud Script handlers, you can define your own functions and call them from your handlers.
// This makes it possible to share code between multiple handlers and to improve code organization.
handlers.updatePlayerMove = function (args) {
    var validMove = processPlayerMove(args);
    return {validMove: validMove};
};


// This is a helper function that verifies that the player's move wasn't made
// too quickly following their previous move, according to the rules of the game.
// If the move is valid, then it updates the player's statistics and profile data.
// This function is called from the "UpdatePlayerMove" handler above and also is
// triggered by the "RoomEventRaised" Photon room event in the Webhook handler
// below.
//
// For this example, the script defines the cooldown period (playerMoveCooldownInSeconds)
// as 15 seconds. A recommended approach for values like this would be to create them in Title
// Data, so that they can be queries in the script with a call to GetTitleData
// (https://api.playfab.com/Documentation/Server/method/GetTitleData). This would allow you to
// make adjustments to these values over time, without having to edit, test, and roll out an
// updated script.
function processPlayerMove(playerMove) {
    var now = Date.now();
    var playerMoveCooldownInSeconds = 15;

    var playerData = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: ["last_move_timestamp"]
    });

    var lastMoveTimestampSetting = playerData.Data["last_move_timestamp"];

    if (lastMoveTimestampSetting) {
        var lastMoveTime = Date.parse(lastMoveTimestampSetting.Value);
        var timeSinceLastMoveInSeconds = (now - lastMoveTime) / 1000;
        log.debug("lastMoveTime: " + lastMoveTime + " now: " + now + " timeSinceLastMoveInSeconds: " + timeSinceLastMoveInSeconds);

        if (timeSinceLastMoveInSeconds < playerMoveCooldownInSeconds) {
            log.error("Invalid move - time since last move: " + timeSinceLastMoveInSeconds + "s less than minimum of " + playerMoveCooldownInSeconds + "s.");
            return false;
        }
    }

    var playerStats = server.GetPlayerStatistics({
        PlayFabId: currentPlayerId
    }).Statistics;
    var movesMade = 0;
    for (var i = 0; i < playerStats.length; i++)
        if (playerStats[i].StatisticName === "")
            movesMade = playerStats[i].Value;
    movesMade += 1;
    var request = {
        PlayFabId: currentPlayerId, Statistics: [{
            StatisticName: "movesMade",
            Value: movesMade
        }]
    };
    server.UpdatePlayerStatistics(request);
    server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: {
            last_move_timestamp: new Date(now).toUTCString(),
            last_move: JSON.stringify(playerMove)
        }
    });

    return true;
}

// This is an example of using PlayStream real-time segmentation to trigger
// game logic based on player behavior. (https://playfab.com/introducing-playstream/)
// The function is called when a player_statistic_changed PlayStream event causes a player
// to enter a segment defined for high skill players. It sets a key value in
// the player's internal data which unlocks some new content for the player.
handlers.unlockHighSkillContent = function (args, context) {
    var playerStatUpdatedEvent = context.playStreamEvent;
    var request = {
        PlayFabId: currentPlayerId,
        Data: {
            "HighSkillContent": "true",
            "XPAtHighSkillUnlock": playerStatUpdatedEvent.StatisticValue.toString()
        }
    };
    var playerInternalData = server.UpdateUserInternalData(request);
    log.info('Unlocked HighSkillContent for ' + context.playerProfile.DisplayName);
    return {profile: context.playerProfile};
};

// Photon Webhooks Integration
//
// The following functions are examples of Photon Cloud Webhook handlers.
// When you enable the Photon Add-on (https://playfab.com/marketplace/photon/)
// in the Game Manager, your Photon applications are automatically configured
// to authenticate players using their PlayFab accounts and to fire events that
// trigger your Cloud Script Webhook handlers, if defined.
// This makes it easier than ever to incorporate multiplayer server logic into your game.


// Triggered automatically when a Photon room is first created


// Triggered by calling "OpRaiseEvent" on the Photon client. The "args.Data" property is 
// set to the value of the "customEventContent" HashTable parameter, so you can use
// it to pass in arbitrary data.
handlers.RoomEventRaised = function (args) {
    var eventData = args.Data;
    log.debug("Event Raised - Game: " + args.GameId + " Event Type: " + eventData.eventType);

    switch (eventData.eventType) {
        case "playerMove":
            processPlayerMove(eventData);
            break;

        default:
            break;
    }
};
