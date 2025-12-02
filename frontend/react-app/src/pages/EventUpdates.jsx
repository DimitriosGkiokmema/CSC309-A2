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
    const [addGuest, setAddGuest] = useState(null);
    const [addOrganizer, setAddOrganizer] = useState(null);
    const [success, setSuccess] = useState(false);

    const [award, setAward] = useState("all");
    const [awardId, setAwardId] = useState(null);
    const [awardAmt, setAwardAmt] = useState(0);

    const [message, setMessage] = useState("");
    const [listMessage, setList] = useState("");
    const [pointsMsg, setPointsMsg] = useState("");
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

        // API call
        const res = await callBackend("PATCH", `/events/${eventId}`, payload);
        if (res.ok && changed) {
            if(Object.keys(res.data).length === 3 && sameLocation & sameName) {
                setMessage("Input values are the same as existing values.");
            }
            else {
                setSuccess(true);
                setMessage("Event updated successfully!"); // rn it doesnt show, navigates too fast
                
            }
        }
        else if (!changed && res.status === 200) { // empty payload
            setMessage("Enter at least one field to update.");
        }
        else {
            setMessage("Event update failed: " + res.data.error); // 400 level errors
        }
     
        // add or remove guests/organizers
        // console.log(`Guest id to edit: ${guestid}`);
        // console.log("Add a guest: " + addGuest);
        if(guestid) {
            const res = await callBackend("GET", `/users/${guestid}`, {});
            if(res.ok) {

                const fetchedGuest = res.data;
              
                if(addGuest) {
                    const gt = await callBackend("POST", `/events/${eventId}/guests`, {utorid: fetchedGuest.utorid});
                    if(gt.ok) {
                        
                        setSuccess(true);
                        setList(`New guest added to ${state.name} (id: ${eventId})`);
                        
                    } 
                    else {
                        setList("Guest could not be added: " + gt.data.error);
                    }  
                }
                else {
                    const gt = await callBackend("DELETE", `/events/${eventId}/guests/${guestid}`, {});
                    if(gt.ok) {
                        setSuccess(true);
                        setList(`Guest removed from ${state.name} (id: ${eventId})`);
                        
                    } 
                    else {
                        setList("Guest could not be removed: " + gt.data.error);
                    }  
                }
            }
            else {
                setList("Guest list could not be modified, user not found");
            }
        }

        if(organizerid) {
            const res = await callBackend("GET", `/users/${organizerid}`, {});
            if(res.ok) {
                const fetchedOrg = res.data;
                
                if(addOrganizer) {
                    const gt = await callBackend("POST", `/events/${eventId}/organizers`, {utorid: fetchedOrg.utorid});
                    if(gt.ok) {
                        setSuccess(true);
                        setList(`New organizer added to ${eventId} (id: ${state.name})`);
                    } 
                    else {
                        setList("Organizer could not be added: " + gt.data.error);
                    } 
                }
                else {
                    const gt = await callBackend("DELETE", `/events/${eventId}/organizers/${organizerid}`, {});
                    if(gt.ok) {
                        setSuccess(true);
                        setList(`Organizer removed from ${eventId} (id: ${state.name})`);
                    } 
                    else {
                        setList("Organizer could not be removed: " + gt.data.error);
                    } 
                }
            }
            else {
                setList("Organizer list could not be modified, user not found");
            }
        }

        // give points to guests
        if(award === "all") {
            // utorid is undefined
            if(awardAmt !== 0) {
                console.log("award amount is a number: " + (typeof parseInt(awardAmt) === "number"));
                const res = await callBackend("POST", `/events/${eventId}/transactions`, {type: "event", utorid: awardId, amount: parseInt(awardAmt)});
                if (res.ok) {
                    setSuccess(true);
                    setPointsMsg("All guests were awarded " + awardAmt + " points");
                }
                else {
                    setPointsMsg("No points awarded, " + res.data.error);
                }
            }
            else {
                setPointsMsg("No points awarded, please enter an amount");
            }
        }
        else {
            if(awardAmt !== 0) {
                const res = await callBackend("POST", `/events/${eventId}/transactions`, {type: "event", utorid: awardId, amount: parseInt(awardAmt)});
                if(res.ok) {
                    setSuccess(true);
                    setPointsMsg("Guest " + awardId + "was awarded " + awardAmt + " points");
                }
                else {
                    setPointsMsg("No points awarded, " + res.data.error);
                }
            }
            else {
                setPointsMsg("No points awarded, please enter an amount");
            }
        }

        if(success) {
            setTimeout(() => {
                    navigate("/events");
            }, 1500); // 1.5 seconds
        }

    }

    async function goBack() {
        if(state.profile) {
            navigate("/profile");
        }
        navigate("/events");
    };


    
    if (user && state.organizer && user.role !== "manager") {
        return (
        <div>
            <h1>Event Updates: {state.name}</h1>
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
                <input type="number" placeholder="Enter a new capacity" onChange={(e) => setCapacity(e.target.value)}/>
                <br/>
                <label>Award points:</label>
                <input type="number" placeholder="Enter a new points total" disabled onChange={(e) => setPoints(e.target.value)}/>
                <br/>
                <label className="checkbox">Publish:</label>
                <input type="checkbox" disabled onChange={(e) => setPublished(e.target.checked)}/>
                <br/>
                <hr/>
                {/* {add organizers and guests, only managers can do this!} */}
                <label>Add a guest:</label>
                <input id="guestid" type="number" placeholder="Enter id#" onChange={(e) => setGuestId(e.target.value)}></input>
                <span id="editGuests">
                    
                    <input id="addGuest" name ="guest" type="checkbox" checked={addGuest} onChange={(e) => setAddGuest(e.target.checked)}></input>
                    <label htmlFor="addGuest">Add guest</label>
                    
                </span>
                <br/>
                {/* award points to a single guest or all guests */}
                <hr/>
                <label>Award points to: </label>
                <select onChange={(e) => {setAward(e.target.value)}} value={award}>
                    <option value="all" selected>All guests</option>
                    <option value="single">Single guest</option>
                </select> 
                    <br/>
                    <label>Recipient:</label>
                    <input id="awardGuest" type="text" placeholder="Enter utorid" disabled={award === "all"} onChange={(e) => setAwardId(e.target.value)}></input>
                    <br/>
                    <label>Award Amount</label>
                    <input id="awardAmt" type="number" placeholder="Enter points to award" onChange={(e) => setAwardAmt(e.target.value)}></input>
                
                
                <br/><br/>
                <div className="formButtons">
                    <input className="submitButton" type="submit" value="Submit"></input> 
                    <input className="cancelButton" type="button" value="Cancel" onClick={goBack}></input>
                </div>
            </form>

            <div className="message">{message}</div>
            <div>{listMessage}</div>
            <div>{pointsMsg}</div>
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
                <input type="number" placeholder="Enter a new capacity" onChange={(e) => setCapacity(e.target.value)}/>
                <br/>
                <label>Award points:</label>
                <input type="number" placeholder="Enter a new points total" onChange={(e) => setPoints(e.target.value)}/>
                <br/>
                <label className="checkbox">Publish:</label>
                <input type="checkbox" onChange={(e) => setPublished(e.target.checked)}/>
                <br/>
                <hr/>
                {/* {add organizers and guests, only managers can do this!} */}
                <label>Edit guest list:</label>
                <input id="guestid" type="number" placeholder="Enter id#" onChange={(e) => setGuestId(e.target.value)}></input>
                <span id="editGuests">
                    
                    <input id="addGuest" name ="guest" type="radio" onChange={() => setAddGuest(true)}></input>
                    <label htmlFor="addGuest">Add guest</label>
                    
                    <input id="removeGuest" name="guest" type="radio" onChange={() => setAddGuest(false)}></input>
                    <label htmlFor="removeGuest">Remove guest</label>
                </span>
                <br/>
                <label>Edit organizer list:</label>
                <input id="organizerid" type="number" placeholder="Enter id#" onChange={(e) => setOrganizerId(e.target.value)}></input>
                <span id="editOrganizers">
                    
                    <input id="addOrganizer" name ="organizer" type="radio" onChange={() => setAddOrganizer(true)}></input>
                    <label htmlFor="addOrganizer">Add organizer</label>
                    
                    <input id="removeOrganizer" name="organizer" type="radio" onChange={() => setAddOrganizer(false)}></input>
                    <label htmlFor="removeOrganizer">Remove organizer</label>
                </span>
                <br/>
                {/* award points to a single guest or all guests */}
                <hr/>
                <label>Award points to: </label>
                <select onChange={(e) => {setAward(e.target.value)}} value={award}>
                    <option value="all" selected>All guests</option>
                    <option value="single">Single guest</option>
                </select> 
                    <br/>
                    <label>Recipient:</label>
                    <input id="awardGuest" type="text" placeholder="Enter utorid" disabled={award === "all"} onChange={(e) => setAwardId(e.target.value)}></input>
                    <br/>
                    <label>Award Amount</label>
                    <input id="awardAmt" type="number" placeholder="Enter points to award" onChange={(e) => setAwardAmt(e.target.value)}></input>
                
                
                <br/><br/>
                <div className="formButtons">
                    <input className="submitButton" type="submit" value="Submit"></input> 
                    <input className="cancelButton" type="button" value="Cancel" onClick={goBack}></input>
                </div>
            </form>

            <div className="message">{message}</div>
            <div>{listMessage}</div>
            <div>{pointsMsg}</div>
        </div>
    );
}
