import { useState } from "react";
import { Link, useNavigate  } from 'react-router-dom';
import { log_in } from '../../js/backend.js';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(
    localStorage.getItem("loggedIn") === "true"
  );


  async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const body = {"utorid": user, "password": pass};
    const { ok, data } = await log_in(body);

    if (ok) {
      localStorage.setItem("token", data.token);
      setLoggedIn(true);
      setOpen(false);
      navigate('/profile');
    } else {
      alert("Invalid Credentials");
    }
  }

  return (
    <header>
      <div onClick={() => navigate("/")}>
        <img className="navLogo" src="../src/assets/varsity_logo.png" />
        <h1 className="websiteTitle">Varsity Mart</h1>
      </div>

      <div>
        {/* Show these pages if logged in */}
        {loggedIn && (
          <div className="pageLinks">
            <Link to="/search">Transactions</Link>
            <Link to="/search">Events</Link>
            <Link to="/search">Promotions</Link>
          </div>
        )}
        

        {/* Profile icon only */}
        <div className="profileIcon" onClick={() => setOpen(!open)}>
          <img src="../src/assets/profile.png" />
        </div>

        {/* Dropdown menu */}
        {open && (
          <div className="profileDropdown">
            <div className="profileIcon">
              <img src="../src/assets/profile.png" />
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
