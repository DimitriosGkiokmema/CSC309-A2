import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/HomePage";
import LandingPage from "../pages/LandingPage";
import SearchPage from "../pages/SearchPage";
import Promotions from "../pages/Promotions";
import Registration from "../pages/Registration";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/profile" element={<LandingPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/registration" element={<Registration />} />
      <Route path="/promotions" element={<Promotions />} />
    </Routes>
  );
}
