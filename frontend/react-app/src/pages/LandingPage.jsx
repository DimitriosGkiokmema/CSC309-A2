import { callBackend, check_clearance } from '../js/backend.js';
import '../styles/profilePage.css';
import TransactionItem from "../components/TransactionItem/index.jsx";

// Dummy data to represent using backend.
// TODO: Remove when backend works
let user = await callBackend('GET', '/users/me', {}, '');
user = user.data;

// const transactions = callBackend('GET', '/transactions', { name: user.utorid }, '');
const transactions = { "count": 21, "results": 
  [ { "id": 123, "utorid": "johndoe1", "amount": 80, "type": "purchase", "spent": 19.99, "promotionIds": [], "suspicious": false, "remark": "", "createdBy": "alice666" }, 
  { "id": 124, "utorid": "johndoe1", "amount": -1000, "type": "redemption", "relatedId": 666, "promotionIds": [], "redeemed": 1000, "remark": "", "createdBy": "johndoe1" }, 
  { "id": 125, "utorid": "johndoe1", "amount": -40, "type": "adjustment", "relatedId": 123, "promotionIds": [], "suspicious": false, "remark": "", "createdBy": "smithw42" }
]};

export default function LandingPage() {
  return (
    <div className="page">
      <h1>User Profile</h1>

      <div className="row">
        <div className="col-8 offset-2 profileContainer">
          <div className="col-4 profileInfo">
            <p><strong>{user.name}</strong></p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Points:</strong> {user.points}</p>
            <p><strong>Role:</strong> {user.role}</p>
          </div>
          <div className="col-4">
            <div className="qrContainer">
              <img src="../src/assets/qr_code.png" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Dropdown menu */}
      {user.role === 'regular' && (
        <div className="row">
          <div className="transactionsContainer col-8 offset-2">
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
    </div>
  );
}
