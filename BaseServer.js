const Alpaca = require("@alpacahq/alpaca-trade-api");
const alpaca = new Alpaca(); // Environment Variables
const WebSocket = require('ws');

// const wss = new WebSocket("wss://stream.data.alpaca.markets/v1beta1/news");
const wss = new WebSocket("wss://stream.data.alpaca.markets/v1beta3/crypto/us");

wss.on('open', function () {
    console.log("Websocket connected!");

    // We now have to log in to the data source
    const authMsg = {
        action: 'auth',
        key: process.env.APCA_API_KEY_ID,
        secret: process.env.APCA_API_SECRET_KEY
    };

    wss.send(JSON.stringify(authMsg)); // Send auth data to ws, "log us in"

    // Subscribe to all news feeds
    const subscribeMsg = {
        action: 'subscribe',
        bars: ['BTC/USD'] // ["*"]
    };
    wss.send(JSON.stringify(subscribeMsg)); // Connecting us to the live data source
});

wss.on('message', async function (message) {
    console.log("Message is " + message);
    // message is a STRING
    const currentEvent = JSON.parse(message)[0];
    // "T": "n" newsEvent
    if (currentEvent.T === "b") { // This is bars event
        let companyImpact = 0;

        // Ask ChatGPT its thoughts on the bars
        const apiRequestBody = {
            "model": "gpt-4o-mini",
            "messages": [
                {role: "system", content: "Only respond with a number 1 for short 0 for long."},
                {
                    role: "user", content: "Given real time market data for open price: "
                        + currentEvent.o
                        + ", high price: " + currentEvent.h
                        + ", low price: " + currentEvent.l
                        + ", close price: " + currentEvent.c
                        + ", volume: " + currentEvent.v
                        + ", and symbol: " + currentEvent.s
                        + ", show me which if I should submit a long or short position considering best market indicators: "
                        + currentEvent
                }
            ]
        }
        await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(apiRequestBody)
        }).then((data) => {
            return data.json();
        }).then((data) => {
            // data is the ChatGPT response
            console.log(data);
            console.log(data.choices[0].message);
            companyImpact = parseInt(data.choices[0].message.content);
        });

        // Make trades based on the output (of the impact saved in companyImpact)
        const tickerSymbol = currentEvent.S;

        if (companyImpact === 1) {
            // Buy stock
            let order = await alpaca.createOrder({
                symbol: tickerSymbol,
                national: 10,
                side: 'buy',
                type: 'market',
                time_in_force: 'gtc' // day ends, it won't trade.
            });
            console.log("Bought stock: ", order);
        } else if (companyImpact === 0) {
            // Sell stock
            let closedPosition = alpaca.closePosition(tickerSymbol); //(tickerSymbol);
            console.log("Closed position: ", closedPosition);
        }
    }
});
