import { useState } from "react";
import { Link } from 'react-router-dom';
import { callBackend } from '../../js/backend.js';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header>
      <div>
        <img className="navLogo" src="../src/assets/varsity_logo.png" />
        <h1 className="websiteTitle">Varsity Mart</h1>
      </div>

      <div>
        <div className="pageLinks">
          <Link to="/search">Transactions</Link>
          <Link to="/search">Events</Link>
          <Link to="/search">Promotions</Link>
        </div>

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
                <Link to="/profile" onClick={() => setOpen(!open)}>Profile</Link>
                <p>Sign In</p>
              </div>
            </div>

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
          </div>
        )}
      </div>
    </header>
  );
}

function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const body = {"utorid": user, "password": pass};

    callBackend("POST", 'users', body, '');
}