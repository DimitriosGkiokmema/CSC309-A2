import { useState } from "react";
import { callBackend } from '../../js/backend.js';
import "./style.css";

export default function CreateItem() {
    const [utorid, setUtorid] = useState("");
    const [spent, setSpent] = useState("");
    const [promotionIds, setPromotionIds] = useState("");
    const [remark, setRemark] = useState("");
    const [message, setMessage] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();

        if (!utorid.trim()) {
            alert("Utorid is required");
            return;
        }

        if (!spent || isNaN(spent) || Number(spent) <= 0) {
            alert("Spent must be a positive number");
            return;
        }

        // Build request body
        const body = {
            utorid: utorid.trim(),
            type: "purchase",
            spent: Number(spent),
        };

        // Add optional values ONLY if provided
        if (promotionIds.trim()) {
            body.promotionIds = promotionIds
                .split(",")
                .map(x => x.trim())
                .filter(x => x.length > 0);
        }

        if (remark.trim()) {
            body.remark = remark.trim();
        }

        let res = await callBackend("POST", "/transactions", body);
        if(res.status === 400) {
            setMessage(res.data.error);
        }
        else {
            setMessage("Purchase created!");
        }

        // Clear fields
        setUtorid("");
        setSpent("");
        setPromotionIds("");
        setRemark("");

        setTimeout(() => {
            setMessage("");           
        }, 1500); // 1.5 seconds
        
    }

    return (
        <form className="transactionForm" onSubmit={handleSubmit}>
            <h1>Create Purchase</h1>
            {/* Required: Utorid */}
            <div className="formRow">
                <label className="formLabel">Customer Utorid</label>
                <input
                    className="formInput"
                    value={utorid}
                    type="text"
                    onChange={e => setUtorid(e.target.value)}
                    placeholder="alice123"
                    required
                />
            </div>

            {/* Required: Spent */}
            <div className="formRow">
                <label className="formLabel">Amount Spent ($)</label>
                <input
                    className="formInput"
                    value={spent}
                    onChange={e => setSpent(e.target.value)}
                    placeholder="12.50"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                />
            </div>

            {/* Optional: Promotion IDs */}
            <div className="formRow">
                <label className="formLabel">Promotion IDs</label>
                <input
                    className="formInput"
                    value={promotionIds}
                    type="text"
                    onChange={e => setPromotionIds(e.target.value)}
                    placeholder="promo123,promoABC"
                />
            </div>

            {/* Optional: Remark */}
            <div className="formRow">
                <label className="formLabel">Remark</label>
                <input
                    className="formInput"
                    value={remark}
                    onChange={e => setRemark(e.target.value)}
                    placeholder="Optional remark"
                />
            </div>
             {message}
            <button className="formButton" type="submit">Submit</button>
        </form>
    );
}