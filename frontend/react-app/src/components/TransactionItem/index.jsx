import "./style.css";
import { useEffect, useState } from "react";
import { callBackend } from "../../js/backend"; 
import {useNavigate} from "react-router-dom";
import { useUser } from "../UserContext";

function TransactionItem({ id, utorid, awarded, amount, earned, spent, sender, type, remark, relatedEventId, relatedTxId }) {
    const [user, setUser] = useState(null); // check the user's role
    const navigate = useNavigate();
    const {role} = useUser();

    useEffect(() => {
                // fetch user info
                async function load() {
                    const me = await callBackend('GET', '/users/me', {});
                    if (!me.ok) return; // user not logged in or error
                    setUser(me.data);
                }
                
                load();
        }, []);

    async function handleUpdate(e) {
        e.preventDefault();
        // redirect to update page (form)
        navigate(`/transaction-updates/${id}`, {state: {utorid, id}});
    }

    // console.log("amount: " + amount);
    // console.log("awarded points: " + awarded);
    // console.log("related id: " + relatedEventId);

    
    let updateInfo;

    // const clearance = user && user.role === "manager";
    // if(clearance) {
    //     updateInfo = <button className="updateButton" onClick={handleUpdate}>Edit</button>
    // }
    
    if(role === "manager") {
        updateInfo = <button className="updateButton" onClick={handleUpdate}>Edit</button>
    }

    if(type === "event") {
        return (
        <div className="transaction-item row">
            <div className="col userInfo">
                <p><strong>Transaction {id}:</strong></p>
                <p><strong>Utorid: {utorid}</strong></p>
                {updateInfo}
            </div>
            <div className="col-6 transInfo">
                <div>
                    <p><strong>Type:</strong></p>
                    <p className="typeEvent">{type}</p>
                </div>
                <div>
                    
                    <p><strong>Awarded:</strong></p>
                    <p>{awarded}</p>
                </div>
                <div>
                    <p><strong>Related event (id):</strong></p>
                    <p>{relatedEventId}</p>
                </div>
                {remark !== "" && (
                    <div>
                        <p><strong>Remark:</strong></p>
                        <p>{remark}</p>
                    </div>
                )}
            </div>
        </div>
      )
    }

    else if (type === "purchase") {
        return (
        <div className="transaction-item row">
            <div className="col userInfo">
                <p><strong>Transaction {id}:</strong></p>
                <p><strong>Utorid: {utorid}</strong></p>
                {updateInfo}
            </div>
            <div className="col-5 transInfo">
                <div>
                    <p><strong>Type:</strong></p>
                    <p className="typePurchase">{type}</p>
                </div>
                <div>
                    
                    <p><strong>Earned points:</strong></p>
                    <p>{earned}</p>
                    
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
      )
    }

    else if(type === "adjustment") {
        return (
        <div className="transaction-item row">
            <div className="col userInfo">
                <p><strong>Transaction {id}:</strong></p>
                <p><strong>Utorid: {utorid}</strong></p>
                {updateInfo}
            </div>
            <div className="col-4 transInfo">
                <div>
                    <p><strong>Type:</strong></p>
                    <p className="typeAdjustment">{type}</p>
                </div>
                <div>
                    
                    <p><strong>Adjusted points:</strong></p>
                    <p>{amount}</p>
                </div>
                <div>
                    <p><strong>Related Transaction (id):</strong></p>
                    <p>{relatedTxId}</p>
                </div>
                {remark !== "" && (
                    <div>
                        <p><strong>Remark:</strong></p>
                        <p>{remark}</p>
                    </div>
                )}
            </div>
        </div>
      )
    }

    else if(type === "redemption") {
        return (
        <div className="transaction-item row">
            <div className="col userInfo">
                <p><strong>Transaction {id}:</strong></p>
                <p><strong>Utorid: {utorid}</strong></p>
                {updateInfo}
            </div>
            <div className="col-4 transInfo">
                <div>
                    <p><strong>Type:</strong></p>
                    <p className="typeRedemption">{type}</p>
                </div>
                <div>
                    
                    <p><strong>Redeemed points:</strong></p>
                    <p>{amount}</p>
                </div>
                {remark !== "" && (
                    <div>
                        <p><strong>Remark:</strong></p>
                        <p>{remark}</p>
                    </div>
                )}
            </div>
        </div>
      )
    }

    else { // transfers
        return (
        <div className="transaction-item row">
            <div className="col userInfo">
                <p><strong>Transaction {id}:</strong></p>
                <p><strong>Utorid: {utorid}</strong></p>
                {updateInfo}
            </div>
            <div className="col-4 transInfo">
                <div>
                    <p><strong>Type:</strong></p>
                    <p className="typeTransfer">{type}</p>
                </div>
                <div>
                    
                    <p><strong>Transferred points:</strong></p>
                    <p>{amount}</p>
                </div>
                <div>
                    <p><strong>Sender:</strong></p>
                    <p>{sender}</p>
                </div>
                {remark !== "" && (
                    <div>
                        <p><strong>Remark:</strong></p>
                        <p>{remark}</p>
                    </div>
                )}
            </div>
        </div>
      )
    }

}

export default TransactionItem;