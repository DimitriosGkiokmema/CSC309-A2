import "../styles/CreateEvent.css";
import {useState, useEffect} from "react";

import {callBackend} from "../js/backend.js";
import { useLocation } from 'react-router-dom';
import {useNavigate} from 'react-router-dom';

export default function CreateEvent() {
    
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
    
    const [message, setMessage] = useState("");
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
            points : points ? Number(points) : null
            
        };

        console.log(payload);

        // check for white space as well
        // const changed = (payload.name !== null || payload.description !== null || payload.location !== null || payload.startTime !== null ||
        //     payload.endTime !== null || payload.capacity !== null || payload.points !== null);
    

        // API call
        const res = await callBackend("POST", `/events`, payload);
        if (res.ok) {
                setMessage("Event updated successfully!"); // rn it doesnt show, navigates too fast
                //navigate("/events");
            }
        
        else {
            setMessage("Event creation failed: " + res.data.error); // 400 level errors
        }
     
    }

    async function goBack() {
        navigate("/events");
    };


  
    return (
        <div>
            <h1>New Event</h1>
            <form className="event-create-form" onSubmit={updateEvent}>
                <label>Name:</label>
                <input id="name" type="text" required onChange={(e) => setName(e.target.value)}/>
                <br/>
                <label>Description:</label>
                <textarea id="description" type="text" required onChange={(e) => setDescription(e.target.value)}/>
                <br/>
                <label>Location:</label>
                <input type="text" required onChange={(e) => setLocation(e.target.value)}/>
                <br/>    
                <label>Start:</label>
                <input type="datetime-local" required onChange={(e) => setStartTime(e.target.value)}/>
                <br/>    
                <label>End:</label>
                <input type="datetime-local" required onChange={(e) => setEndTime(e.target.value)}/>
                <br/>  
                <label>Capacity:</label>
                <input type="number" onChange={(e) => setCapacity(e.target.value)}/>
                <br/>
                <label>Points:</label>
                <input type="number" required onChange={(e) => setPoints(e.target.value)}/>
                <br/>

                <input className="submitButton" type="submit" value="Submit"></input> 
                <input className="cancelButton" type="button" value="Cancel" onClick={goBack}></input>
            </form>

            <div className="message">{message}</div>
        </div>
    );
}