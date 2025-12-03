import { useEffect, useState } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { callBackend } from '../js/backend.js';
import TransactionItem from "../components/TransactionItem";

export default function Transactions() {
    const [user, setUser] = useState(null);
    const [search, setSearch] = useState(false);
    const [transactions, setTransactions] = useState(null);
    const loc = useLocation();
    const navigate = useNavigate();
    const [name, setName] = useState(false);
    const [suspicious, setSuspicious] = useState(false);
    const [createdBy, setCreatedBy] = useState(null);
    const [amount, setAmount] = useState(0);
    const [operator, setOperator] = useState(null);
    const [type, setType] = useState(null);

    const [mytransactions, setMyTx] = useState(null);
    const [related, setRelatedId] = useState(null);
    const [promo, setPromotionId] = useState(null);

    // const [page, setPage] = useState(1);
    const [query, setQuery] = useState("");
    const [limit, setLimit] = useState(5);
    const [order, setOrder] = useState(null);
    const [totalPages, setTotalPages] = useState(1); //default only one page
    const [currentPage, setCurrentPage] = useState(1);

    const [message, setMessage] = useState("");

     useEffect(() => {
            // fetch user info
            async function loadUser() {
                const me = await callBackend('GET', '/users/me', {});
                if (!me.ok) return; // user not logged in or error
                setUser(me.data);
    
            }
            
            loadUser();
            setMessage("");
    }, []);

    // fetch user info
    async function loadTransactions() {
        // Get all transactions data
        setMessage("");
        setSearch(null);
        let res = await callBackend('GET', `/transactions?page=${currentPage}&limit=${limit}&${query}`, {});
        // setTransactions(res.data.results);
        console.log(`page=${currentPage}&limit=${limit}&${query}`);
        // const res = await callBackend("GET", `/transactions?${query}`, {});
        if(res.status !== 200) {
                setSearch(false);
                console.log(res.data.error);
                setMessage("Transaction not found: " + res.data.error);
            }
        else if (res.data.results.length === 0) {
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
        let res = await callBackend("GET", `/users/me/transactions?page=${currentPage}&limit=${limit}&${query}`, {});
        //console.log("there is a returned array but it is empty: " + res.data.results.length === 0)
        console.log(query);
        console.log(res.status);
        if(res.status !== 200) {
            setSearch(false);
            setMessage("Transaction not found: " + res.data.error);
            if(message) {
                console.log("there is message");
            }
        }
        else if (res.data.results.length === 0) {
            console.log("there is a returned array but it is empty: " + res.data.results.length)
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
        if(user && user.role === "manager") {
            loadTransactions();
        }

        else {
            myTransactions();
        }
    }, [currentPage, limit, query]);

    useEffect(() => {
        // when a user clicks on the events link in the navbar, loads all events again
        if (loc.pathname === "/transactions") {
            setSearch(false);  // reset search state
            if(user && user.role === "manager") {
                
                loadTransactions();
            }
            else {
                if(user) {
                    const exists = true;
                    console.log("user exists: " + exists);
                }
                myTransactions();
            } 
        }
    }, [loc]);

    async function handleSearch(e) {
            e.preventDefault();
            setMessage("");
    
            // if you get to this point then there must be at least one transaction that loaded
            const txId = document.getElementById("searchInput").value;
            if(txId.trim() !== "") {
    
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

        

        // if(order && order !== null) {
        //     params.append("order", order);
        // }
        
        console.log("the current limit is: " + limit);
        const query = params.toString();
        setQuery(query);

        console.log(query);

        
    }

    async function addTx(e) {
         e.preventDefault();
         navigate("/transaction-new");
    }

    // async function fetchPage(page) {
    //     // after user clicks on < or > button, the currentPage changes, limit is still whatever was set from the filter
    //     setCurrentPage(page);
    //     const params = new URLSearchParams();
    //     params.append("page", page);
    //     // if(order) params.append("order", order);
    //     const newquery = query + "&" + params.toString();
    //     console.log(newquery);
    //     const res = await callBackend("GET", `/transactions?${newquery}`, {});
    //     if(res.status !== 200) {
    //             setSearch(false);
    //             console.log(res.data.error);
    //             setMessage("Transaction not found: " + res.data.error);
    //         }
    //         else {
    //             setSearch(false);
    //             setTransactions(res.data.results); // put the single event in an array
    //         }
    // }

   

    if(!user){return(<div>Loading...</div>);}

    if (user && user.role !== "manager") {
        if(mytransactions === null) {
            return (
                <div>
                    <h1>My Transactions</h1>
                    <div>Loading...</div>
                </div>
            );
        }
        else {
            if(!message && !search) {

                return (
                    <div>
                        <h1>My Transactions</h1>
                        
                        
                        <div className="filterOptions">
                                
                                <input id="filterName" type="number" placeholder="Related ID" onChange={(e) => {setRelatedId(e.target.value)}}></input>
                                <input id="filterCreatedBy" type="number" placeholder="Promotion ID" onChange={(e) => {setPromotionId(e.target.value)}}></input>
                                <span>
                                    <select onChange={(e) => {setOperator(e.target.value)}}>
                                        <option disabled selected>choose</option>
                                        <option value={"lte"} >&le;</option>
                                        <option value={"gte"}>&ge;</option>
                                    </select>
                                    <input id="filterName" type="number" placeholder="Amount" onChange={(e) => {setAmount(e.target.value)}}></input>
                                </span>
            
                                <select onChange={(e) => {setType(e.target.value)}}>
                                    <option disabled selected>Transaction Type</option>
                                    <option value={"purchase"}>Purchase</option>
                                    <option value={"adjustment"}>Adjustment</option>
                                    <option value={"transfer"}>Transfer</option>
                                    <option value={"event"}>Event</option>
                                </select>
                                
                                <select onChange={(e) => {setOrder(e.target.value)}}>
                                    <option disabled selected>Order By</option>
                                    <option value={"amount"}>Amount</option> 
                                    <option value={"type"}>Transaction Type</option> 
                                </select>
            
                                {/* pagination */}
                                <select onChange={(e) => {setLimit(Number(e.target.value))}}>
                                    <option value={1}>1 per page</option>
                                    <option value={2}>2 per page</option>
                                    <option value={5} selected>5 per page</option>
                                    <option value={10}>10 per page</option>
                                </select>
            
                                <input type="button" value="Filter" onClick={handleFilter}></input>
                            </div>
        
                            {mytransactions.map(tx => (
                                <TransactionItem
                                    id={tx.id}
                                    utorid={tx.utorid}
                                    awarded={tx.awarded} // for events
                                    amount={tx.amount} // for adjustments, purchases, negative for redemption and sending transfers
        
                                    earned={tx.earned} // for purchases 
                                    spent={tx.spent} // for purchases
                                    
                                    recipient={tx.recipient}
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
            else {
                return (
                <div>
                        <h1>My Transactions</h1>
        
                        {/* <div className="transactionSearch">
                            <input
                                id="searchInput"
                                type="number"
                                placeholder="Search transactions..."
                            />
                            {/* search for a new event */}
                            {/* <input type="button" value="Search" onClick={handleSearch}/>  */}
                            
                        {/* </div> */}
        
                        {/* filter bar */}
                        
        
                        <p className="error">{message}</p>
                    </div> 
                )
            }
        }
    }

      
    
    //this is only for managers (all transactions)
    else if(user && user.role === "manager") {
        if(transactions === null) {
            return (
                <div>
                    <h1>All Transactions</h1>
                    <div>Loading...</div>
                </div>
            );
        }
        else {
            if(!search && !message) {
                return (
                    
                    <div>
                        <h1>All Transactions</h1>
                        <div className="txSearch">
                            <input
                                id="searchInput"
                                type="number"
                                placeholder="Search transactions by id..."
                            />
                            <input type="button" value="Search" onClick={handleSearch}/>
                        </div>
        
                        {/* filter bar */}
                        <div className="filterOptions">
                            
                            <input id="filterName" type="text" placeholder="utorid" onChange={(e) => {setName(e.target.value)}}></input>
                            <input id="filterCreatedBy" type="text" placeholder="Created by" onChange={(e) => {setCreatedBy(e.target.value)}}></input>
                            <span>
                                <select onChange={(e) => {setOperator(e.target.value)}}>
                                    <option value={"lte"} selected >&lt;</option>
                                    <option value={"gte"}>&gt;</option>
                                </select>
                                <input id="filterName" type="number" placeholder="Amount" onChange={(e) => {setAmount(e.target.value)}}></input>
                            </span>
        
                            <select onChange={(e) => {setType(e.target.value)}}>
                                <option disabled selected>Transaction Type</option>
                                <option value={"purchase"}>Purchase</option>
                                <option value={"adjustment"}>Adjustment</option>
                                <option value={"transfer"}>Transfer</option>
                                <option value={"event"}>Event</option>
                            </select>
        
                            <div id="suspicious">
                                <input id="filterSuspicious" type="checkbox" onChange={(e) => {setSuspicious(e.target.checked)}}></input>
                                <label>Suspicious</label>
                            </div>
                            
                            <select onChange={(e) => {setOrder(e.target.value)}}>
                                <option disabled selected>Order By</option>
                                <option value={"utorid"}>Utorid</option>
                                <option value={"amount"}>Amount</option> 
                            </select>
        
                            {/* pagination */}
                            <select onChange={(e) => {setLimit(Number(e.target.value))}}>
                                <option value={1}>1 per page</option>
                                <option value={2}>2 per page</option>
                                <option value={5} selected>5 per page</option>
                                <option value={10}>10 per page</option>
                            </select>
        
                            <input type="button" value="Filter" onClick={handleFilter}></input>
                        </div>
                        
                        {/* <p className="error">{message}</p> */}
                        
                        {transactions.map(tx => (
                            <TransactionItem
                                id={tx.id}
                                utorid={tx.utorid}
                                awarded={tx.awarded} // for events
                                amount={tx.amount} // for adjustments, purchases, negative for redemption and sending transfers
        
                                earned={tx.earned} // for purchases 
                                spent={tx.spent} // for purchases
                                
                                recipient={tx.recipient}
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
                        <h1>{transactions[0].name}</h1>
        
                        <div className="transactionSearch">
                            <input
                                id="searchInput"
                                type="number"
                                placeholder="Search transactions..."
                            />
                            {/* search for a new event */}
                            <input type="button" value="Search" onClick={handleSearch}/> 
                            
                        </div>
        
                        {transactions.map(tx => (
                            <TransactionItem
                                id={tx.id}
                                utorid={tx.utorid}
                                awarded={tx.awarded} // for events
                                amount={tx.amount} // for adjustments, purchases, negative for redemption and sending transfers
        
                                earned={tx.earned} // for purchases 
                                spent={tx.spent} // for purchases
                                
                                recipient={tx.recipient}
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
                        <h1>{transactions[0].utorid}</h1>
        
                        <div className="transactionSearch">
                            <input
                                id="searchInput"
                                type="number"
                                placeholder="Search transactions..."
                            />
                            {/* search for a new event */}
                            <input type="button" value="Search" onClick={handleSearch}/> 
                            
                        </div>
        
                        {/* filter bar */}
                        
        
                        <p className="error">{message}</p>
                    </div> 
                )
            }
        }

    }




    // if(user && user.role === "manager") {

    //     return(
    //         <h1>All transactions</h1>
    //     )
    // }


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