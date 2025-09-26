import { shiprocketRequest } from "../utils/externalApi.js";

// 1. Courier Serviceability
export async function checkCourierServiceability(req, res) {
    try {
        const { pickup_postcode, delivery_postcode, weight } = req.body;

        const apiResp = await shiprocketRequest(
            `/courier/serviceability/?pickup_postcode=${pickup_postcode}&delivery_postcode=${delivery_postcode}&weight=${weight}`,
            "GET"
        );

        return res.json({ success: true, data: apiResp.data });
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ success: false, message: "Serviceability check failed" });
    }
}

// 2. Create Order
export async function createOrder(req, res) {
    try {
        const orderPayload = req.body; // frontend se validate kar ke bhejna
        const apiResp = await shiprocketRequest("/orders/create/adhoc", "POST", orderPayload);

        return res.json({ success: true, data: apiResp.data });
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ success: false, message: "Order creation failed" });
    }
}

// 3. Generate Label
export async function generateLabel(req, res) {
    try {
        const { shipment_id } = req.body;
        const apiResp = await shiprocketRequest("/courier/generate/label", "POST", { shipment_id });

        return res.json({ success: true, data: apiResp.data });
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ success: false, message: "Label generation failed" });
    }
}

// 4. Pickup Request
export async function requestPickup(req, res) {
    try {
        const { shipment_id } = req.body;
        const apiResp = await shiprocketRequest("/courier/generate/pickup", "POST", { shipment_id });

        return res.json({ success: true, data: apiResp.data });
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ success: false, message: "Pickup request failed" });
    }
}

// 5. Track Order
export async function trackOrder(req, res) {
    try {
        const { awb } = req.query;
        const apiResp = await shiprocketRequest(`/courier/track/awb/${awb}`, "GET");

        return res.json({ success: true, data: apiResp.data });
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ success: false, message: "Tracking failed" });
    }
}
