import { useState } from "react";
import { callBackend } from '../../js/backend.js';
import "./style.css";

export default function CreateItem({ id, utorid, amount, type, spent, remark }) {
    const [visible, setVisible] = useState(true);

    if (!visible) return null;

    async function handleRedeem(e) {
        if (!e.target.checked) return;

        try {
            await callBackend("PATCH", `/transactions/${id}/processed`, {processed: true});
            setVisible(false);
            console.log("redeemed")
        } catch (err) {
            console.error("Redeem failed:", err);
            // Optionally uncheck the box if you want
            e.target.checked = false;
        }
    }

    return (
        <div className="transaction-item row">
            <div className="col userInfo">
                <p><strong>Transaction {id}:</strong></p>
                <p><strong>Utorid: {utorid}</strong></p>
                <div className="redeem-container">
                    <input
                        type="checkbox"
                        id="redeem"
                        onChange={handleRedeem}
                    />
                    <label htmlFor="redeem">Redeem Transaction</label>
                </div>
            </div>

            <div className="col-6 transInfo">
                <div>
                    <p><strong>Type:</strong></p>
                    <p id="typeColour">{type}</p>
                </div>
                <div>
                    <p><strong>Amount:</strong></p>
                    <p>{amount}</p>
                </div>
                <div>
                    <p><strong>Spent:</strong></p>
                    <p>${spent}</p>
                </div>

                {remark !== "" && (
                    <div>
                        <p><strong>Remark:</strong></p>
                        <p>{remark}</p>
                    </div>
                )}
            </div>
        </div>
    );
}