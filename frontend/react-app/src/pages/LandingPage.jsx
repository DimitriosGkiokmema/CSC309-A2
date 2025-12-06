import { useEffect, useState } from "react";
import { callBackend, resetPassword } from '../js/backend.js';
import { jsonToQRUrl } from '../js/create_qr.js';
import TransactionItem from "../components/TransactionItem";
import CreateItem from "../components/CreatePurchase/index.jsx";
import ProcessRedemption from "../components/ProcessRedemption";
import PieChart from "../components/PieChart";
import AdminDash from "../components/AdminDash";
import ImgKit from "../components/ImgKit";
import EventItem from "../components/EventItem/EventItem.jsx"
import Transfer from "../components/Transfer";
import RedeemPoints from "../components/RedeemPoints";
import { useUser } from "../components/UserContext";
import '../styles/LandingPage.css';

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
  const { role, leadingRole } = useUser();
  // console.log("User is ", role)

  // fetch user info
  async function load() {
    const me = await callBackend('GET', '/users/me', {});
    if (!me.ok) return; // user not logged in or error
    setUser(me.data);

    const bday = me.data.birthday
      ? new Date(me.data.birthday).toISOString().slice(0, 16)
      : "";

    const userInfo = {
      name: me.data.name,
      utorid: me.data.utorid,
      email: me.data.email,
      birthday: bday,
      password: me.data.password,
    };

    jsonToQRUrl({
      name: userInfo.name,
      utorid: userInfo.utorid,
      email: userInfo.email      
    }).then(url => {
      setQR(url);
    });
    console.log(userInfo.birthday)
    setFormData(userInfo);

    const tx = await callBackend('GET', '/users/me/transactions', {});
    setTransactions(tx.data);

    const r = await callBackend('GET', '/transactions?type=redemption', {});
    const filtered = r.data.results.filter(obj => obj.type === 'redemption' && !obj.processed);
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

  useEffect(() => {
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

        if (key === 'birthday') {
          updates[key] = new Date(formData[key]).toISOString();
        }
      }
    }
    console.log("Updating user stats:", updates);

    if (Object.keys(updates).length !== 0) {
      callBackend('PATCH', '/users/me', updates);
    }

    if (updates.password !== undefined) {
      resetPassword(user.utorid, updates['password']).then(res => {
        console.log(res.data);
      })
    }

    // setUser();
    jsonToQRUrl({
      name: user.name,
      utorid: user.utorid,
      email: user.email
    }).then(url => {
      setQR(url);
    });
    setUser(updates);
    setEdit(false);
    load();
  }

  if (!user || !transactions) {
    return (
    <div className="loggedOut">
      <h1>Please Log In!</h1>
    </div>
    );
  }

  // if(redemptions !== []) {
  //   console.log("redemptions: " + redemptions[0].processed)
  // }

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
              <p>{user.birthday ? user.birthday.slice(0, 10) : ''}</p>
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
              {/* DO NOT DELETE EMPTY DIVS: needed for styling */}
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
              value={formData.birthday?.slice(0, 16) || ""}
              type="datetime-local"
              onChange={handleChange}
            />

            {/* Allows users to upload an image to ImageKit */}
            <ImgKit />

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
            {transactions.length !== 0 && (
              transactions['results'].map((item) => 
              (
                <TransactionItem
                    id={item.id}
                    utorid={item.utorid}
                    awarded={item.awarded} // for events
                    amount={item.amount} // for adjustments, purchases, negative for redemption and sending transfers

                    earned={item.earned} // for purchases 
                    spent={item.spent} // for purchases
                    
                    sender={item.sender} // transfer
                    type={item.type} // transfer
                    remark={item.remark} 

                    relatedEventId={item.relatedEventId} // for events and adjustments (related tx)
                    relatedTxId={item.relatedTxId}
                />
              ))
            )}
            {transactions.length === 0 && (
              <p>No Transactions to display!</p>
            )}
          </div>

          {/* create a transfer */}
          <div>
            <Transfer />
          </div>

          {/* create a transfer */}
          <div>
            <RedeemPoints />
          </div>
        </div>
      )}

      {/* Transaction Creation, Redemption Processing */}
      {role === 'cashier' && (
        <div className="row">
          <div className="col-8 offset-2">
            <CreateItem />

            <h1>Redemption requests</h1>
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
            )
          
          )}
          </div>
        </div>
      )}

      {/* Overview of events, promotions, and user management */}
      {(role === 'manager' || role === 'superuser') && (
        <div className="row">
          <div className="col-6 offset-3 chartContainer">
            <h1>Event & Promotion Overview</h1>
            <div>
              {(startedEvents + endedEvents > 0) && (
                <PieChart
                  title="Events"
                  started={startedEvents}
                  ended={endedEvents}
                />
              )}
              {(startedPromos + endedPromos > 0) && (
                <PieChart
                  title="Promotions"
                  started={startedPromos}
                  ended={endedPromos}
                />
              )}
            </div>
          </div>
          <AdminDash />
        </div>
      )}


      {/* if this user is an event organizer, show their events */}
      {(role === 'event organizer' && user.organizer && (user.organizer.length !== 0)) && (
        <div>
          <h1>My organized events</h1>
          {user.organizer.map((event) => 
              <EventItem
                  id={event.id}
                  name={event.name}
                  location={event.location}
                  startTime={event.startTime} 
                  endTime={event.endTime}
                  capacity={event.capacity} 
                  numGuests={event.guests.length}  
                  published={event.published} 
                  organizer={true}
                  profile={true}
              />

          )}

        </div>
      )}
    </div>
  );
}
