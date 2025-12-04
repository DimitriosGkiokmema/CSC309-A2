import {useState, useEffect} from "react";
import { useParams } from "react-router-dom";
import {callBackend} from "../js/backend.js";
import { useLocation } from 'react-router-dom';
import {useNavigate} from 'react-router-dom';
import "../styles/TransactionUpdates.css";

export default function TransactionUpdates() {
    const {txId} = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null); //get the current user so you can check clearance
    const loc = useLocation();
    const state = loc.state;

    const [utorid, setName] = useState(null);
    const [amount, setPoints] = useState(null);
    const [suspicious, setSuspicious] = useState(null);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        // fetch current user
        async function load() {
            const me = await callBackend('GET', '/users/me', {});
            if (!me.ok) return; // user not logged in or error
            setUser(me.data);
        }
        load();
    }, []);

    async function updateTransaction(e) {
        e.preventDefault();
        //adjustment transaction

        const payload = {
            utorid: state.utorid,
            type: "adjustment",
            amount: amount ? Number(amount) : null,
            relatedId: state.id //original transaction that we are editing 
        };

        const changed = payload.amount !== null;
        if(!changed) {
            setMessage("Enter a point adjustment.");
        }
        else {
            let res = await callBackend("POST", "/transactions", payload);
            if(res.ok && changed) {
                setMessage("Adjustment successfull! " + state.utorid + "'s points were adjusted by " + payload.amount);
                //can be a positive or negative adjustment
            }
            else {
                setMessage("Transaction adjustment was not completed: " + res.data.error);
            }
        }
        console.log(suspicious);
        
        if(suspicious !== null) {
            let body = {suspicious : suspicious};
            let res = await callBackend("PATCH", `/transactions/${state.id}/suspicious`, body);
            console.log(res.data.error);
            if(res.ok) {
                setMessage("A transaction has been changed");
            }
            else {
                setMessage("Transaction change was not complete: ");
            }
        }
        
    }

    async function goBack() {
        navigate("/transactions");
    };
    
    return (
        <div>
            <h1>Transaction Adjustment: {state.utorid}(#{state.id})</h1>
            <form className="event-update-form" onSubmit={updateTransaction}>
                
                <label>Points:</label>
                <input type="number" placeholder="Enter how much to adjust" onChange={(e) => setPoints(e.target.value)}/>
                <br/>
                
                <hr/>
                <label>Suspicious?</label>
                {/* <input type="checkbox" onChange={(e) => setSuspicious(e.target.checked)}/> */}
                <span id="editSuspicious">
                    <input id="trueSuspicious" name ="suspicious" type="radio" onChange={() => setSuspicious(true)}></input>
                    <label htmlFor="trueSuspicious">Yes</label>
                    
                    <input id="falseSuspicious" name="suspicious" type="radio" onChange={() => setSuspicious(false)}></input>
                    <label htmlFor="falseSuspicious">No</label>
                </span>
                <br/><br/>
                <div className="formButtons">
                    <input className="submitButton" type="submit" value="Submit"></input> 
                    <input className="cancelButton" type="button" value="Cancel" onClick={goBack}></input>
                </div>
            </form>

            <div className="message">{message}</div>
            
        </div>
    );
}
    