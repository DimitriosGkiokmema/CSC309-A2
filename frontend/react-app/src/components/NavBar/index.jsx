import { useState } from "react";
import { Link, useNavigate  } from 'react-router-dom';
import { callBackend, log_in } from '../../js/backend.js';
import { useUser } from "../UserContext/index.jsx";
import { Image } from '@imagekit/react';

export default function Navbar() {
  const { role, setRole, pic, setPic } = useUser();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(
    localStorage.getItem("loggedIn") === "true"
  );
  const [allowedRoles, setRoles] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const allRoles = ['superuser', 'manager', 'cashier', 'regular'];
    const body = {"utorid": user, "password": pass};
    const { ok, data } = await log_in(body);
    localStorage.setItem("token", ok ? data.token : "");

    const curr_user = (await callBackend('GET', '/users/me', {})).data;
    setRole(curr_user.role);

    if (ok) {
      setRoles(
        allRoles.slice(
            allRoles.indexOf(curr_user.role)
        )
      );
      setLoggedIn(true);
      setOpen(false);
      
      if (curr_user.avatarUrl !== null) {
        setPic(curr_user.avatarUrl);
      }

      navigate('/profile');
    } else {
      alert("Invalid Credentials");
    }
  }

  function getProfilePic() {
    // const pic = (await callBackend("GET", "/users/me", {})).data.avatarUrl;
    if (!loggedIn || pic === "") {
      return  "../src/assets/profile.png";
    }

    return pic;
  }

  return (
    <header>
      <div onClick={() => navigate("/")}>
        <img className="navLogo" src="../src/assets/varsity_logo.png" />
        <h1 className="websiteTitle">Varsity Mart</h1>
      </div>

      <div></div>

      <div>
        {/* Show these pages if logged in */}
        {loggedIn && (
          <div className="featureContainer">
            <div className="pageLinks">
              <Link to="/search">Transactions</Link>
              <Link to="/search">Events</Link>
              <Link to="/search">Promotions</Link>
            </div>
            <div className="roleLevel">
              <label for="fruitSelect">Switch View:</label>
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
                  <Link to="/profile" onClick={() => setOpen(!open)}>Profile</Link>
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
                  <input type="text" className="log-input" id="password" required />
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
