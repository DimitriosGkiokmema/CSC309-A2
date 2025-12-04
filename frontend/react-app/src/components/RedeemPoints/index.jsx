import { useState, useEffect } from "react";
import { callBackend } from '../../js/backend.js';

export default function Redeem() {
    //const [userId, setRecipientId] = useState("");
    const [amount, setAmount] = useState("");
    const [remark, setRemark] = useState("");
    const [message, setMessage] = useState("");
    //const [user, setUser] = useState(null);

    // useEffect(() => {
    //     async function load() {
    //         const me = await callBackend('GET', '/users/me', {});
    //         if (!me.ok) 
    //             {console.log(me.data.error);
    //             return; // user not logged in or error
    //             }
    //         setUser(me.data);
    //         }

    //         load();
    // }, [])


    async function handleSubmit(e) {
        e.preventDefault();
        console.log("remark:" + remark);

        const payload = {
            type: "redemption",
            amount: Number(amount),
            remark: remark && remark.trim() !== "" ? remark.trim(): null,
        }

        let res = await callBackend("POST", `/users/me/transactions`, payload);
        if(res.status !== 201) {
            setMessage(res.data.error);
        }
        else {
            setMessage("Redemption was successful!")
        }

        //setRecipientId("");
        setAmount("");
        setRemark("");

        setTimeout(() => {
            setMessage("");           
        }, 1500); // 1.5 seconds

    }


    return (
        <form className="transactionForm" onSubmit={handleSubmit}>
            <h1>Redeem My Points</h1>

            {/* Required: Spent */}
            <div className="formRow">
                <label className="formLabel">Amount to redeem</label>
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