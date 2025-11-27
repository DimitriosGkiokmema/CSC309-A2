import "../styles/EventUpdates.css";
import {useState, useEffect} from "react";
import { useParams } from "react-router-dom";
import {callBackend} from "../js/backend.js";
import { useLocation } from 'react-router-dom';
import {useNavigate} from 'react-router-dom';

export default function EventUpdates() {
    const {eventId} = useParams(); //pass eventId through the navigate path
    const loc = useLocation(); // get values from the caller (navigate)
    const state = loc.state;
    const navigate = useNavigate();

    // set patch payload values from the form
    const [name, setName] = useState(null);
    const [description, setDescription] = useState(null);
    const [location, setLocation] = useState(null);
    const [startTime, setStartTime] = useState(null)
    const [endTime, setEndTime] = useState(null);
    const [capacity, setCapacity] = useState(null);
    const [points, setPoints] = useState(null);
    const [published, setPublished] = useState(null);
    const [guestid, setGuestId] = useState(null);
    const [organizerid, setOrganizerId] = useState(null);
    const [guest, setGuest] = useState(null);
    const [organizer, setOrganizer] = useState(null);
    const [addGuest, setAddGuest] = useState(null);
    const [removeGuest, setRemoveGuest] = useState(null);
    const [addOrganizer, setAddOrganizer] = useState(null);
    const [removeOrganizer, setRemoveOrganizer] = useState(null);


    const [message, setMessage] = useState("");
    const [listMessage, setList] = useState("");
    const [user, setUser] = useState(null); //get the current user so you can check clearance

    useEffect(() => {
        // fetch current user
        async function load() {
            const me = await callBackend('GET', '/users/me', {});
            if (!me.ok) return; // user not logged in or error
            setUser(me.data);
        }
        load();
    }, []);


    async function updateEvent(e) {
        // call PATCH /events/:id  
        e.preventDefault();
        const payload = {
            name: name && name.trim() !== "" ? name.trim() : null,
            description: description && description.trim() !== "" ? description.trim() : null,
            location: location && location.trim() !== "" ? location.trim() : null,
            startTime: startTime ? new Date(startTime).toISOString() : null,
            endTime: endTime ? new Date(endTime).toISOString() : null,
            capacity: capacity ? Number(capacity) : null,
            points : points ? Number(points) : null,
            published,
        };

        // console.log(payload);

        // check for white space as well
        const changed = (payload.name !== null || payload.description !== null || payload.location !== null || payload.startTime !== null ||
            payload.endTime !== null || payload.capacity !== null || payload.points !== null || payload.published !== null);
       
        let sameName = true;
        let sameLocation = true;
        
        // check if the entered values are the same as stored data
        if(name) {
            sameName = state.name === name; 
        }
        if(location) {
            sameLocation = state.location === location;
        }
        // console.log(changed);

        // API call
        const res = await callBackend("PATCH", `/events/${eventId}`, payload);
        if (res.ok && changed) {
            if(Object.keys(res.data).length === 3 && sameLocation & sameName) {
                setMessage("Input values are the same as existing values.");
            }
            else {
                setMessage("Event updated successfully!"); // rn it doesnt show, navigates too fast
                navigate("/events");
            }
        }
        else if (!changed && res.status === 200) { // empty payload
            setMessage("Enter at least one field to update.");
        }
        else {
            setMessage("Event update failed: " + res.data.error); // 400 level errors
        }
     
        // add or remove guests/organizers
        if(guestid) {
            const res = await callBackend("GET", `/users/${guestid}`, {});
            if(res.ok) {
                setGuest(res.data);

                const payload = {
                    utorid: guest.utorid, //??
                }
                
                if(addGuest) {
                    const gt = await callBackend("POST", `/events/${eventId}/guests`, payload);
                    if(gt.ok) {
                        setList(`New guest added to event ${eventId}: ${state.name}`);
                    } 
                    else {
                        setList("Guest could not be added: " + gt.data.error);
                    }  
                }
                else {
                    const gt = await callBackend("DELETE", `/events/${eventId}/guests/${guestid}`, {});
                    if(gt.ok) {
                        setList(`Guest removed from event ${eventId}: ${state.name}`);
                    } 
                    else {
                        setList("Guest could not be removed: " + gt.data.error);
                    }  
                }
            }
        }

        if(organizerid) {
            const res = await callBackend("GET", `/users/${organizerid}`, {});
            if(res.ok) {
                setOrganizer(res.data);
                const payload = {
                    utorid: organizer.utorid, //??
                }
                
                if(addOrganizer) {
                    const gt = await callBackend("POST", `/events/${eventId}/organizer`, payload);
                }
                else {
                    const gt = await callBackend("DELETE", `/events/${eventId}/organizer/${organizerid}`, {});
                }
            }
        }



    }

    async function goBack() {
        navigate("/events");
    };


    if(user && user.role !== "manager") { //clearance, disable points and published
        return (
            <div>
                <h1>Event Updates</h1>
                <form className="event-update-form" onSubmit={updateEvent}>
                    <label>Name:</label>
                    <input id="name" type="text" onChange={(e) => setName(e.target.value)}/>
                    <br/>
                    <label>Description:</label>
                    <textarea id="description" type="text" onChange={(e) => setDescription(e.target.value)}/>
                    <br/>
                    <label>Location:</label>
                    <input type="text" onChange={(e) => setLocation(e.target.value)}/>
                    <br/>    
                    <label>Start:</label>
                    <input type="datetime-local" onChange={(e) => setStartTime(e.target.value)}/>
                    <br/>    
                    <label>End:</label>
                    <input type="datetime-local" onChange={(e) => setEndTime(e.target.value)}/>
                    <br/>  
                    <label>Capacity:</label>
                    <input type="number" onChange={(e) => setCapacity(e.target.value)}/>
                    <br/>
                    <label>Points:</label>
                    <input type="number" disabled onChange={(e) => setPoints(e.target.value)}/>
                    <br/>
                    <label className="checkbox">Published:</label>
                    <input type="checkbox" disabled onChange={(e) => setPublished(e.target.checked)}/>
    
                    <input className="submitButton" type="submit" value="Submit"></input> 
                    <input className="cancelButton" type="button" value="Cancel" onClick={goBack}></input>
                </form>
    
                <div className="message">{message}</div>
            </div>
        );
        
    }
    
    // only for managers!!
    return (
        <div>
            <h1>Event Updates</h1>
            <form className="event-update-form" onSubmit={updateEvent}>
                <label>Name:</label>
                <input id="name" type="text" placeholder="Enter a new event name" onChange={(e) => setName(e.target.value)}/>
                <br/>
                <label>Description:</label>
                <textarea id="description" type="text" placeholder="Enter a new event description" onChange={(e) => setDescription(e.target.value)}/>
                <br/>
                <label>Location:</label>
                <input type="text" placeholder="Enter a new event location" onChange={(e) => setLocation(e.target.value)}/>
                <br/>    
                <label>Start:</label>
                <input type="datetime-local" onChange={(e) => setStartTime(e.target.value)}/>
                <br/>    
                <label>End:</label>
                <input type="datetime-local" onChange={(e) => setEndTime(e.target.value)}/>
                <br/>  
                <label>Capacity:</label>
                <input type="number" onChange={(e) => setCapacity(e.target.value)}/>
                <br/>
                <label>Award points:</label>
                <input type="number" onChange={(e) => setPoints(e.target.value)}/>
                <br/>
                <label className="checkbox">Publish:</label>
                <input type="checkbox" onChange={(e) => setPublished(e.target.checked)}/>
                <br/>
                {/* {add organizers and guests, only managers can do this!} */}
                <label>Edit guest list (enter id#):</label>
                <input id="guestid" type="number" onChange={(e) => setGuestId(e.target.value)}></input>
                <span id="editGuests">
                    
                    <input id="addGuest" name ="guest" type="radio" onChange={(e) => setAddGuest(e.target.value)}></input>
                    <label htmlFor="addGuest">Add guest</label>
                    
                    <input id="removeGuest" name="guest" type="radio" onChange={(e) => setRemoveGuest(e.target.value)}></input>
                    <label htmlFor="removeGuest">Remove guest</label>
                </span>
                <br/>
                <label>Edit organizer list (enter id#):</label>
                <input id="organizerid" type="number" onChange={(e) => setOrganizerId(e.target.value)}></input>
                <span id="editOrganizers">
                    
                    <input id="addOrganizer" name ="organizer" type="radio" onChange={(e) => setAddOrganizer(e.target.value)}></input>
                    <label htmlFor="addOrganizer">Add organizer</label>
                    
                    <input id="removeOrganizer" name="organizer" type="radio" onChange={(e) => setRemoveOrganizer(e.target.value)}></input>
                    <label htmlFor="removeOrganizer">Remove organizer</label>
                </span>
                <br/>
                <input className="submitButton" type="submit" value="Submit"></input> 
                <input className="cancelButton" type="button" value="cancel" onClick={goBack}></input>
            </form>

            <div className="message">{message}</div>
        </div>
    );
}
