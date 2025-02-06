import Alpaca from '@alpacahq/alpaca-trade-api';
import {CryptoBar} from '@alpacahq/alpaca-trade-api/dist/resources/datav2/entityv2';

interface AlpacaOptions {
    keyId: string;
    secretKey: string;
    paper: boolean;
}

interface CryptoBarsOptions {
    start: string;
    end: string;
    timeframe: string;
}

interface ApiRequestBody {
    model: string;
    messages: { role: string; content: string }[];
}

const alpacaOptions: AlpacaOptions = {
    keyId: process.env.APCA_API_KEY_ID as string,
    secretKey: process.env.APCA_API_SECRET_KEY as string,
    paper: true
};

const alpaca = new Alpaca(alpacaOptions);

const options: CryptoBarsOptions = {
    start: "2025-01-25T00:00:00Z",
    end: "2025-02-05T23:59:59Z",
    timeframe: "1D"
};


(async () => {
    try {
        const bars = await alpaca.getCryptoBars(["BTC/USDT"], options);
        const btcBars: CryptoBar[] | undefined = bars.get("BTC/USDT");
        if (btcBars) {
            console.table(btcBars);
        }
        return btcBars;
    } catch (error) {
        console.error("Error fetching crypto bars:", error);
    }
})().then((btcBars) => {
    const apiRequestBody: ApiRequestBody = {
        model: "gpt-4o-mini",
        messages: [
            {role: "system", content: "Respond with an string 'BUY' for short 'SELL' for long and explain why in a short summary"},
            {
                role: "user",
                content: `Given historical market data for BTC/USDT, please analyze the following market indicators  
                Moving Averages (SMA/EMA), 
                Relative Strength Index (RSI), 
                Bollinger Bands, 
                and MACD,
                giving weight for each indicator to determine whether 
                I should submit a long or short position for the next day ${JSON.stringify(btcBars)}`
            }
        ]
    };

    fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(apiRequestBody)
    })
        .then((data) => data.json())
        .then((data) => {
            console.info("Conclusion:", (data.choices[0].message.content));
        });
});


export {AlpacaOptions, CryptoBarsOptions, CryptoBar, alpacaOptions, options};