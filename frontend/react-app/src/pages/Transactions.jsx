import "../styles/allTransactions.css";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { callBackend } from '../js/backend.js';
import TransactionItem from "../components/TransactionItem";
import { useUser } from "../components/UserContext";

export default function Transactions() {
    const [user, setUser] = useState(null);
    const [search, setSearch] = useState(false);
    const [transactions, setTransactions] = useState(null);
    const loc = useLocation();
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [suspicious, setSuspicious] = useState("");
    const [createdBy, setCreatedBy] = useState("");
    const [amount, setAmount] = useState("");
    const [operator, setOperator] = useState("");
    const [type, setType] = useState("");
    const [txId, setTxId] = useState("");

    const {role} = useUser();

    const [mytransactions, setMyTx] = useState(null);
    const [related, setRelatedId] = useState("");
    const [promo, setPromotionId] = useState("");

    // const [page, setPage] = useState(1);
    const [query, setQuery] = useState("");
    const [limit, setLimit] = useState(5);
    const [order, setOrder] = useState(null);
    const [totalPages, setTotalPages] = useState(1); //default only one page
    const [currentPage, setCurrentPage] = useState(1);

    const [message, setMessage] = useState("");

     useEffect(() => {
            // fetch user info
            setSearch(false);  // reset search state
            setQuery("");          // FULL RESET
            setCurrentPage(1);
            setLimit(5);
            setMessage("");

            async function loadUser() {
                const me = await callBackend('GET', '/users/me', {});
                if (!me.ok) return; // user not logged in or error
                setUser(me.data);
    
            }
            
            loadUser();
            
    }, []);

    // fetch user info
    async function loadTransactions() {
        // Get all transactions data
        setMessage("");
        setSearch(null);
        let res;
        if(query) {
            console.log("im here");
            res = await callBackend('GET', `/transactions?page=${currentPage}&limit=${limit}&${query}`, {});
        }
        else {
            console.log("no im here");
            res = await callBackend('GET', `/transactions?page=${currentPage}&limit=${limit}`, {});
        }

        if(res.status !== 200) {
                console.log("im also here");
                setSearch(false);
                console.log(res.data.error);
                if(role === "manager") {
                    setMessage("Transaction not found: " + res.data.error);
                }
            }
        else if (res.data.results.length === 0) {
            console.log("but really i am here");
            console.log("there is a returned array but it is empty: " + res.data.results.length)
            setMessage("Transaction not found");
        }
        else {
            setSearch(false);
            console.log(res.data.count);
            if(limit) {
                setTotalPages(Math.ceil(res.data.count / limit)); // if total pages > 1, then show the navigation bar on the bottom of the page
            }
            setTransactions(res.data.results); // put the single event in an array
        }

    }

    async function myTransactions() {
        setMessage("");
        let res;

        if(query) {

            res = await callBackend('GET', `/users/me/transactions?page=${currentPage}&limit=${limit}&${query}`, {});
        }
        else {
            res = await callBackend('GET', `/users/me/transactions?page=${currentPage}&limit=${limit}`, {});
        }
        //console.log("there is a returned array but it is empty: " + res.data.results.length === 0)
        console.log(query);
        console.log(res.status);
        if(res.status !== 200) {
            setSearch(false);
            if(role !== "manager") {
                setMessage("Transaction not found: " + res.data.error);
            }
            if(message) {
                console.log("there is message");
            }
        }
        else if (res.data.results.length === 0) {
            //console.log("HELLO");
            //console.log("there is a returned array but it is empty: " + res.data.results.length)
            setMessage("Transaction not found");
        }
        else {
            if(!message) {
                console.log("there is no message");
                console.log(res.data.results.length);
            }
            if(limit) {
                setTotalPages(Math.ceil(res.data.count / limit)); // if total pages > 1, then show the navigation bar on the bottom of the page
            }
            setMyTx(res.data.results);
        }
    }

    useEffect(() => {

        // if(user && user.role === "manager" && role === "manager") {
        //     loadTransactions();
        // }

        // else if (user && user.role !== "manager" && role !== "manager") {
        //     myTransactions();
        // }

         loadTransactions();
         myTransactions();
    }, [user, currentPage, limit, query]);

    useEffect(() => {
        // when a user clicks on the events link in the navbar, loads all events again
        if (loc.pathname === "/transactions") {
            setSearch(false);  // reset search state
            setQuery("");          // FULL RESET
            setCurrentPage(1);
            setLimit(5);
            setMessage("");    
        }
    }, [loc.key]);

    async function handleSearch(e) {
            e.preventDefault();
            setMessage("");
    
            // if you get to this point then there must be at least one transaction that loaded
            // const txId = document.getElementById("searchInput").value;
            if(txId && txId.trim() !== "") {
                setTxId(txId);
                const res = await callBackend("GET", `/transactions/${txId}`, {});
                console.log(res.data);
                if(res.status === 404) {
                    setSearch(true);
                    setMessage("Transaction not found, please try again.");
                }
                else {
                    console.log(res.data);
                    setSearch(true);
                    setTransactions([res.data]); // put the single tx in an array
                }
            }
              
        }

    async function handleFilter(e) {
         e.preventDefault();
         setMessage("");
         setCurrentPage(1);

         const searchBar = document.getElementById("searchInput");
         if(searchBar !== null) {
             searchBar.value = ""; //resets whatever was in the search bar back to placeholder when you click filter button
         }
         const params = new URLSearchParams();

        if(name && name.trim() !== "") {
            params.append("name", name.trim());
        }

        if(createdBy && createdBy.trim() !== "") {
            params.append("createdBy", createdBy.trim());
        }

        if(amount && operator) {
            params.append("amount", amount);
            params.append("operator", operator);
        }

        if(suspicious) {
            params.append("suspicious", suspicious);
        }

        if(type) {
            params.append("type", type);
        }

        if(related) {
            params.append("relatedId", related);
        }

        if(promo) {
            params.append("promotionId", promo);
        }

        if(order && order !== null) {
            params.append("order", order);
        }

       
        
        console.log("the current limit is: " + limit);
        const query = params.toString();
        setQuery(query);

        // console.log(query);
        setName("");
        setCreatedBy("");
        setOperator("");
        setAmount("");
        setSuspicious("");
        setOrder("");
        setType("");
        setRelatedId("");
        setPromotionId("");
        
    }

    
    async function goBack() {
        setTxId("");
        setSearch(false);
        setMessage("");
        setQuery("");
        setCurrentPage(1);
        
        navigate("/transactions");
        loadTransactions();
        
    };

    if(!user){return(<div>Loading...</div>);}

    if (role === "cashier" || role === "regular" || role === "superuser") {
        if(mytransactions === null) {
            return (
                <div>
                    <h1>My Transactions</h1>
                    <div>Loading...</div>
                </div>
            );
        }
        else {
            // if(!search) {

                return (
                    <div>
                        <h1>My Transactions</h1>
                        
                        
                        <div className="filterOptions">
                                
                                <input id="filterId" type="number" placeholder="Related ID" value={related} onChange={(e) => {setRelatedId(e.target.value)}}></input>
                                <input id="filterPromo" type="number" placeholder="Promotion ID" value={promo} onChange={(e) => {setPromotionId(e.target.value)}}></input>
                                <span>
                                    <select value ={operator} onChange={(e) => {setOperator(e.target.value)}}>
                                        <option selected>choose</option>
                                        <option value={"lte"} >&le;</option>
                                        <option value={"gte"}>&ge;</option>
                                    </select>
                                    <input id="filterAmount" type="number" placeholder="Amount" value={amount} onChange={(e) => {setAmount(e.target.value)}}></input>
                                </span>
            
                                <select id="filterType" value={type} onChange={(e) => {setType(e.target.value)}}>
                                    <option selected>Transaction Type</option>
                                    <option value={"purchase"}>Purchase</option>
                                    <option value={"adjustment"}>Adjustment</option>
                                    <option value={"transfer"}>Transfer</option>
                                    <option value={"event"}>Event</option>
                                </select>
                                
                                <select id="filterOrder" value={order} onChange={(e) => {setOrder(e.target.value)}}>
                                    <option selected>Order By</option>
                                    <option value={"amount"}>Amount</option> 
                                    <option value={"type"}>Transaction Type</option> 
                                </select>
            
                                {/* pagination */}
                                <select value={limit} onChange={(e) => {setLimit(Number(e.target.value))}}>
                                    <option value={1}>1 per page</option>
                                    <option value={2}>2 per page</option>
                                    <option value={5} selected>5 per page</option>
                                    <option value={10}>10 per page</option>
                                </select>
            
                                <input type="button" value="Filter" onClick={handleFilter}></input>
                            </div>

                            <p className="error">{message}</p>
        
                            {mytransactions.map(tx => (
                                <TransactionItem
                                    id={tx.id}
                                    utorid={tx.utorid}
                                    awarded={tx.awarded} // for events
                                    amount={tx.amount} // for adjustments, purchases, negative for redemption and sending transfers
        
                                    earned={tx.earned} // for purchases 
                                    spent={tx.spent} // for purchases
                                   
                                    sender={tx.sender} // transfer
                                    type={tx.type} // transfer
                                    remark={tx.remark} 
        
                                    relatedEventId={tx.relatedEventId} // for events and adjustments (related tx)
                                    relatedTxId={tx.relatedTxId}
                                />
                        ))}

                        {/* pagination navbar  */}
                        <div className="pagenav">
                            <button id="prevBtn" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>&lt;</button>
                            <span>{currentPage} of {totalPages}</span>
                            <button id="nextBtn" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>&gt;</button>
                        </div>

                    </div>
                )
            }
            
    }
    
    //this is only for managers (all transactions)
    else if(role === "manager") {
        if(transactions === null) {
            return (
                <div>
                    <h1>All Transactions</h1>
                    <div>Loading...</div>
                </div>
            );
        }
        else {
            if(!search) {
                return (
                    
                    <div>
                        <h1>All Transactions</h1>
                        <div className="txSearch">
                            <input
                                id="searchInput"
                                type="number"
                                placeholder="Search transactions by id..."
                                value={txId}
                                onChange={(e) => {setTxId(e.target.value)}}
                            />
                            <input type="button" value="Search" onClick={handleSearch}/>
                        </div>
        
                        {/* filter bar */}
                        <div className="filterOptions">
                            
                            <input id="filterName" type="text" placeholder="utorid" value={name} onChange={(e) => {setName(e.target.value)}}></input>
                            <input id="filterCreatedBy" type="text" placeholder="Created by" value={createdBy} onChange={(e) => {setCreatedBy(e.target.value)}}></input>
                            <span>
                                <select onChange={(e) => {setOperator(e.target.value)}}>
                                    <option selected >Choose</option> 
                                    <option value={"lte"} >&le;</option>
                                    <option value={"gte"}>&ge;</option>
                                </select>
                                <input id="filterAmount" type="number" placeholder="Amount" value={amount} onChange={(e) => {setAmount(e.target.value)}}></input>
                            </span>
        
                            <select id="filterType" value={type} onChange={(e) => {setType(e.target.value)}}>
                                <option selected>Transaction Type</option>
                                <option value={"purchase"}>Purchase</option>
                                <option value={"adjustment"}>Adjustment</option>
                                <option value={"transfer"}>Transfer</option>
                                <option value={"event"}>Event</option>
                                <option value={"redemption"}>Redemption</option>
                            </select>
        
                            <div id="suspicious">
                                <input id="filterSuspicious" type="checkbox" value={suspicious} onChange={(e) => {setSuspicious(e.target.checked)}}></input>
                                <label>Suspicious</label>
                            </div>
                            
                            <select id="filterOrder" value ={order} onChange={(e) => {setOrder(e.target.value)}}>
                                <option selected>Order By</option>
                                <option value={"utorid"}>Utorid</option>
                                <option value={"amount"}>Amount</option> 
                            </select>
        
                            {/* pagination */}
                            <select value={limit} onChange={(e) => {setLimit(Number(e.target.value))}}>
                                <option value={1}>1 per page</option>
                                <option value={2}>2 per page</option>
                                <option value={5} selected>5 per page</option>
                                <option value={10}>10 per page</option>
                            </select>
        
                            <input type="button" value="Filter" onClick={handleFilter}></input>
                        </div>
                        
                        <p className="error">{message}</p>
                        
                        {transactions.map(tx => (
                            <TransactionItem
                                id={tx.id}
                                utorid={tx.utorid}
                                awarded={tx.awarded} // for events
                                amount={tx.amount} // for adjustments, purchases, negative for redemption and sending transfers
        
                                earned={tx.earned} // for purchases 
                                spent={tx.spent} // for purchases
                                
                                sender={tx.sender} // transfer
                                type={tx.type} // transfer
                                remark={tx.remark} 
        
                                relatedEventId={tx.relatedEventId} // for events and adjustments (related tx)
                                relatedTxId={tx.relatedTxId}
                            />
                        ))}
                    
                    {/* pagination navbar  */}
                    <div className="pagenav">
                        <button id="prevBtn" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>&lt;</button>
                        <span>{currentPage} of {totalPages}</span>
                        <button id="nextBtn" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>&gt;</button>
                    </div>
                
                    </div>
                
                    );
            }
            // single event
            else if (search && !message) {
                return (
                    <div>
                        <h1>Transaction #{transactions[0].id}</h1>
        
                        <div className="txSearch">
                            <input
                                id="searchInput"
                                type="number"
                                placeholder="Search transactions by id..."
                                value={txId}
                                onChange={(e) => {setTxId(e.target.value)}}
                            />
                            {/* search for a new transaction */}
                            <input type="button" value="Search" onClick={handleSearch}/> 
                            <input type="button" value="Go back" onClick={goBack}></input>
                            
                        </div>
        
                        {transactions.map(tx => (
                            <TransactionItem
                                id={tx.id}
                                utorid={tx.utorid}
                                awarded={tx.awarded} // for events
                                amount={tx.amount} // for adjustments, purchases, negative for redemption and sending transfers
        
                                earned={tx.earned} // for purchases 
                                spent={tx.spent} // for purchases
                                
                                sender={tx.sender} // transfer
                                type={tx.type} // transfer
                                remark={tx.remark} 
        
                                relatedEventId={tx.relatedEventId} // for events and adjustments (related tx)
                                relatedTxId={tx.relatedTxId}
                            />
                        ))}
                    </div>
                )
            }
            // no event found, error message
            else {
                return (
                <div>
                        <h1>Transaction #{txId}</h1>
        
                        <div className="txSearch">
                            <input
                                id="searchInput"
                                type="number"
                               placeholder="Search transactions by id..."
                                value={txId}
                                onChange={(e) => {setTxId(e.target.value)}}
                            />
                            {/* search for a new event */}
                            <input type="button" value="Search" onClick={handleSearch}/> 
                            <input type="button" value="Go back" onClick={goBack}></input>
                            
                        </div>
        
                        {/* filter bar */}
                        
        
                        <p className="error">{message}</p>
                    </div> 
                )
            }
        }

    }



    // Loaded but empty
    if (transactions.length === 0) {
        return (
            <div>
                <h1>All Transactions</h1>
                <div >No transactions at this time</div>
            </div>
        );
    }

};