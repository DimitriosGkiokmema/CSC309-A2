import "./style.css";
import {useState, useEffect} from "react";
import { callBackend } from "../../js/backend"; 
import {useNavigate} from "react-router-dom";
import {useLocation} from 'react-router-dom';
import { useUser } from "../UserContext";

function EventItem({ id, name, location, startTime, endTime, capacity, numGuests, published, organizer, profile }) {
    const [user, setUser] = useState(null); // check the user's role
    const [event, setEvent] = useState(null); 
    const [message, setMessage] = useState("");
    const [guests, setGuests] = useState(numGuests);
    const navigate = useNavigate();
    const loc = useLocation();
    //const [organizer, setOrganizer] = useState(false);

    const {role} = useUser();

    async function handleRSVP(e) {
        e.preventDefault();
        // try to rsvp for an event that is still open and available 
        // check that the the user isnt already a guest for this event, otherwise add them (POST)
        
        const res = await callBackend("POST", `/events/${id}/guests/me`, {});
        if(res.status !== 201) {
            setMessage(res.data.error);
        }
        else {
            setGuests(prev => prev + 1);
            setMessage("RSVP successful!");
        }  
    }

    async function handleUpdate(e) {
        e.preventDefault();
        // redirect to event update page (form)
        navigate(`/event-updates/${id}`, {state: {name, location, organizer, profile}});
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

    // so the message doesnt stay during pagination
    useEffect(() => {
        setMessage("");
    }, [id]);


    function formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return "N/A";
        try {
            const date = new Date(dateTimeStr);
            return date.toLocaleString();
        } catch (error) {
            return dateTimeStr;
        }
    }


    //rsvp functionality
     let available;
     let spots;
    if(capacity === null) {
        available = true;
        spots = "Unlimited";
    }
    else {
        console.log("numGuests: " + numGuests);
        console.log("capacity :" + capacity);
        spots = capacity - guests;
        available = spots > 0;
    }
    const over = startTime < new Date().toISOString();
    const publish = published !== undefined;

    let rsvpInfo;
        if(over) {
            rsvpInfo = <p className="error">This event is over</p>
        } else if (organizer) {
            rsvpInfo = <p className="error">Organizers are not able to rsvp for their own event</p>
        } else if (!available) {
         
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


    // event update/edit functionality, only for managers (TODO: need to add condition for organizers later)
    let updateInfo;
    
    const clearance = organizer;
    // if(role === "manager")      
    
    //console.log("user is an organizer: " + organizer + ", for event " + id);
    

    // if(clearance && !over) {
    //     updateInfo = <button className="updateButton" onClick={handleUpdate}>Edit</button>
    // }

    if(role === "manager" && !over)
    {
        updateInfo = <button className="updateButton" onClick={handleUpdate}>Edit</button>
    }

    if (role === "event organizer" && organizer && !over) {
        updateInfo = <button className="updateButton" onClick={handleUpdate}>Edit</button>
    }

    // if(clearance) {
    //     updateInfo = <button className="updateButton" onClick={handleUpdate}>Edit</button>
    // }

    let deleteIcon;
    
    if(publish && !published) {
        if(role === "manager") {
            deleteIcon = (<span className="trashCan">
                    <a onClick={deleteItem}>
                        <img src="/assets/trash.webp"/>
                    </a>
                </span>)
        }

    }

    return (
    <div className="event-item">
        <div className="col eventName">
            <p><strong>Event Name:</strong> {name}</p>
            <div className="conditional">
               
                {updateInfo}
                {deleteIcon}
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
                <p>{formatDateTime(startTime)}</p>
            </div>
            <div>
                <p><strong>End:</strong></p>
                <p>{formatDateTime(endTime)}</p>
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
