import { callBackend } from '../js/backend.js';
import '../styles/LandingPage.css';
import TransactionItem from "../components/TransactionItem";
import CreateItem from "../components/CreateItem";
import ProcessRedemption from "../components/ProcessRedemption";

const user = (await callBackend('GET', '/users/me', {})).data;
const transactions = (await callBackend('GET', '/users/me/transactions', {})).data;
let redemptions = (await callBackend('GET', '/transactions?type=redemption', {})).data;
redemptions = redemptions['results'].filter(obj => obj.relatedId === null);

export default function LandingPage() {
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
              <p><strong>Email:</strong></p>
              <p> {user.email}</p>
            </div>
            <div>
              <p><strong>Points:</strong></p>
              <p> {user.points}</p>
            </div>
            <div>
              <p><strong>Role:</strong></p>
              <p> {user.role}</p>
            </div>
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
      {user.role === 'cashier' && (
        <div className="row">
          <div className="col-8 offset-2">
            <CreateItem />
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

      {/* Overview of events, promotions, and user management */}
      {/* TODO */}
    </div>
  );
}
