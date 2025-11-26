import { Link } from "react-router-dom"
import "./Footer.css"

export default function Footer() {
    return (
        <footer>
            <div class="row">
                <div class="col-3">
                    <h3>Varsity Mart</h3>
                    <p>UofT's very own grocer</p>

                    <div class="socials">
                        <a href="#">
                            <i class="fa-brands fa-instagram"></i>
                        </a>
                        <a href="#">
                            <i class="fa-brands fa-linkedin"></i>
                        </a>
                        <a href="#">
                            <i class="fa-brands fa-youtube"></i>
                        </a>
                    </div>
                </div>
                <div class="col-2 offset-7">
                    <h3>User</h3>
                    <a href="">Sign In</a>
                    <Link to="/registration">Register</Link>
                    <a href="">Log Out</a>
                </div>
            </div>
        </footer>
    )
}