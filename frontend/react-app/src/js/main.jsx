import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '../styles/globalStyles.css';
import SiteRoutes from './routes';
import NavBar from '../components/NavBar/NavBar';
import Footer from '../components/Footer/Footer';

// Use to store and retrieve data from dom api
// localStorage.setItem("token", "Fake123!");
// const token = localStorage.getItem("token");
// console.log(token);
localStorage.setItem("loggedIn", false);

ReactDOM.createRoot(document.getElementById('pageRoutes')).render(
    <BrowserRouter>
      <NavBar />
      <SiteRoutes />
      <Footer />
    </BrowserRouter>
);