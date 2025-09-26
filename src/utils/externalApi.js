// utils/shiprocketClient.js
import axios from "axios";

let cachedToken = null;
let tokenExpiry = null;

export async function getShiprocketToken() {
    if (cachedToken && Date.now() < tokenExpiry) {
        console.log("✅ Using cached token");
        return cachedToken;
    }
console.log('process.env.SHIPROCKET_EMAIL,',process.env.SHIPROCKET_EMAIL);
    console.log("🔑 Requesting new Shiprocket token...");
    const response = await axios.post("https://apiv2.shiprocket.in/v1/external/auth/login", {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
    });

    cachedToken = response.data.token;
    tokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
    console.log("✅ New token cached:", cachedToken);
    return cachedToken;
};

export async function shiprocketRequest(endpoint, method = "GET", data = null) {
    const token = await getShiprocketToken();

    return axios({
        url: `https://apiv2.shiprocket.in/v1/external${endpoint}`,
        method, 
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        data,
    });
};
