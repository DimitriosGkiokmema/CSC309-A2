import { useEffect, useState } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { callBackend } from '../js/backend.js';
import EventItem from "../components/EventItem/EventItem.jsx";
import "../styles/Events.css"

export default function Events() {
    const [events, setEvents] = useState(null);
    const [message, setMessage] = useState("");
    const [search, setSearch] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    async function handleSearch(e) {
        e.preventDefault();
        setMessage("");
        setSearch(false);
        // if you get to this point then there must be at least one event that loaded
        const eventId = document.getElementById("searchInput").value;
        if(eventId.trim() !== "") {

            const res = await callBackend("GET", `/events/${eventId}`, {});
            if(res.status === 404) {
                setSearch(true);
                setMessage("Event not found, please try again.");
            }
            else {
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
        let events = await callBackend('GET', '/events', {});
        setEvents(events.data.results);
    }
    
    useEffect(() => {
        // when a user clicks on the events link in the navbar, loads all events again
        if (location.pathname === "/events") {
            setSearch(false);  // reset search state
            load();
        }
    }, [location]);

    useEffect(() => {
            // fetch user info
            async function load() {
                const me = await callBackend('GET', '/users/me', {});
                if (!me.ok) return; // user not logged in or error
                setUser(me.data);
    
            }
            
            load();
    }, []);

    //clearance
    let addEvent;
    const clearance = user && user.role === "manager";
    if(clearance) {
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

if(!search) {
    return (
        
        <div>
            <h1>All Events</h1>
            <div className="eventSearch">
                <input
                    id="searchInput"
                    type="number"
                    placeholder="Search events by id..."
                />
                <input type="button" value="Search" onClick={handleSearch}/>
                {addEvent}
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
                />
            ))}
    
        </div>
    
        );
}
else if (search && !message) {
    return (
        <div>
            <h1>{events[0].name}</h1>

            <div className="eventSearch">
                <input
                    id="searchInput"
                    type="number"
                    placeholder="Search events..."
                />
                {/* search for a new event */}
                <input type="button" value="Search" onClick={handleSearch}/> 
                {addEvent}
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
                />
            ))}
        </div>
    )
}
else {
    return (
       <div>
            <h1>{events[0].name}</h1>

            <div className="eventSearch">
                <input
                    id="searchInput"
                    type="number"
                    placeholder="Search events..."
                />
                {/* search for a new event */}
                <input type="button" value="Search" onClick={handleSearch}/> 
                {addEvent}
            </div>

            <p className="error">{message}</p>
        </div> 
    )
}

}