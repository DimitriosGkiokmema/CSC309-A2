import { useEffect, useState } from "react";
import { callBackend } from "../../js/backend"
import './style.css';

export default function AdminDash() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function load() {
      const totalUsers = (await callBackend('GET', '/users', {})).data.count;
      const verifiedCount = (await callBackend('GET', '/users?verified=true', {})).data.count;
      const unverifiedCount = totalUsers - verifiedCount;
      const regCount = (await callBackend('GET', '/users?role=regular', {})).data.count;;
      const cashierCount = (await callBackend('GET', '/users?role=cashier', {})).data.count;;
      const managerCount = (await callBackend('GET', '/users?role=manager', {})).data.count;;
      const superCount = (await callBackend('GET', '/users?role=superuser', {})).data.count;;
      const activatedCount = (await callBackend('GET', '/users?activated=true', {})).data.count;;

      setItems([
        { label: "Total Users", value: totalUsers },
        { label: "Verified", value: verifiedCount },
        { label: "Un-Verified", value: unverifiedCount },
        { label: "Activated", value: activatedCount },
        { label: "Un-Activated", value: totalUsers - activatedCount },
        { label: "Regular Users", value: regCount },
        { label: "Cashiers", value: cashierCount },
        { label: "Managers", value: managerCount },
        { label: "Superusers", value: superCount },
      ]);
    }

    load();
  }, []);

  return (
    <div className="analytics-container">
      <h1 className="analytics-title">User Overview</h1>

      <div className="analytics-grid">
        {items.map((item) => (
          <div key={item.label} className="analytics-card">
            <p className="analytics-label">{item.label}</p>
            <p className="analytics-value">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
