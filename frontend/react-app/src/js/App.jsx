import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
import SiteRoutes from "./routes";
import NavBar from "../components/NavBar";
import Footer from '../components/Footer/Footer';
import { UserProvider } from "../components/UserContext";

// Use to store and retrieve data from dom api
// sessionStorage.setItem("token", "Fake123!");
// const token = sessionStorage.getItem("token");
// console.log(token);

export default function App() {
  useEffect(() => {
    // run immediately
    sessionStorage.setItem("loggedIn", "false");
    sessionStorage.setItem("token", "");

    const handleBeforeUnload = () => {
        sessionStorage.setItem("loggedIn", "false");
        sessionStorage.setItem("token", "");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

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
