import { Link } from "react-router-dom"
import "./Footer.css"

export default function Footer() {
    return (
        <footer>
            <div className="row">
                <div className="col-3">
                    <h3>Varsity Mart</h3>
                    <p>UofT's very own grocer</p>

                    <div className="socials">
                        <a href="#">
                            <i className="fa-brands fa-instagram"></i>
                        </a>
                        <a href="#">
                            <i className="fa-brands fa-linkedin"></i>
                        </a>
                        <a href="#">
                            <i className="fa-brands fa-youtube"></i>
                        </a>
                    </div>
                </div>
                <div className="col-2 offset-7">
                    <h3>User</h3>
                    {/* <a href="">Sign In</a> */}
                    <Link to="/registration">Register</Link>
                    
                </div>
            </div>
        </footer>
    )
}