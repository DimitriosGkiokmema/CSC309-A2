import "./style.css";
import { useState } from "react";
import { callBackend } from '../../js/backend.js';

export default function Transfer() {
    const [userId, setRecipientId] = useState("");
    const [amount, setAmount] = useState("");
    const [remark, setRemark] = useState("");
    const [message, setMessage] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        console.log("remark:" + remark);

        const payload = {
            type: "transfer",
            amount: Number(amount),
            remark: remark && remark.trim() !== "" ? remark.trim(): null,
        }

        let res = await callBackend("POST", `/users/${userId}/transactions`, payload);
        if(res.status !== 201) {
            setMessage(res.data.error);
        }
        else {
            setMessage("Transfer was successful!")
        }

        setRecipientId("");
        setAmount("");
        setRemark("");

        setTimeout(() => {
            setMessage("");           
        }, 1500); // 1.5 seconds

    }


    return (
        <form className="transactionForm" onSubmit={handleSubmit}>
            <h1>Transfer Points</h1>
            {/* Required: Utorid */}
            <div className="formRow">
                <label className="formLabel">Recipient id</label>
                <input
                    className="formInput"
                    value={userId}
                    type="number"
                    onChange={e => setRecipientId(e.target.value)}
                    placeholder="20"
                    required
                />
            </div>

            {/* Required: Spent */}
            <div className="formRow">
                <label className="formLabel">Amount to transfer</label>
                <input
                    className="formInput"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="50"
                    type="number"
                    required
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
            <div>
                {message}
            </div>
            <button className="formButton" type="submit">Submit</button>
        </form>
    );

}