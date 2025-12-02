import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
import SiteRoutes from "./routes";
import NavBar from "../components/NavBar";
import { UserProvider } from "../components/UserContext";
import Footer from "../components/Footer/Footer";

// Use to store and retrieve data from dom api
// localStorage.setItem("token", "Fake123!");
// const token = localStorage.getItem("token");
// console.log(token);

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <NavBar />
        <SiteRoutes />
        <Footer />
      </BrowserRouter>
    </UserProvider>
  );
}
