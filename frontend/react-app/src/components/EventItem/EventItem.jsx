import "./style.css";
import {useState, useEffect} from "react";
import { callBackend } from "../../js/backend"; 
import {useNavigate} from "react-router-dom";
import {useLocation} from 'react-router-dom';

function EventItem({ id, name, location, startTime, endTime, capacity, numGuests, published }) {
    const [user, setUser] = useState(null); // check the user's role
    const [message, setMessage] = useState("");
    const [guests, setGuests] = useState(numGuests);
    const navigate = useNavigate();
    const loc = useLocation();

    async function handleRSVP(e) {
        e.preventDefault();
        // try to rsvp for an event that is still open and available 
        // check that the the user isnt already a guest for this event, otherwise add them (POST)
        
        const res = await callBackend("POST", `/events/${id}/guests/me`, {});
        if(res.status === 400) {
            setMessage("You have already RSVPed to this event.");
        }
        else {
            setGuests(prev => prev + 1);
            setMessage("RSVP successful!");
        }  
    }

    async function handleUpdate(e) {
        e.preventDefault();
        // redirect to event update page (form)
        navigate(`/event-updates/${id}`, {state: {name, location}});
    }

    async function deleteItem() {
        //ask for confirmation
        const confirmed = window.confirm("Are you sure you want to delete this event?");
        if(confirmed) {
            const res = await callBackend("DELETE", `/events/${id}`, {});
            if(res.status === 204) {
                navigate("/events");
            }
        }
    }

    useEffect(() => {
            // fetch user info
            async function load() {
                const me = await callBackend('GET', '/users/me', {});
                if (!me.ok) return; // user not logged in or error
                setUser(me.data);
    
            }
            
            load();
    }, []);

    useEffect(() => {
        // when a user clicks on the events link in the navbar, loads all events again
        if (loc.pathname === "/events") {
            // reset search state
            setMessage("");
        }
    }, [loc]);

    //rsvp functionality
     let available;
     let spots;
    if(capacity === null) {
        available = true;
        spots = "Unlimited";
    }
    else {
        spots = capacity - guests;
        available = spots > 0;
    }
    const over = startTime < new Date().toISOString();
    const publish = published !== undefined;

    let rsvpInfo;
        if(over) {
            rsvpInfo = <p className="error">This event is over</p>
        } else if (!available) {
            console.log("this event has this many spots in total: " + capacity);
            console.log("this event has " + numGuests + " many guests");
            console.log("this event is available: " + available);
            console.log("this event has " + spots + " spots left")
            rsvpInfo = (
            <div>
                <button className="rsvp" disabled={true}>RSVP</button>
                <p className="error">This event is full</p>
            </div>
            )
        }
        
        else if(publish && !published) {
            rsvpInfo = <p className="error">This event is not available for booking</p>
        }    
        else {
                rsvpInfo = <button className="rsvp" onClick={handleRSVP}>RSVP</button>
            }   


    // event update/edit functionality, only for managers and superusers (TODO: need to add condition for organizers later)
    let updateInfo;

    const clearance = user && (user.role === "manager")

    if(clearance && !over) {
        updateInfo = <button className="updateButton" onClick={handleUpdate}>Edit</button>
    }

    let deleteIcon;
    
    if(publish && !published) {
        deleteIcon = (<span className="trashCan">
                <a onClick={deleteItem}>
                    <img src="../../../src/assets/trash.webp"/>
                </a>
            </span>)
    }

    return (
    <div className="event-item">
        <div className="col eventName">
            <p><strong>Event Name:</strong> {name}</p>
            <div className="conditional">
               
                {clearance && updateInfo}
                {clearance && deleteIcon}
                <br/>
                 {rsvpInfo}
            </div>
            {message && <p className="error">{message}</p>}
            
        </div>
        <div className="col-5 eventInfo">
            <div>
                <p><strong>Location:</strong></p>
                <p>{location}</p>
            </div>
            <div>
                <p><strong>Start:</strong></p>
                <p>{startTime}</p>
            </div>
            <div>
                <p><strong>End:</strong></p>
                <p>{endTime}</p>
            </div>
            <div>
                <p><strong>Spots left:</strong></p>
                <p>{spots}</p>
            </div>
        </div>

    </div>
  )
}

export default EventItem;
