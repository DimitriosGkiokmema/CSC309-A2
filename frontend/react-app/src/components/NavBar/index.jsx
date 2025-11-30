import { useState } from "react";
import { Link, useNavigate  } from 'react-router-dom';
import { callBackend, log_in } from '../../js/backend.js';
import { useUser } from "../UserContext/index.jsx";

export default function Navbar() {
  const { role, setRole } = useUser();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(
    sessionStorage.getItem("loggedIn") === "true"
  );
  const [allowedRoles, setRoles] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const allRoles = ['superuser', 'manager', 'cashier', 'regular'];
    const body = {"utorid": user, "password": pass};
    const { ok, data } = await log_in(body);
    // localStorage.setItem("token", ok ? data.token : "");
    // localStorage.setItem("loggedIn", ok ? "true" : "false");
    if(ok) {
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("loggedIn", "true");
    } else {
      sessionStorage.setItem("token", "");
      sessionStorage.setItem("loggedIn", "false");
    }

    const curr_role = (await callBackend('GET', '/users/me', {})).data.role;
    setRole(curr_role);

    if (ok) {
      setRoles(
        allRoles.slice(
            allRoles.indexOf(curr_role)
        )
      );
      setLoggedIn(true);
      setOpen(false);
      navigate('/profile');
    } else {
      alert("Invalid Credentials");
    }
  }

  function handleLogout() {
    sessionStorage.setItem("token", "");
    sessionStorage.setItem("loggedIn", "false");
    setLoggedIn(false);
    setRole("");
    setOpen(false);
    navigate('/');
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
                  {allowedRoles?.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
              </select>
            </div>
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
