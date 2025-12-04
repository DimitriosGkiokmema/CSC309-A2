import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/HomePage";
import LandingPage from "../pages/LandingPage";
import SearchPage from "../pages/SearchPage";
import Events from "../pages/Events";
import EventUpdates from "../pages/EventUpdates";
import Promotions from "../pages/Promotions";
import Management from "../pages/Management"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/profile" element={<LandingPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/events" element={<Events />} />
      <Route path="/event-updates/:eventId" element={<EventUpdates />} />
      <Route path="/promotions" element={<Promotions />} />
      <Route path="/management" element={<Management />} />
    </Routes>
  );
}