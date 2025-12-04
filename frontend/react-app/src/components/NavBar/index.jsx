import { useState } from "react";
import { Link, useNavigate  } from 'react-router-dom';
import { callBackend, log_in } from '../../js/backend.js';
import { useUser } from "../UserContext/index.jsx";

export default function Navbar() {
  const { role, setRole, pic, setPic, loadingRole } = useUser();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(
    sessionStorage.getItem("loggedIn") === "true"
  );
  const [allowedRoles, setRoles] = useState(['superuser', 'manager', 'cashier', 'regular']);

  async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const allRoles = ['superuser', 'manager', 'cashier', 'regular'];
    const body = {"utorid": user, "password": pass};
    const { ok, data } = await log_in(body);
    sessionStorage.setItem("token", ok ? data.token : "");
    console.log("auth token: ", sessionStorage.getItem("token"))

    const curr_user = (await callBackend('GET', '/users/me', {})).data;
    setRole(curr_user.role);
    console.log("logged in user: ", curr_user)

    if (ok) {
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("loggedIn", "true");

      setRoles(
        allRoles.slice(
            allRoles.indexOf(curr_user.role)
        )
      );
      setLoggedIn(true);
      setOpen(false);
      
      if (curr_user.avatarUrl !== null) {
        console.log("SETTING PF PIC: ", curr_user.avatarUrl)
        setPic(curr_user.avatarUrl);
      }

      navigate('/profile');
    } else {
      sessionStorage.setItem("token", "");
      sessionStorage.setItem("loggedIn", "false");
      alert("Invalid Credentials");
    }
  }

  function getProfilePic() {
    // const pic = (await callBackend("GET", "/users/me", {})).data.avatarUrl;
    if (!loggedIn || pic === "" || pic === undefined) {
      return  "../src/assets/profile.png";
    }

    return pic;
  }
  
  function handleLogout() {
    sessionStorage.setItem("token", "");
    sessionStorage.setItem("loggedIn", "false");
    setLoggedIn(false);
    setRole("");
    setOpen(false);
    navigate('/');
  }

  if (loadingRole) {
    return <div>Loading...</div>;
  }

  return (
    <header >
      {/* Navbar is here */}
      <div onClick={() => navigate("/")}>
        <img className="navLogo" src="../../../src/assets/varsity_logo.png" />
        <h1 className="websiteTitle">Varsity Mart</h1>
      </div>

      {/* DO NOT DELETE EMPTY DIV: needed for styling to work */}
      <div></div>

      <div>
        {/* Show these pages if logged in */}
        {loggedIn && (
          <div className="featureContainer">
            <div className="pageLinks">
              <Link to="/users">Users</Link>
              <Link to="/promotions">Promotions</Link>
              <Link to="/search">Transactions</Link>
              <Link to="/events">Events</Link>
              <Link to="/event-new">New Event</Link>
              <Link to="/registration">Registration</Link>
            </div>
            <div className="roleLevel">
              <label for="roleSelect">Switch View:</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="" disabled>-- Select a role --</option>
                  {allowedRoles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* Profile icon only */}
        <div className="profileIcon" onClick={() => setOpen(!open)}>
          <img src={getProfilePic()} />
        </div>

        {/* Dropdown menu */}
        {open && (
          <div className="profileDropdown">
            <div className="profileIcon">
              <div className="picContainer">
                <img src={getProfilePic()} />
              </div>
              <i className="fa-regular fa-circle-xmark" onClick={() => setOpen(!open)}></i>
            </div>

            <div className="infoContainer">
              <div>
                {loggedIn &&  (
                  <>
                  <Link to="/profile" onClick={() => setOpen(!open)}>Profile</Link>
                  <button onClick={handleLogout}>Log Out</button>
                  </>
                )}
                {!loggedIn && (
                  <p>Sign In</p>
                )}
              </div>
            </div>

            {!loggedIn && (
              <form id="loginForm" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="username" className="log-label">Utorid:</label>
                  <label htmlFor="password" className="log-label">Password:</label>
                  <button className="log-btn" type="submit">Log In</button>
                </div>
                <div>
                  <input type="text" className="log-input" id="username" required />
                  <input type="password" className="log-input" id="password" required />
                </div>

              </form>
            )}
          </div>
        )}
      </div>
    </header>
  );
}