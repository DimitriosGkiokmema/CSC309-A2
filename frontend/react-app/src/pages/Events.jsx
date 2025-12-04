import { useEffect, useState } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { callBackend } from '../js/backend.js';
import EventItem from "../components/EventItem/EventItem.jsx";
import "../styles/Events.css"
import { useUser } from "../components/UserContext";

export default function Events() {
    const [events, setEvents] = useState(null);
    const [message, setMessage] = useState("");
    const [search, setSearch] = useState(false);
    const loc = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [eventId, setEventId] = useState("");

    const {role} = useUser();

    const [name, setName] = useState(""); // string, text
    const [location, setLocation] = useState(""); //string, text
    const [started, setStart] = useState(""); //boolean, checkbox
    const [ended, setEnd] = useState(""); //boolean, checkbox  
    const [published, setPublished] = useState(""); //boolean, checkbox
    const [limit, setLimit] = useState(5);
    const [order, setOrder] = useState(null);
    const [query, setQuery] = useState("");
    const [totalPages, setTotalPages] = useState(1); //default only one page
    const [currentPage, setCurrentPage] = useState(1); //default starts on page 1
    // showFull, page: qpage, limit, 

    useEffect(() => {
            // fetch user info
            async function load() {
                const me = await callBackend('GET', '/users/me', {});
                if (!me.ok) return; // user not logged in or error
                setUser(me.data);
    
            }
            
            load();
    }, []);

    async function handleSearch(e) {
        e.preventDefault();
        setMessage("");


        // if you get to this point then there must be at least one event that loaded
        // const eventId = document.getElementById("searchInput").value;
        if(eventId && eventId.trim() !== "") {

            const res = await callBackend("GET", `/events/${eventId}`, {});
            console.log(res.data);
            if(res.status === 404) {
                setSearch(true);
                setMessage("Event not found, please try again.");
            }
            else {
                console.log(res.data);
                setSearch(true);
                setEvents([res.data]); // put the single event in an array
            }
        }
          
    }

    async function createEvent(e) {
        e.preventDefault();
        // redirect to create event page (form)
        navigate(`/event-new`);
    }

    // fetch user info
    async function load() {
        // Get all events data
        let res = await callBackend('GET', `/events?page=${currentPage}&limit=${limit}&${query}`, {});
        // setEvents(res.data.results);
        if(res.status !== 200) {
                setSearch(false);
                console.log(res.data.error);
                setMessage("Event not found: " + res.data.error);
            }
        else {
            setSearch(false);
            console.log(res.data.count);
            if(limit) {
                setTotalPages(Math.ceil(res.data.count / limit)); // if total pages > 1, then show the navigation bar on the bottom of the page
            }
            setEvents(res.data.results); // put the single event in an array
        }

    }

    useEffect(() => {
        if(!user) return;
        load();
    }, [user, currentPage, limit, query]);

    useEffect(() => {
        // when a user clicks on the events link in the navbar, loads all events again
        if (loc.pathname === "/events") {
            setSearch(false);
            setMessage("");
            setQuery("");
            setCurrentPage(1);
            setEventId("");
            // load();
        }
    }, [loc.key]);

     async function goBack() {
        setEventId("");
        setSearch(false);
        setMessage("");
        setQuery("");
        setCurrentPage(1);
        
        navigate("/events");
        load();
    };

    async function handleFilter(e) {
         e.preventDefault();
         setMessage("");
         setCurrentPage(1);
         const searchBar = document.getElementById("searchInput");
         searchBar.value = ""; //resets whatever was in the search bar back to placeholder when you click filter button
         const params = new URLSearchParams();

        if(name && name.trim() !== "") {
            params.append("name", name.trim());
        }

        if(location && location.trim() !== "") {
            params.append("location", location.trim());
        }

        if(started && started !== null) {
            params.append("started", started);
        }

        if(ended && ended !== null) {
            params.append("ended", ended);
        }

        if(published && published !== null) {
            params.append("published", published);
        }


        if(order && order !== null) {
            params.append("order", order);
        }
        
        console.log("the current limit is: " + limit);
        const query = params.toString();
        setQuery(query);

        console.log(query);

        setName("");
        setLocation("");
        setOrder("");
        setStart("");
        setEnd("");
        setPublished("");

        // const res = await callBackend("GET", `/events?${query}`, {});
        
    }

    // async function fetchPage(page) {
    //     // after user clicks on < or > button, the currentPage changes, limit is still whatever was set from the filter
    //     setCurrentPage(page);
    //     const params = new URLSearchParams();
    //     params.append("page", page);
    //     if(order) params.append("order", order);
    //     const newquery = query + "&" + params.toString();
    //     console.log(newquery);
    //     const res = await callBackend("GET", `/events?${newquery}`, {});
    //     if(res.status !== 200) {
    //             setSearch(false);
    //             console.log(res.data.error);
    //             setMessage("Event not found: " + res.data.error);
    //         }
    //         else {
    //             setSearch(false);
    //             setEvents(res.data.results); // put the single event in an array
    //         }
    // }


    //clearance
    let addEvent;
    // const clearance = user && user.role === "manager";
    // if(clearance) {
    //     addEvent = <button onClick={createEvent}>Add event</button>
    // }

    if(role === "manager") {
        addEvent = <button onClick={createEvent}>Add event</button>
    }

    if (events === null) {
        return (
            <div>
                <h1>All Events</h1>
                <div>Loading...</div>
            </div>
        );
    }

    // Loaded but empty
    if (events.length === 0) {
        return (
            <div>
                <h1>All Events</h1>
                <div >No events at this time</div>
            </div>
        );
    }
// all events
if(!search) {
    return (
        
        <div>
            <h1>All Events</h1>
            <div className="eventSearch">
                <input
                    id="searchInput"
                    type="number"
                    placeholder="Search events by id..."
                    value={eventId}
                    onChange={(e) => {setEventId(e.target.value)}}
                />
                <input type="button" value="Search" onClick={handleSearch}/>
                {addEvent}
            </div>

            {/* filter bar */}
            <div className="filterOptions">
                
                <input id="filterName" type="text" placeholder="Event name" value={name} onChange={(e) => {setName(e.target.value)}}></input>
                <input id="filterLocation" type="text" placeholder="Event location" value={location} onChange={(e) => {setLocation(e.target.value)}}></input>
                <div id="start">
                    <input id="filterStart" type="checkbox" value={started} onChange={(e) => {setStart(e.target.checked)}}></input>
                    <label>Started</label>
                </div>
                <div id="end">
                    <input id="filterEnd" type="checkbox" value={ended} onChange={(e) => {setEnd(e.target.checked)}}></input>
                    <label>Ended</label>
                </div>
                <div id="publish">
                    <input id="filterPublished" type="checkbox" value={published} onChange={(e) => {setPublished(e.target.checked)}}></input>
                    <label>Published</label>
                </div>
                
                <select value={order} onChange={(e) => {setOrder(e.target.value)}}>
                    <option disabled selected>Order By</option>
                    <option value={"name"}>Name</option>
                    <option value={"location"}>Location</option>
                    <option value={"description"}>Description</option>
                    <option value={"startTime"}>Start time</option>
                    <option value={"endTime"}>End time</option>
                    
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
            
            <p className="error">{message}</p>

            {events.map(event => (
                <EventItem
                    id={event.id}
                    name={event.name}
                    location={event.location}
                    startTime={event.startTime} 
                    endTime={event.endTime}
                    capacity={event.capacity} 
                    numGuests={event.numGuests} 
                    published={event.published}  
                    organizer={user && event.organizers.some(org => org.id === user.id)}  
                    profile={false}
                />
            ))}
        
        {/* pagination navbar */}
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
            <h1>{events[0].name}</h1>

            <div className="eventSearch">
                <input
                    id="searchInput"
                    type="number"
                    value={eventId}
                    placeholder="Search events..."
                    onChange={(e) => {setEventId(e.target.value)}}
                />
                {/* search for a new event */}
                <input type="button" value="Search" onClick={handleSearch}/> 
                <input type="button" value="Go back" onClick={goBack}></input>
            </div>

            {events.map(event => (
                <EventItem
                    id={event.id}
                    name={event.name}
                    location={event.location}
                    startTime={event.startTime} 
                    endTime={event.endTime}
                    capacity={event.capacity} 
                    numGuests={event.numGuests}  
                    published={event.published} 
                    organizer={user && event.organizers.some(org => org.id === user.id)}
                    profile={false}
                />
            ))}
        </div>
    )
}
// no event found, error message
else {
    return (
       <div>
            <h1>{events[0].name}</h1>

            <div className="eventSearch">
                <input
                    id="searchInput"
                    type="number"
                    placeholder="Search events..."
                    value={eventId}
                    onChange={(e) => {setEventId(e.target.value)}}
                />
                {/* search for a new event */}
                <input type="button" value="Search" onClick={handleSearch}/> 
                <input type="button" value="Go back" onClick={goBack}></input>
            </div>


            <p className="error">{message}</p>
        </div> 
    )
}




}