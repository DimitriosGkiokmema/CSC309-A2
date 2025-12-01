import { useEffect, useState } from "react";
import { callBackend, resetPassword } from '../js/backend.js';
import { jsonToQRUrl } from '../js/create_qr.js';
import '../styles/LandingPage.css';
import TransactionItem from "../components/TransactionItem";
import CreateItem from "../components/CreateItem";
import ProcessRedemption from "../components/ProcessRedemption";
import PieChart from "../components/PieChart";
import AdminDash from "../components/AdminDash";
import UsersListing from "../components/UsersListing/UsersListing.jsx";
import { useUser } from "../components/UserContext/useUser.js";

export default function LandingPage() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [redemptions, setRedemptions] = useState([]);
  const [startedEvents, setStartedE] = useState(0);
  const [endedEvents, setEndedE] = useState(0);
  const [startedPromos, setStartedP] = useState(0);
  const [endedPromos, setEndedP] = useState(0);
  const [edit, setEdit] = useState(false);
  const [qr_url, setQR] = useState('');
  const [formData, setFormData] = useState({});
  const { role, loadingRole } = useUser();
  console.log("User is ", role)

  useEffect(() => {
    // fetch user info
    async function load() {
      const me = await callBackend('GET', '/users/me', {});
      if (!me.ok) return; // user not logged in or error
      setUser(me.data);

      const userInfo = {
        name: me.data.name,
        utorid: me.data.utorid,
        email: me.data.email,
        birthday: me.data.birthday,
        password: me.data.password,
      };

      jsonToQRUrl(userInfo).then(url => {
        setQR(url);
      })
      setFormData(userInfo);

      const tx = await callBackend('GET', '/users/me/transactions', {});
      setTransactions(tx.data);

      const r = await callBackend('GET', '/users/me/transactions?type=redemption&relatedId=null', {});
      const filtered = r.data.results.filter(obj => obj.type === 'redemption');
      setRedemptions(filtered);

      // Get event data
      let started = await callBackend('GET', '/events?started=true', {});
      setStartedE(started.data.count);

      let ended = await callBackend('GET', '/events?ended=true', {});
      setEndedE(ended.data.count);

      // Get promo data
      started = await callBackend('GET', '/promotions?started=true', {});
      setStartedP(started.data.count);

      ended = await callBackend('GET', '/promotions?ended=false', {});
      setEndedP(ended.data.count);
    }

    load();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function handleSave() {
    const updates = {};

    // only return changed values
    for (const key in formData) {
      if (formData[key] !== user[key] && formData[key] !== "" && formData[key] !== null) {
        updates[key] = formData[key];
      }
    }
    console.log(updates);

    if (Object.keys(updates).length !== 0) {
      callBackend('PATCH', '/users/me', updates);
    }

    if (updates.password !== undefined) {
      resetPassword(user.utorid, updates['password']).then(res => {
        console.log(res.data);
      })
    }

    // setUser();
    jsonToQRUrl(user).then(url => {
      setQR(url);
    });
    setEdit(false);
  }

  if (!user || !transactions) {
    return (
    <div className="loggedOut">
      <h1>Please Log In!</h1>
    </div>
    );
  }

  return (
    <div className="page">
      <h1>User Profile</h1>

      <div className="row">
        <div className="col-8 offset-2 profileContainer">
          <div className="col-6 profileInfo">
            <div>
              <p><strong>Name:</strong></p>
              <p>{user.name}</p>
            </div>
            <div>
              <p><strong>Username:</strong></p>
              <p>{user.utorid}</p>
            </div>
            <div>
              <p><strong>Password:</strong></p>
              <p>{user.password}</p>
            </div>
            <div>
              <p><strong>Email:</strong></p>
              <p> {user.email}</p>
            </div>
            <div>
              <p><strong>Birthday:</strong></p>
              <p>{user.birthday || ''}</p>
            </div>
            <div>
              <p><strong>Points:</strong></p>
              <p> {user.points}</p>
            </div>
            <div>
              <p><strong>Role:</strong></p>
              <p> {user.role}</p>
            </div>
            <div>
              <div></div>
              <div className="editBtn" onClick={() => setEdit(!edit)}>
                <div>Edit</div>
                <i className="fa-regular fa-pen-to-square"></i>
              </div>
              <div></div>
            </div>
          </div>
          <div className="col-4">
            <div className="qrContainer">
              <img src={qr_url} />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Info */}
      {edit && (
        <div className="editModal">
          <div className="editBox">
            <h2>Edit Profile</h2>

            <label>Name:</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
            />

            <label>Username:</label>
            <input
              name="utorid"
              value={formData.utorid}
              onChange={handleChange}
            />

            <label>Password:</label>
            <input
              name="password"
              value={formData.password}
              onChange={handleChange}
            />

            <label>Email:</label>
            <input
              name="email"
              value={formData.email}
              onChange={handleChange}
            />

            <label>Birthday:</label>
            <input
              name="birthday"
              value={formData.birthday || ''}
              onChange={handleChange}
            />

            <div className="editActions">
              <button onClick={() => setEdit(false)}>Cancel</button>
              <button onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Dropdown menu */}
      {role === 'regular' && (
        <div className="row">
          <div className="transactionsContainer col-8 offset-2">
            <h1>My Transactions</h1>
            {transactions['results'].map((item) => 
            (
              <TransactionItem
                id={item.id}
                utorid={item.utorid}
                amount={item.amount}
                type={item.type}
                spent={item.spent}
                remark={item.remark}
              />
            ))}
          </div>
        </div>
      )}

      {/* Transaction Creation, Redemption Processing */}
      {role === 'cashier' && (
        <div className="row">
          <div className="col-8 offset-2">
            <CreateItem />
            <h1>My Redemptions</h1>
            {redemptions.map((item) => 
            (
              <ProcessRedemption
                key={item.id}
                id={item.id}
                utorid={item.utorid}
                amount={item.amount}
                type={item.type}
                spent={item.spent}
                remark={item.remark}
              />
            ))}
          </div>
        </div>
      )}


      {/* Overview of Users Listings */}
      {(role === 'manager' || role === 'superuser') && (
        <UsersListing />
      )}

      {/* Overview of events, promotions, and user management */}
      {(role === 'manager' || role === 'superuser') && (
        <div className="row">
          <div className="col-6 offset-3 chartContainer">
            <h1>Event & Promotion Overview</h1>
            {/* <div>
              <PieChart
                title="Events"
                started={startedEvents}
                ended={endedEvents}
              />
              <PieChart
                title="Promotions"
                started={startedPromos}
                ended={endedPromos}
              />
            </div> */}
          </div>
          <AdminDash />
        </div>
      )}
    </div>
  );
}
