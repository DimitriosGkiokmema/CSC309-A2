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
                <p>Transaction {id}</p>
                <p><strong>{utorid}</strong></p>

                <input
                    type="checkbox"
                    id={`redeem-${id}`}
                    onChange={handleRedeem}
                />
                <label htmlFor={`redeem-${id}`}>Redeem Transaction</label>
            </div>

            <div className="col-4 transInfo">
                <div>
                    <p>Type:</p>
                    <p>{type}</p>
                </div>
                <div>
                    <p>Amount:</p>
                    <p>{amount}</p>
                </div>
                <div>
                    <p>Spent:</p>
                    <p><i className="fa-solid fa-dollar-sign"></i> {spent}</p>
                </div>

                {remark !== "" && (
                    <div>
                        <p>Remark:</p>
                        <p>{remark}</p>
                    </div>
                )}
            </div>
        </div>
    );
}