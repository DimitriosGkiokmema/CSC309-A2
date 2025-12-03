import "./style.css";
import { useEffect, useState } from "react";
import { callBackend } from "../../js/backend"; 
import {useNavigate} from "react-router-dom";
import {useLocation} from 'react-router-dom';

function TransactionItem({ id, utorid, awarded, amount, earned, spent, recipient, sender, type, remark, relatedEventId, relatedTxId }) {
    const [user, setUser] = useState(null); // check the user's role
    const navigate = useNavigate();
    const loc = useLocation();

    useEffect(() => {
                // fetch user info
                async function load() {
                    const me = await callBackend('GET', '/users/me', {});
                    if (!me.ok) return; // user not logged in or error
                    setUser(me.data);
                }
                
                load();
        }, []);

    // useEffect(() => {
    //     // when a user clicks on the transactions link in the navbar, loads all events again
    //     if (loc.pathname === "/transactions") {
    //         // reset search state
           
    //     }
    // }, [loc]);


    async function handleUpdate(e) {
        e.preventDefault();
        // redirect to event update page (form)
        navigate(`/transaction-updates/${id}`, {state: {utorid, id}});
    }


    // const [message, setMessage] = useState("");

    // if(type === "purchase") {
    //     if(amount !== earned) {
    //         setMessage("This transaction is suspicious");
    //     }
    // }

    console.log("amount: " + amount);
    console.log("awarded points: " + awarded);
    console.log("related id: " + relatedEventId);

    let updateInfo;

    const clearance = user && user.role === "manager";
    if(clearance) {
        updateInfo = <button className="updateButton" onClick={handleUpdate}>Edit</button>
    }

    if(type === "event") {
        return (
        <div className="transaction-item row">
            <div className="col userInfo">
                <p>Transaction {id}</p>
                <p><strong>{utorid}</strong></p>
                {updateInfo}
            </div>
            <div className="col-4 transInfo">
                <div>
                    <p>Type:</p>
                    <p>{type}</p>
                </div>
                <div>
                    
                    <p>Awarded:</p>
                    <p>{awarded}</p>
                </div>
                <div>
                    <p>Related event (id):</p>
                    <p>{relatedEventId}</p>
                </div>
                {remark !== "" && (
                    <div>
                        <p>Remark:</p>
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
                <p>Transaction {id}</p>
                <p><strong>{utorid}</strong></p>
            </div>
            <div className="col-4 transInfo">
                <div>
                    <p>Type:</p>
                    <p>{type}</p>
                </div>
                <div>
                    
                    <p>Earned points:</p>
                    <p>{earned}</p>
                    
                </div>
                <div>
                    <p>Spent:</p>
                    <p><i className="fa-solid fa-dollar-sign"></i>{spent}</p>
                </div>
                {remark !== "" && (
                    <div>
                        <p>Remark:</p>
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
                <p>Transaction {id}</p>
                <p><strong>{utorid}</strong></p>
            </div>
            <div className="col-4 transInfo">
                <div>
                    <p>Type:</p>
                    <p>{type}</p>
                </div>
                <div>
                    
                    <p>Adjusted points:</p>
                    <p>{amount}</p>
                </div>
                <div>
                    <p>Related Transaction (id):</p>
                    <p>{relatedTxId}</p>
                </div>
                {remark !== "" && (
                    <div>
                        <p>Remark:</p>
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
                <p>Transaction {id}</p>
                <p><strong>{utorid}</strong></p>
            </div>
            <div className="col-4 transInfo">
                <div>
                    <p>Type:</p>
                    <p>{type}</p>
                </div>
                <div>
                    
                    <p>Redeemed points:</p>
                    <p>{amount}</p>
                </div>
                {/* <div>
                    <p>Related Transaction (id):</p>
                    <p><i className="fa-solid fa-dollar-sign"></i>{relatedId}</p>
                </div> */}
                {remark !== "" && (
                    <div>
                        <p>Remark:</p>
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
                <p>Transaction {id}</p>
                <p><strong>{utorid}</strong></p>
            </div>
            <div className="col-4 transInfo">
                <div>
                    <p>Type:</p>
                    <p>{type}</p>
                </div>
                <div>
                    
                    <p>Transferred points:</p>
                    <p>{amount}</p>
                </div>
                <div>
                    <p>Sender:</p>
                    <p>{sender}</p>
                </div>
                <div>
                    <p>Recipient:</p>
                    <p>{recipient}</p>
                </div>
                {remark !== "" && (
                    <div>
                        <p>Remark:</p>
                        <p>{remark}</p>
                    </div>
                )}
            </div>
        </div>
      )
    }

}

export default TransactionItem;