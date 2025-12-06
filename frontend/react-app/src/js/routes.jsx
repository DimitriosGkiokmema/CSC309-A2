import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/HomePage";
import LandingPage from "../pages/LandingPage";
import Events from "../pages/Events";
import EventUpdates from "../pages/EventUpdates";
import Promotions from "../pages/Promotions";
import Management from "../pages/Management";
import Transactions from "../pages/Transactions";
import TransactionUpdates from "../pages/TransactionUpdates";
import CreateEvent from "../components/CreateEvent";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/profile" element={<LandingPage />} />
      <Route path="/events" element={<Events />} />
      <Route path="/event-updates/:eventId" element={<EventUpdates />} />
      <Route path="/event-new" element={<CreateEvent />} />
      <Route path="/promotions" element={<Promotions />} />
      <Route path="/management" element={<Management />} />
      <Route path="/transactions" element={<Transactions />} />
      <Route path="/transaction-updates/:txId" element={<TransactionUpdates />} />
    </Routes>
  );
}